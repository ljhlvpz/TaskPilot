import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_MINUTES = 10;
const CHANNEL_ID = "task-reminders";

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

// Accepts both 15:30 (AI Assistant) and 3:30 PM (manual entry).
export function getTaskDueDateTime(dueDate, dueTime) {
  if (!dueDate || !dueTime) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dueDate));
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(
    String(dueTime).replace(/[\u202f\u00a0]/g, " ").trim()
  );
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
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

export async function cancelTaskReminder(taskId, userId) {
  if (!taskId || !userId) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matching = scheduled.filter((item) =>
    item.content.data?.taskId === taskId && item.content.data?.userId === userId
  );
  await Promise.all(matching.map((item) =>
    Notifications.cancelScheduledNotificationAsync(item.identifier)
  ));
}

export async function scheduleTaskReminder(userId, taskId, task) {
  if (!userId || !taskId) throw new Error("User ID and task ID are required.");
  await cancelTaskReminder(taskId, userId);
  if (task.completed || !task.dueDate || !task.dueTime) return null;
  const dueAt = getTaskDueDateTime(task.dueDate, task.dueTime);
  if (!dueAt) {
    console.warn("Invalid task reminder date/time:", task.dueDate, task.dueTime);
    return null;
  }
  const reminderAt = new Date(dueAt.getTime() - REMINDER_MINUTES * 60 * 1000);
  if (reminderAt.getTime() <= Date.now()) return null;
  if (!(await initializeNotifications())) return null;
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "TaskPilot Reminder 🔔",
      body: `"${task.title}" is due in 10 minutes.`,
      sound: "default",
      data: { taskId, userId, type: "task-reminder" },
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderAt,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
    },
  });
  console.log("🔔 Scheduled reminder:", task.title, reminderAt.toString(), notificationId);
  return notificationId;
}

export async function testImmediateNotification() {
  if (!(await initializeNotifications())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: "TaskPilot Test 🔔", body: "Notifications are working!", sound: "default" },
    trigger: null,
  });
}
