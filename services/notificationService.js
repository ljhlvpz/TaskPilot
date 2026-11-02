import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "task-reminders";
const OFFSETS = [
  { minutes: 180, label: "3 hours" },
  { minutes: 60, label: "1 hour" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 0, label: "now" },
];
const DAY_SUMMARY_HORIZON = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initializeNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Task Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#456B4A",
      sound: "default",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function getTaskDueDateTime(dueDate, dueTime) {
  if (!dueDate || !dueTime) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dueDate));
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(
    String(dueTime).replace(/[\u202f\u00a0]/g, " ").trim()
  );
  if (!dateMatch || !timeMatch) return null;
  const [year, month, day] = dateMatch.slice(1).map(Number);
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const period = timeMatch[3]?.toUpperCase();
  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (period) hour = (hour % 12) + (period === "PM" ? 12 : 0);
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
      date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}

function taskKey(task) {
  return String(task.id || task.taskId || "");
}

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function scheduleAt(content, date) {
  return Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

export async function cancelTaskReminder(taskId, userId) {
  if (!taskId || !userId) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matching = scheduled.filter((item) =>
    String(item.content.data?.taskId) === String(taskId) &&
    item.content.data?.userId === userId &&
    item.content.data?.type === "task-reminder"
  );
  await Promise.all(matching.map((item) =>
    Notifications.cancelScheduledNotificationAsync(item.identifier)
  ));
}

export async function scheduleTaskReminder(userId, taskId, task) {
  if (!userId || !taskId) throw new Error("User ID and task ID are required.");
  await cancelTaskReminder(taskId, userId);
  if (task.completed || !task.dueDate || !task.dueTime) return [];
  const dueAt = getTaskDueDateTime(task.dueDate, task.dueTime);
  if (!dueAt || dueAt.getTime() <= Date.now()) return [];
  if (!(await initializeNotifications())) return [];

  const ids = [];
  for (const { minutes, label } of OFFSETS) {
    const when = new Date(dueAt.getTime() - minutes * 60000);
    if (when.getTime() <= Date.now()) continue;
    const title = minutes === 0 ? "TaskPilot: Task due now 🔔" : "TaskPilot Reminder 🔔";
    const body = minutes === 0
      ? `It's time for "${task.title}".`
      : `"${task.title}" starts in ${label}.`;
    const id = await scheduleAt({
      title, body,
      data: { taskId: String(taskId), userId, type: "task-reminder", minutesBefore: minutes },
    }, when);
    ids.push(id);
  }
  return ids;
}

// Refreshes the next seven local midnight summaries using the latest known tasks.
// This runs while TaskPilot is open; it is not a remote background scheduler.
export async function scheduleDailySummaries(userId, tasks = []) {
  if (!userId) return [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => item.content.data?.type === "daily-summary" &&
      item.content.data?.userId === userId)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  if (!(await initializeNotifications())) return [];
  const ids = [];
  const now = new Date();
  for (let offset = 0; offset <= DAY_SUMMARY_HORIZON; offset++) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (midnight.getTime() <= now.getTime()) continue;
    const dateKey = localDateKey(midnight);
    const todayTasks = tasks.filter((task) =>
      task.dueDate === dateKey && !task.completed);
    const names = todayTasks.slice(0, 3).map((task) => task.title).join(", ");
    const extra = todayTasks.length > 3 ? ` and ${todayTasks.length - 3} more` : "";
    const body = todayTasks.length
      ? `You have ${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} today: ${names}${extra}.`
      : "You have no pending tasks scheduled for today.";
    ids.push(await scheduleAt({
      title: "TaskPilot: Today's Schedule 📅",
      body,
      data: { userId, type: "daily-summary", date: dateKey },
    }, midnight));
  }
  return ids;
}

// Reconciles this device's reminders with the latest Firestore task snapshot.
// Call from a single authenticated task listener, not from every screen.
let syncQueue = Promise.resolve();
export function syncTaskNotifications(userId, tasks = []) {
  const run = async () => {
    if (!userId) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const active = new Map(tasks.filter((t) => t.id).map((t) => [String(t.id), t]));
    const stale = scheduled.filter((item) => {
      const data = item.content.data;
      if (data?.userId !== userId || data?.type !== "task-reminder") return false;
      const task = active.get(String(data.taskId));
      return !task || task.completed || !getTaskDueDateTime(task.dueDate, task.dueTime);
    });
    await Promise.all(stale.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)));
    // Recreate each task's schedule so edits and completions are reflected.
    for (const task of tasks) {
      if (task.id) await scheduleTaskReminder(userId, taskKey(task), task);
    }
    await scheduleDailySummaries(userId, tasks);
  };
  syncQueue = syncQueue.catch(() => {}).then(run);
  return syncQueue;
}

export async function testImmediateNotification() {
  if (!(await initializeNotifications())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "TaskPilot Test 🔔",
      body: "Notifications are working!",
      sound: "default",
      data: { type: "notification-test" },
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}
