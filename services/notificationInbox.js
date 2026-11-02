import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const keyFor = (uid) => `taskpilot:notification-inbox:${uid}`;
const TYPES = ["task-reminder", "daily-summary"];
const MAX_ITEMS = 200;
let queue = Promise.resolve();

export async function readNotificationInbox(uid) {
  if (!uid) return [];
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(keyFor(uid))) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Could not read notification inbox:", error);
    return [];
  }
}

export function saveReceivedNotification(uid, notification) {
  const work = async () => {
    const request = notification?.request;
    const content = request?.content;
    const data = content?.data || {};
    if (!uid || data.userId !== uid || !TYPES.includes(data.type)) return;
    const id = String(request.identifier);
    const items = await readNotificationInbox(uid);
    if (items.some((item) => item.id === id)) return;
    const next = [{
      id, title: content.title || "TaskPilot Reminder",
      body: content.body || "", taskId: data.taskId || null,
      type: data.type, receivedAt: Date.now(), read: false,
    }, ...items].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(keyFor(uid), JSON.stringify(next));
  };
  queue = queue.catch(() => {}).then(work);
  return queue;
}

export async function capturePresentedNotifications(uid) {
  if (!uid) return;
  const presented = await Notifications.getPresentedNotificationsAsync();
  for (const notification of presented) {
    await saveReceivedNotification(uid, notification);
  }
}

export async function markInboxRead(uid, id = null) {
  if (!uid) return;
  queue = queue.catch(() => {}).then(async () => {
    const items = await readNotificationInbox(uid);
    const next = items.map((item) =>
      id === null || item.id === id ? { ...item, read: true } : item
    );
    await AsyncStorage.setItem(keyFor(uid), JSON.stringify(next));
  });
  return queue;
}
