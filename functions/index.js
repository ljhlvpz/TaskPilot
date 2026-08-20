const {
    onCall,
    HttpsError,
} = require("firebase-functions/v2/https");

const {
    defineSecret,
} = require("firebase-functions/params");

const {
    setGlobalOptions,
} = require("firebase-functions");

const {
    initializeApp,
} = require("firebase-admin/app");

const {
    getFirestore,
} = require("firebase-admin/firestore");

initializeApp();

setGlobalOptions({
    maxInstances: 10,
});

const geminiApiKey =
    defineSecret("GEMINI_API_KEY");

exports.askTaskPilot = onCall(
    {
        secrets: [geminiApiKey],
        region: "us-central1",
    },
    async (request) => {
        // Require a logged-in Firebase user.
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be signed in to use TaskPilot AI."
            );
        }

        const message =
            request.data?.message?.trim();

        const currentDate =
            request.data?.currentDate || "";

        if (!message) {
            throw new HttpsError(
                "invalid-argument",
                "A message is required."
            );
        }

        if (message.length > 500) {
            throw new HttpsError(
                "invalid-argument",
                "Your message is too long."
            );
        }

        try {
            const uid = request.auth.uid;
            const db = getFirestore();

            // Read only the authenticated user's tasks.
            const taskSnapshot = await db
                .collection("tasks")
                .where("userId", "==", uid)
                .limit(100)
                .get();

            const tasks = taskSnapshot.docs.map(
                (document) => {
                    const task = document.data();

                    return {
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
                    };
                }
            );

            const taskContext =
                tasks.length > 0
                    ? tasks
                          .map((task, index) => {
                              return [
                                  `${index + 1}. ${task.title}`,
                                  `Priority: ${task.priority}`,
                                  `Category: ${task.category}`,
                                  `Due date: ${
                                      task.dueDate ||
                                      "None"
                                  }`,
                                  `Due time: ${
                                      task.dueTime ||
                                      "None"
                                  }`,
                                  `Completed: ${
                                      task.completed
                                          ? "Yes"
                                          : "No"
                                  }`,
                                  task.description
                                      ? `Description: ${task.description}`
                                      : null,
                              ]
                                  .filter(Boolean)
                                  .join("\n");
                          })
                          .join("\n\n")
                    : "The user currently has no saved tasks.";

            const prompt = `
You are TaskPilot AI, a friendly productivity assistant inside a personal task and time-management application.

Your role is limited to:
- helping users understand their tasks,
- recommending priorities,
- helping organize their schedule,
- giving simple productivity suggestions,
- conversational assistance related to task and time management.

Do not claim that you completed, edited, deleted, or created a task unless the application explicitly confirms that action.

Keep responses concise, practical, and easy to understand.

Current local date:
${currentDate || "Not provided"}

The authenticated user's TaskPilot tasks:

${taskContext}

User message:
${message}

Respond naturally as TaskPilot AI.
`;

            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            geminiApiKey.value(),
                    },

                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt,
                                    },
                                ],
                            },
                        ],
                    }),
                }
            );

            if (!response.ok) {
                const errorText =
                    await response.text();

                console.error(
                    "Gemini API error:",
                    response.status,
                    errorText
                );

                throw new HttpsError(
                    "internal",
                    "TaskPilot AI is temporarily unavailable."
                );
            }

            const result =
                await response.json();

            const reply =
                result?.candidates?.[0]
                    ?.content?.parts?.[0]
                    ?.text?.trim();

            if (!reply) {
                throw new HttpsError(
                    "internal",
                    "TaskPilot AI returned an empty response."
                );
            }

            return {
                reply,
            };
        } catch (error) {
            console.error(
                "askTaskPilot error:",
                error
            );

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError(
                "internal",
                "TaskPilot AI could not process your request."
            );
        }
    }
);