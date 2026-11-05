import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { auth } from "../firebase/firebaseConfig";
import { predictTaskPriority } from "./priorityService";

const CHANNEL_ID = "task-reminders";

const OFFSETS = [
  { minutes: 180, label: "3 hours" },
  { minutes: 60, label: "1 hour" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 0, label: "now" },
];

const DAY_SUMMARY_HORIZON = 7;
const OWNED_TYPES = new Set(["task-reminder", "daily-summary"]);
let notificationGeneration = 0;
let syncQueue = Promise.resolve();
const isCurrentAccount = (uid, generation) =>
  Boolean(uid && auth.currentUser?.uid === uid && generation === notificationGeneration);

// Remove only TaskPilot's account-scoped notifications, not other apps' alerts.
async function removeAccountNotifications(keepUid = null) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    const data = item.content?.data || {};
    if (OWNED_TYPES.has(data.type) && data.userId && data.userId !== keepUid) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }
  const presented = await Notifications.getPresentedNotificationsAsync();
  for (const item of presented) {
    const data = item.request?.content?.data || {};
    if (OWNED_TYPES.has(data.type) && data.userId && data.userId !== keepUid) {
      await Notifications.dismissNotificationAsync(item.request.identifier);
    }
  }
}

// Called BEFORE Firebase signOut. Invalidate queued work, wait for in-flight work,
// then remove all account-scoped reminders and summaries from this device.
export async function clearNotificationsForLogout() {
  notificationGeneration += 1;
  await syncQueue.catch(() => {});
  await removeAccountNotifications(null);
}


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

  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function getTaskDueDateTime(dueDate, dueTime) {
  if (!dueDate || !dueTime) return null;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(dueDate)
  );

  // Supports "15:00", "3:00 PM", and "15:00:00".
  const timeMatch = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(
    String(dueTime)
      .replace(/[\u202f\u00a0]/g, " ")
      .trim()
  );

  if (!dateMatch || !timeMatch) return null;

  const [year, month, day] = dateMatch.slice(1).map(Number);

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const period = timeMatch[3]?.toUpperCase();

  if (
    minute > 59 ||
    (period ? hour < 1 || hour > 12 : hour > 23)
  ) {
    return null;
  }

  if (period) {
    hour = (hour % 12) + (period === "PM" ? 12 : 0);
  }

  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

function taskKey(task) {
  return String(task.id || task.taskId || "");
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Check whether a task has the inputs needed by the ML model.
function hasMLInputs(task) {
  const importance = Number(task?.importance);
  const duration = Number(task?.estimatedMinutes);

  return (
    task?.importance != null &&
    task?.estimatedMinutes != null &&
    Number.isInteger(importance) &&
    importance >= 1 &&
    importance <= 5 &&
    Number.isFinite(duration) &&
    duration > 0 &&
    Boolean(task?.dueDate) &&
    Boolean(getTaskDueDateTime(task.dueDate, task.dueTime))
  );
}

// Run the trained model locally when scheduling reminders.
// Older tasks without ML inputs continue using normal notifications.
function getAIPriority(task) {
  if (!hasMLInputs(task)) {
    return null;
  }

  try {
    const prediction = predictTaskPriority({
      dueDate: task.dueDate,
      importance: Number(task.importance),
      estimatedMinutes: Number(task.estimatedMinutes),
      completed: Boolean(task.completed),
    });

    const priority = String(prediction?.priority || "");

    if (["High", "Medium", "Low"].includes(priority)) {
      return priority;
    }

    return null;
  } catch (error) {
    console.warn(
      "TaskPilot ML notification prediction failed:",
      error
    );

    return null;
  }
}

async function scheduleAt(content, date, generation = notificationGeneration) {
  const uid = content?.data?.userId;
  if (!isCurrentAccount(uid, generation)) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      sound: "default",
      ...(Platform.OS === "android"
        ? { channelId: CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === "android"
        ? { channelId: CHANNEL_ID }
        : {}),
    },
  });
  // If logout occurred while Android was scheduling, immediately undo the new entry.
  if (!isCurrentAccount(uid, generation)) {
    await Notifications.cancelScheduledNotificationAsync(id);
    return null;
  }
  return id;
}

export async function cancelTaskReminder(taskId, userId) {
  if (!taskId || !userId) return;

  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter((item) => {
    const data = item.content.data;

    return (
      String(data?.taskId) === String(taskId) &&
      data?.userId === userId &&
      data?.type === "task-reminder"
    );
  });

  await Promise.all(
    matching.map((item) =>
      Notifications.cancelScheduledNotificationAsync(
        item.identifier
      )
    )
  );
}

