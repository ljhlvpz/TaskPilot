// Place this file at D:\\TaskPilot\\services\\aiService.js
// Android emulator -> development server on the host computer.
// For a real APK, use an HTTPS backend URL (never embed the Gemini API key).
const AI_BACKEND_URL = "http://10.0.2.2:8787/ai/chat";

export async function askTaskPilotAI({ user, message, tasks = [] }) {
  if (!user?.getIdToken) throw new Error("Sign in to use AI");
  const token = await user.getIdToken();
  const minimalTasks = tasks.slice(0, 40).map((task) => ({
    title: String(task.title || "").slice(0, 120),
    dueDate: task.dueDate || null,
    dueTime: task.dueTime || null,
    priority: task.priority || null,
    completed: !!task.completed,
  }));
  const response = await fetch(AI_BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, tasks: minimalTasks }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  if (typeof result.reply !== "string") throw new Error("Invalid AI response");
  return result.reply;
}
