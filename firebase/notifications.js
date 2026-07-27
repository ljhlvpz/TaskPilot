import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const TASK_REMINDER_CHANNEL = "task-reminders";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const requestNotificationPermission = async () => {
    try {
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync(
                TASK_REMINDER_CHANNEL,
                {
                    name: "Task Reminders",
                    importance:
                        Notifications.AndroidImportance.HIGH,
                    sound: "default",
                    vibrationPattern: [0, 250, 250, 250],
                }
            );
        }

        const currentPermission =
            await Notifications.getPermissionsAsync();

        if (currentPermission.granted) {
            return true;
        }

        const requestedPermission =
            await Notifications.requestPermissionsAsync();

        return requestedPermission.granted;
    } catch (error) {
        console.error(
            "Notification permission error:",
            error
        );

        return false;
    }
};

export const scheduleTaskNotification = async ({
    taskId,
    title,
    reminderDate,
}) => {
    if (!(reminderDate instanceof Date)) {
        console.warn("Invalid notification date.");
        return null;
    }

    if (reminderDate.getTime() <= Date.now()) {
        console.warn(
            "Notification date must be in the future."
        );
        return null;
    }

    try {
        const notificationId =
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "TaskPilot Reminder",
                    body: title
                        ? `${title} is due soon.`
                        : "You have an upcoming task.",
                    sound: "default",
                    data: {
                        taskId: taskId || null,
                    },
                },
                trigger: {
                    type:
                        Notifications
                            .SchedulableTriggerInputTypes.DATE,
                    date: reminderDate,
                    channelId:
                        Platform.OS === "android"
                            ? TASK_REMINDER_CHANNEL
                            : undefined,
                },
            });

        return notificationId;
    } catch (error) {
        console.error(
            "Schedule notification error:",
            error
        );

        return null;
    }
};

export const cancelTaskNotification = async (
    notificationId
) => {
    if (!notificationId) {
        return;
    }

    try {
        await Notifications.cancelScheduledNotificationAsync(
            notificationId
        );
    } catch (error) {
        console.error(
            "Cancel notification error:",
            error
        );
    }
};

export const getScheduledTaskNotifications =
    async () => {
        try {
            return await Notifications.getAllScheduledNotificationsAsync();
        } catch (error) {
            console.error(
                "Read scheduled notifications error:",
                error
            );

            return [];
        }
    };