export async function scheduleTaskReminder(
  userId,
  taskId,
  task,
  generation = notificationGeneration
) {
  if (!isCurrentAccount(userId, generation)) return [];
  if (!userId || !taskId) {
    throw new Error("User ID and task ID are required.");
  }

  await cancelTaskReminder(taskId, userId);
  if (!isCurrentAccount(userId, generation)) return [];

  if (
    task.completed ||
    !task.dueDate ||
    !task.dueTime
  ) {
    return [];
  }

  const dueAt = getTaskDueDateTime(
    task.dueDate,
    task.dueTime
  );

  if (!dueAt || dueAt.getTime() <= Date.now()) {
    return [];
  }

  if (!(await initializeNotifications()) || !isCurrentAccount(userId, generation)) {
    return [];
  }

  // The ML prediction is computed once while scheduling.
  const aiPriority = getAIPriority(task);

  const ids = [];

  for (const { minutes, label } of OFFSETS) {
    if (!isCurrentAccount(userId, generation)) break;
    const when = new Date(
      dueAt.getTime() - minutes * 60000
    );

    if (when.getTime() <= Date.now()) {
      continue;
    }

    const title =
      minutes === 0
        ? "TaskPilot: Task due now 🔔"
        : aiPriority === "High"
        ? "TaskPilot: Priority Reminder 🔔"
        : "TaskPilot Reminder 🔔";

    let body =
      minutes === 0
        ? `It's time for "${task.title}".`
        : `"${task.title}" starts in ${label}.`;

    // Keep the wording short and useful.
    if (aiPriority && minutes !== 0) {
      body += ` AI suggests ${aiPriority.toLowerCase()} priority.`;
    }

    const id = await scheduleAt(
      {
        title,
        body,
        data: {
          taskId: String(taskId),
          userId,
          type: "task-reminder",
          minutesBefore: minutes,
          ...(aiPriority
            ? { aiPriority }
            : {}),
        },
      },
      when,
      generation
    );

    if (id) ids.push(id);
  }

  return ids;
}

// Schedule summaries for the next seven local midnights.
// These are refreshed when TaskPilot syncs its task data.
export async function scheduleDailySummaries(
  userId,
  tasks = [],
  generation = notificationGeneration
) {
  if (!isCurrentAccount(userId, generation)) return [];

  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  const oldSummaries = scheduled.filter(
    (item) =>
      item.content.data?.type === "daily-summary" &&
      item.content.data?.userId === userId
  );

  await Promise.all(
    oldSummaries.map((item) =>
      Notifications.cancelScheduledNotificationAsync(
        item.identifier
      )
    )
  );
  if (!isCurrentAccount(userId, generation)) return [];

  if (!(await initializeNotifications()) || !isCurrentAccount(userId, generation)) {
    return [];
  }

  const ids = [];
  const now = new Date();

  for (
    let offset = 0;
    offset <= DAY_SUMMARY_HORIZON;
    offset++
  ) {
    if (!isCurrentAccount(userId, generation)) break;
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset
    );

    if (midnight.getTime() <= now.getTime()) {
      continue;
    }

    const dateKey = localDateKey(midnight);

    const todayTasks = tasks.filter(
      (task) =>
        task.dueDate === dateKey &&
        !task.completed
    );

    const names = todayTasks
      .slice(0, 3)
      .map((task) => task.title)
      .join(", ");

    const extra =
      todayTasks.length > 3
        ? ` and ${todayTasks.length - 3} more`
        : "";

    const body = todayTasks.length
      ? `You have ${todayTasks.length} task${
          todayTasks.length === 1 ? "" : "s"
        } today: ${names}${extra}.`
      : "You have no pending tasks scheduled for today.";

    const id = await scheduleAt(
        {
          title: "TaskPilot: Today's Schedule 📅",
          body,
          data: {
            userId,
            type: "daily-summary",
            date: dateKey,
          },
        },
        midnight,
        generation
      );
    if (id) ids.push(id);
  }

  return ids;
}

// Reconcile local notifications with the latest Firestore tasks.
// Call this from one authenticated task listener.

export function syncTaskNotifications(
  userId,
  tasks = []
) {
  const generation = notificationGeneration;
  const run = async () => {
    if (!isCurrentAccount(userId, generation)) return;
    // Remove pending/presented reminders belonging to previously used accounts.
    await removeAccountNotifications(userId);
    if (!isCurrentAccount(userId, generation)) return;

    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    const active = new Map(
      tasks
        .filter((task) => task.id)
        .map((task) => [String(task.id), task])
    );

    const stale = scheduled.filter((item) => {
      const data = item.content.data;

      if (
        data?.userId !== userId ||
        data?.type !== "task-reminder"
      ) {
        return false;
      }

      const task = active.get(String(data.taskId));

      return (
        !task ||
        task.completed ||
        !getTaskDueDateTime(
          task.dueDate,
          task.dueTime
        )
      );
    });

    await Promise.all(
      stale.map((item) =>
        Notifications.cancelScheduledNotificationAsync(
          item.identifier
        )
      )
    );

    // Recreate each task's reminders so edits are reflected.
    for (const task of tasks) {
      if (!isCurrentAccount(userId, generation)) return;
      if (task.id) {
        await scheduleTaskReminder(userId, taskKey(task), task, generation);
      }
    }

    if (!isCurrentAccount(userId, generation)) return;
    await scheduleDailySummaries(userId, tasks, generation);
  };

  syncQueue = syncQueue
    .catch(() => {})
    .then(run);

  return syncQueue;
}

export async function testImmediateNotification() {
  if (!(await initializeNotifications())) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "TaskPilot Test 🔔",
      body: "Notifications are working!",
      sound: "default",
      data: {
        type: "notification-test",
      },
      ...(Platform.OS === "android"
        ? { channelId: CHANNEL_ID }
        : {}),
    },
    trigger: null,
  });
}
