
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter, useRootNavigationState } from "expo-router";
import { auth } from "../firebase/firebaseConfig";

export default function NotificationNavigation() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const handledResponse = useRef(null);

  const navigationReady = Boolean(navigationState?.key);

  useEffect(() => {
    if (!navigationReady) return;

    function openNotification(response) {
      if (!response) return;

      const notification = response.notification;
      const data = notification?.request?.content?.data || {};

      // Avoid processing the same tap twice.
      const responseKey = [
        notification?.request?.identifier,
        response.actionIdentifier,
      ].join(":");

      if (handledResponse.current === responseKey) return;

      // Only navigate to a task for task-specific reminders.
      if (data.type !== "task-reminder" || !data.taskId) {
        return;
      }

      const currentUser = auth.currentUser;

      // Never open another user's task.
      if (!currentUser || data.userId !== currentUser.uid) {
        return;
      }

      handledResponse.current = responseKey;

      router.push({
        pathname: "/task/[id]",
        params: { id: String(data.taskId) },
      });
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        openNotification
      );

    // Handles tapping a notification that launched the app.
    Notifications.getLastNotificationResponseAsync()
      .then(openNotification)
      .catch((error) => {
        console.error("Notification navigation error:", error);
      });

    return () => subscription.remove();
  }, [navigationReady, router]);

  return null;
}
