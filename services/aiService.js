import { httpsCallable } from "firebase/functions";

import { functions } from "../firebase/firebaseConfig";

const askTaskPilotFunction = httpsCallable(
    functions,
    "askTaskPilot"
);

/**
 * Sends the user's question and task information
 * to the secure TaskPilot AI backend.
 */
export const askTaskPilot = async ({
    message,
    tasks = [],
}) => {
    if (!message?.trim()) {
        throw new Error("A message is required.");
    }

    try {
        const response =
            await askTaskPilotFunction({
                message: message.trim(),

                tasks: tasks.map((task) => ({
                    id: task.id,
                    title: task.title || "",
                    description:
                        task.description || "",
                    category:
                        task.category || "Personal",
                    priority:
                        task.priority || "medium",
                    dueDate:
                        task.dueDate || null,
                    dueTime:
                        task.dueTime || null,
                    completed:
                        Boolean(task.completed),
                })),
            });

        if (!response.data?.reply) {
            throw new Error(
                "TaskPilot AI returned an empty response."
            );
        }

        return response.data.reply;
    } catch (error) {
        console.error(
            "TaskPilot AI service error:",
            error
        );

        throw error;
    }
};