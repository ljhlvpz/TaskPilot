import React from "react";
import { useAppTheme } from "../../contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    Keyboard,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme } from "../../constants/theme";
import { scheduleTaskReminder, cancelTaskReminder } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import {
    addUserTask,
    changeTaskCompletion,
    editUserTask,
    listenToUserTasks,
    removeUserTask,
} from "../../services/taskService";

import { predictTaskPriority } from "../../services/priorityService";

import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from "expo-speech-recognition";

const QUICK_ACTIONS = [
    {
        id: "plan",
        label: "Plan my day",
        icon: "calendar-outline",
        prompt: "Help me plan my day.",
    },
    {
        id: "priority",
        label: "Prioritize tasks",
        icon: "flag-outline",
        prompt: "Which tasks should I prioritize?",
    },
    {
        id: "summary",
        label: "Today's summary",
        icon: "list-outline",
        prompt: "Give me a summary of my tasks today.",
    },
    {
        id: "tips",
        label: "Productivity tips",
        icon: "bulb-outline",
        prompt: "Give me a productivity tip.",
    },
];

const INITIAL_MESSAGES = [
    {
        id: "welcome-message",
        role: "assistant",
        text:
            "Hi! I'm TaskPilot AI. I can help organize your tasks, plan your day, and recommend what to work on first.",
    },
];

const SAMPLE_RESPONSES = {
    "Help me plan my day.":
        "Let's create a simple plan. Start with your highest-priority task, complete one shorter task afterward, and leave flexible time for unexpected work.",

    "Which tasks should I prioritize?":
        "I'll prioritize tasks based on urgency, due date, and importance. Once we connect your saved tasks, I can provide personalized recommendations.",

    "Give me a summary of my tasks today.":
        "Your task data will appear here after we connect TaskPilot AI to Firestore. I'll summarize due tasks, completed work, and upcoming deadlines.",

    "Give me a productivity tip.":
        "Try working on one important task for 25 minutes without switching apps. Afterward, take a short break before continuing.",
};

const createMessageId = () => {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
};

const getTodayDate = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};
const formatTaskLine = (task) => {
    const priority =
        task.priority?.toUpperCase() || "MEDIUM";

    const time = task.dueTime
        ? ` at ${task.dueTime}`
        : "";

    return `• ${task.title}${time} — ${priority}`;
};
const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return getDateKey(tomorrow);
};

const sortTasksByPriority = (tasks) => {
    const priorityOrder = {
        high: 0,
        medium: 1,
        low: 2,
    };

    return [...tasks].sort((a, b) => {
        return (
            (priorityOrder[a.priority] ?? 3) -
            (priorityOrder[b.priority] ?? 3)
        );
    });
};
// Rank tasks using the trained offline model when sufficient inputs exist.
// Older tasks may lack importance or duration; preserve their saved priority instead.
const rankTasksWithOfflineML = (items) => {
    const priorityRank = { high: 3, medium: 2, low: 1 };
    return items.map((task) => {
        let prediction = null;
        try {
            const hasInputs = task.dueDate &&
                task.importance !== null && task.importance !== undefined &&
                task.estimatedMinutes !== null && task.estimatedMinutes !== undefined;
            if (hasInputs) prediction = predictTaskPriority(task);
        } catch (error) {
            console.warn("Offline priority prediction failed:", error);
        }
        const savedPriority = String(task.priority || "medium").toLowerCase();
        const recommendedPriority = prediction?.priority?.toLowerCase() || savedPriority;
        return { task, prediction, recommendedPriority };
    }).sort((a, b) => {
        const difference = (priorityRank[b.recommendedPriority] || 0) -
            (priorityRank[a.recommendedPriority] || 0);
        if (difference) return difference;
        const aDate = a.task.dueDate || "9999-12-31";
        const bDate = b.task.dueDate || "9999-12-31";
        return aDate.localeCompare(bDate);
    });
};

const formatOfflineMLTask = (item, index) => {
    const { task, prediction, recommendedPriority } = item;
    const date = task.dueDate ? ` — due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ""}` : "";
    const source = prediction
        ? `AI suggests: ${recommendedPriority.toUpperCase()}`
        : `Priority: ${recommendedPriority.toUpperCase()}`;
    return `${index + 1}. ${task.title}${date}\n   ${source}`;
};

const getNextWeekdayDate = (weekdayName, forceNextWeek = false) => {
    const weekdays = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };

    const targetDay =
        weekdays[weekdayName.toLowerCase()];

    if (targetDay === undefined) {
        return null;
    }

    const today = new Date();
    const currentDay = today.getDay();

    let daysAhead =
        (targetDay - currentDay + 7) % 7;

    if (daysAhead === 0 || forceNextWeek) {
        daysAhead += 7;
    }

    const targetDate = new Date(today);
    targetDate.setDate(
        today.getDate() + daysAhead
    );

    return getDateKey(targetDate);
};
const getExactDate = (monthName, dayNumber) => {
    const months = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11,
    };

    const month =
        months[monthName.toLowerCase()];

    const day = Number(dayNumber);

    if (
        month === undefined ||
        !Number.isInteger(day) ||
        day < 1 ||
        day > 31
    ) {
        return null;
    }

    const today = new Date();

    let year = today.getFullYear();

    let targetDate = new Date(
        year,
        month,
        day
    );

    // If that date already passed this year,
    // interpret it as next year.
    if (targetDate < new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    )) {
        year += 1;

        targetDate = new Date(
            year,
            month,
            day
        );
    }

    // Prevent impossible dates such as February 31.
    if (
        targetDate.getFullYear() !== year ||
        targetDate.getMonth() !== month ||
        targetDate.getDate() !== day
    ) {
        return null;
    }

    return getDateKey(targetDate);
};
const parseCreateTaskCommand = (message) => {
    const original = message.trim();
    const lower = original.toLowerCase();

    const startsWithCreateCommand =
        lower.startsWith("add ") ||
        lower.startsWith("create ") ||
        lower.startsWith("make ");

    if (!startsWithCreateCommand) {
        return null;
    }

    let workingText = original.replace(
        /^(add|create|make)\s+/i,
        ""
    );

    // Remove optional words such as "a task" or "task".
    workingText = workingText.replace(
        /^(a\s+)?task\s+/i,
        ""
    );

    let dueDate = null;
    let dueTime = null;
    let priority = "medium";

    // TODAY
    if (/\btoday\b/i.test(workingText)) {
        dueDate = getTodayDate();

        workingText = workingText.replace(
            /\btoday\b/i,
            ""
        );
    }

    // TOMORROW
    if (/\btomorrow\b/i.test(workingText)) {
        dueDate = getTomorrowDate();

        workingText = workingText.replace(
            /\btomorrow\b/i,
            ""
        );
    }

    // WEEKDAY
    const weekdayMatch = workingText.match(
        /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i
    );

    if (weekdayMatch) {
        const hasNext =
            Boolean(weekdayMatch[1]);

        const weekday =
            weekdayMatch[2];

        dueDate = getNextWeekdayDate(
            weekday,
            hasNext
        );

        workingText = workingText.replace(
            weekdayMatch[0],
            ""
        );
    }
    // EXACT DATE
    const exactDateMatch = workingText.match(
        /\b(?:on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
    );

    if (exactDateMatch) {
        const parsedDate = getExactDate(
            exactDateMatch[1],
            exactDateMatch[2]
        );

        if (parsedDate) {
            dueDate = parsedDate;

            workingText = workingText.replace(
                exactDateMatch[0],
                ""
            );
        }
    }

    // PRIORITY
    const priorityMatch = workingText.match(
        /\b(high|medium|low)(?:\s+priority)?\b/i
    );

    if (priorityMatch) {
        priority = priorityMatch[1].toLowerCase();

        workingText = workingText.replace(
            priorityMatch[0],
            ""
        );
    }

    // TIME: "at 7 PM", "at 7:30 PM", "at 14:00"
    const timeMatch = workingText.match(
        /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
    );

    if (timeMatch) {
        let hour = Number(timeMatch[1]);
        const minute = Number(
            timeMatch[2] || "0"
        );

        const meridiem =
            timeMatch[3]?.toLowerCase();

        if (
            hour <= 23 &&
            minute <= 59
        ) {
            if (meridiem === "pm" && hour < 12) {
                hour += 12;
            }

            if (meridiem === "am" && hour === 12) {
                hour = 0;
            }

            dueTime =
                `${String(hour).padStart(2, "0")}:` +
                `${String(minute).padStart(2, "0")}`;

            workingText = workingText.replace(
                timeMatch[0],
                ""
            );
        }
    }

    // Remove leftover connector words.
    workingText = workingText
        .replace(/\b(for|on)\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!workingText) {
        return null;
    }

    return {
        title: workingText,
        description: "",
        category: "Personal",
        priority,
        dueDate,
        dueTime,
    };
};

const parseCompleteTaskCommand = (message) => {
    const original = message.trim();

    const match = original.match(
        /^(?:mark\s+)?(.+?)\s+(?:as\s+)?(?:complete|completed|done)$/i
    );

    if (match) {
        const title = match[1].trim();

        if (title) {
            return title;
        }
    }

    const directMatch = original.match(
        /^(?:complete|finish)\s+(.+)$/i
    );

    if (directMatch) {
        const title = directMatch[1].trim();

        if (title) {
            return title;
        }
    }

    return null;
};
const parseDeleteTaskCommand = (message) => {
    const original = message.trim();

    const match = original.match(
        /^(?:delete|remove)\s+(?:task\s+)?(.+)$/i
    );

    if (!match) {
        return null;
    }

    const title = match[1].trim();

    return title || null;
};
const parsePriorityEditCommand = (message) => {
    const original = message.trim();

    const match = original.match(
        /^(?:change|set)\s+(.+?)\s+(?:to|as)\s+(high|medium|low)(?:\s+priority)?$/i
    );

    if (!match) {
        return null;
    }

    const title = match[1].trim();
    const priority = match[2].toLowerCase();

    if (!title) {
        return null;
    }

    return {
        title,
        updates: {
            priority,
        },
        description: `Priority → ${priority}`,
    };
};
const parseRenameTaskCommand = (message) => {
    const original = message.trim();

    const match = original.match(
        /^(?:rename|change)\s+(.+?)\s+to\s+(.+)$/i
    );

    if (!match) {
        return null;
    }

    const oldTitle = match[1].trim();
    const newTitle = match[2].trim();

    if (!oldTitle || !newTitle) {
        return null;
    }

    return {
        title: oldTitle,
        updates: {
            title: newTitle,
        },
        description: `Title → ${newTitle}`,
    };
};
const parseMoveTaskCommand = (message) => {
    const original = message.trim();

    const match = original.match(
        /^(?:move|reschedule)\s+(.+?)\s+to\s+(.+)$/i
    );

    if (!match) {
        return null;
    }

    const title = match[1].trim();
    let dateText = match[2].trim();

    if (!title || !dateText) {
        return null;
    }

    let dueDate = null;
    let dueTime = null;

    // TODAY
    if (/\btoday\b/i.test(dateText)) {
        dueDate = getTodayDate();
        dateText = dateText.replace(/\btoday\b/i, "");
    }

    // TOMORROW
    if (/\btomorrow\b/i.test(dateText)) {
        dueDate = getTomorrowDate();
        dateText = dateText.replace(/\btomorrow\b/i, "");
    }

    // WEEKDAY
    const weekdayMatch = dateText.match(
        /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i
    );

    if (weekdayMatch) {
        dueDate = getNextWeekdayDate(
            weekdayMatch[2],
            Boolean(weekdayMatch[1])
        );

        dateText = dateText.replace(
            weekdayMatch[0],
            ""
        );
    }

    // EXACT DATE
    const exactDateMatch = dateText.match(
        /\b(?:on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
    );

    if (exactDateMatch) {
        const parsedDate = getExactDate(
            exactDateMatch[1],
            exactDateMatch[2]
        );

        if (parsedDate) {
            dueDate = parsedDate;

            dateText = dateText.replace(
                exactDateMatch[0],
                ""
            );
        }
    }

    // TIME
    const timeMatch = dateText.match(
        /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
    );

    if (timeMatch) {
        let hour = Number(timeMatch[1]);
        const minute = Number(
            timeMatch[2] || "0"
        );

        const meridiem =
            timeMatch[3]?.toLowerCase();

        if (hour <= 23 && minute <= 59) {
            if (meridiem === "pm" && hour < 12) {
                hour += 12;
            }

            if (meridiem === "am" && hour === 12) {
                hour = 0;
            }

            dueTime =
                `${String(hour).padStart(2, "0")}:` +
                `${String(minute).padStart(2, "0")}`;
        }
    }

    if (!dueDate && !dueTime) {
        return null;
    }

    const updates = {};

    if (dueDate) {
        updates.dueDate = dueDate;
    }

    if (dueTime) {
        updates.dueTime = dueTime;
    }

    const descriptionParts = [];

    if (dueDate) {
        descriptionParts.push(`Date → ${dueDate}`);
    }

    if (dueTime) {
        descriptionParts.push(`Time → ${dueTime}`);
    }

    return {
        title,
        updates,
        description: descriptionParts.join(", "),
    };
};
export default function AssistantScreen() {
    

    const { colors } = useAppTheme();
    const styles = React.useMemo(() => make_styles(colors), [colors]);

    // Prevent rapid taps from starting overlapping recognition sessions.
    const voiceBusyRef = useRef(false);
    const voiceActiveRef = useRef(false);
    const voiceTransitionRef = useRef(false);
    const voiceStopRequestedRef = useRef(false);

    const endVoiceTransition = () => {
        if (voiceTransitionRef.current) {
            voiceTransitionRef.current = false;
            DeviceEventEmitter.emit("taskpilot-voice-transition", "end");
        }
    };

    const stopVoiceRecognition = async () => {
        if (voiceStopRequestedRef.current) return;
        voiceStopRequestedRef.current = true;
        try {
            // stop() allows the recognizer to deliver the final transcript.
            await ExpoSpeechRecognitionModule.stop();
        } catch (error) {
            console.warn("Unable to stop speech recognition:", error);
            voiceActiveRef.current = false;
            voiceBusyRef.current = false;
            voiceStopRequestedRef.current = false;
            setIsListening(false);
            endVoiceTransition();
        }
    };

    const startVoiceRecognition = async () => {
        if (voiceBusyRef.current || voiceActiveRef.current) return;
        voiceBusyRef.current = true;
        voiceStopRequestedRef.current = false;
        voiceTransitionRef.current = true;
        DeviceEventEmitter.emit("taskpilot-voice-transition", "begin");
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) {
                voiceBusyRef.current = false;
                endVoiceTransition();
                Alert.alert("Microphone permission", "Please allow microphone access to use voice commands.");
                return;
            }
            // Start is handled asynchronously by native recognition events.
            await ExpoSpeechRecognitionModule.start({
                lang: "en-US",
                interimResults: true,
                continuous: false,
            });
        } catch (error) {
            console.error("Unable to start speech recognition:", error);
            voiceBusyRef.current = false;
            voiceActiveRef.current = false;
            voiceStopRequestedRef.current = false;
            setIsListening(false);
            endVoiceTransition();
            Alert.alert("Microphone unavailable", "Speech recognition could not start. You can still type commands.");
        }
    };

    const toggleVoiceRecognition = () => {
        if (voiceActiveRef.current || isListening) {
            stopVoiceRecognition();
        } else if (!voiceBusyRef.current) {
            startVoiceRecognition();
        }
    };

    const listRef = useRef(null);

    const { user, authLoading } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] =
        useState(true);

    const [isListening, setIsListening] = useState(false);

    const [messages, setMessages] =
        useState(INITIAL_MESSAGES);

    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [pendingTask, setPendingTask] =
        useState(null);
    const [
        pendingCompletion,
        setPendingCompletion,
    ] = useState(null);
    const [
        pendingEdit,
        setPendingEdit,
    ] = useState(null);
    const [
        pendingDeletion,
        setPendingDeletion,
    ] = useState(null);

    useEffect(() => {
        if (authLoading) {
            return undefined;
        }

        if (!user?.uid) {
            setTasks([]);
            setTasksLoading(false);
            return undefined;
        }

        setTasksLoading(true);

        const unsubscribe = listenToUserTasks(
            user.uid,
            (receivedTasks) => {
                setTasks(receivedTasks);
                setTasksLoading(false);
            },
            (error) => {
                console.error(
                    "AI task listener error:",
                    error
                );

                setTasksLoading(false);
            }
        );

        return unsubscribe;
    }, [user?.uid, authLoading]);

    const scrollToBottom = () => {
        setTimeout(() => {
            listRef.current?.scrollToEnd({
                animated: true,
            });
        }, 100);
    };
    const generateTemporaryResponse = (message) => {
        if (tasksLoading) {
            return "I'm still loading your tasks. Please try again in a moment.";
        }

        const normalizedMessage =
            message.toLowerCase().trim();

        const today = getTodayDate();
        const tomorrow = getTomorrowDate();

        const pendingTasks = tasks.filter(
            (task) => !task.completed
        );

        const completedTasks = tasks.filter(
            (task) => task.completed
        );

        const todayTasks = pendingTasks.filter(
            (task) => task.dueDate === today
        );

        const tomorrowTasks = pendingTasks.filter(
            (task) => task.dueDate === tomorrow
        );

        const overdueTasks = pendingTasks.filter(
            (task) =>
                task.dueDate &&
                task.dueDate < today
        );

        const highPriorityTasks = pendingTasks.filter(
            (task) =>
                task.priority?.toLowerCase() === "high"
        );

        const sortedPending =
            sortTasksByPriority(pendingTasks);

        // TODAY
        if (
            normalizedMessage.includes("today") ||
            normalizedMessage.includes("today's summary")
        ) {
            if (todayTasks.length === 0) {
                return (
                    `You don't have any pending tasks due today. 🎉\n\n` +
                    `You still have ${pendingTasks.length} pending tasks overall.`
                );
            }

            const taskList = sortTasksByPriority(todayTasks)
                .map(formatTaskLine)
                .join("\n");

            return (
                `You have ${todayTasks.length} ` +
                `${todayTasks.length === 1 ? "task" : "tasks"} due today:\n\n` +
                `${taskList}`
            );
        }

        // TOMORROW
        if (
            normalizedMessage.includes("tomorrow")
        ) {
            if (tomorrowTasks.length === 0) {
                return "You don't have any pending tasks due tomorrow.";
            }

            const taskList = sortTasksByPriority(
                tomorrowTasks
            )
                .map(formatTaskLine)
                .join("\n");

            return (
                `You have ${tomorrowTasks.length} ` +
                `${tomorrowTasks.length === 1 ? "task" : "tasks"} due tomorrow:\n\n` +
                taskList
            );
        }

        // OVERDUE
        if (
            normalizedMessage.includes("overdue") ||
            normalizedMessage.includes("late")
        ) {
            if (overdueTasks.length === 0) {
                return "Good news — you don't have any overdue tasks. 🎉";
            }

            const taskList = sortTasksByPriority(
                overdueTasks
            )
                .map(formatTaskLine)
                .join("\n");

            return (
                `You currently have ${overdueTasks.length} overdue ` +
                `${overdueTasks.length === 1 ? "task" : "tasks"}:\n\n` +
                taskList
            );
        }

        // PRIORITY / WHAT SHOULD I DO FIRST — offline trained ML model.
        if (
            normalizedMessage.includes("prioritize") ||
            normalizedMessage.includes("priority") ||
            normalizedMessage.includes("do first") ||
            normalizedMessage.includes("start first") ||
            normalizedMessage.includes("what should i do")
        ) {
            if (pendingTasks.length === 0) {
                return "You have no pending tasks right now. Nice work! 🎉";
            }
            const ranked = rankTasksWithOfflineML(pendingTasks);
            const taskList = ranked.slice(0, 5).map(formatOfflineMLTask).join("\n\n");
            return `Here's what to focus on first:\n\n${taskList}\n\n✨ Priorities suggested based on your tasks.`;
        }

        // PLAN MY DAY
        if (
            normalizedMessage.includes("plan my day") ||
            normalizedMessage.includes("plan today") ||
            normalizedMessage.includes("organize my day")
        ) {
            if (todayTasks.length === 0) {
                if (pendingTasks.length === 0) {
                    return "You have no pending tasks. Enjoy the extra breathing room today! 🎉";
                }

                const suggestions = rankTasksWithOfflineML(pendingTasks)
                    .slice(0, 3)
                    .map(formatOfflineMLTask)
                    .join("\n\n");

                return (
                    `You don't have tasks due today, so you could work ahead:\n\n` +
                    suggestions
                );
            }

            const plan = rankTasksWithOfflineML(todayTasks)
                .map(formatOfflineMLTask)
                .join("\n\n");

            return (
                `Here's a simple plan for today:\n\n` +
                `${plan}\n\n` +
                `Start with the highest-priority task first.`
            );
        }

        // TASK COUNTS
        if (
            normalizedMessage.includes("how many") ||
            normalizedMessage.includes("task count") ||
            normalizedMessage.includes("tasks left")
        ) {
            return (
                `You currently have:\n\n` +
                `• ${pendingTasks.length} pending\n` +
                `• ${completedTasks.length} completed\n` +
                `• ${highPriorityTasks.length} high-priority\n` +
                `• ${overdueTasks.length} overdue`
            );
        }

        // PRODUCTIVITY TIPS
        if (
            normalizedMessage.includes("productivity") ||
            normalizedMessage.includes("tip")
        ) {
            return (
                "Try focusing on one important task for 25 minutes without switching apps. " +
                "Then take a short break before continuing."
            );
        }

        // FALLBACK
        return (
            `I can currently see ${tasks.length} tasks in your TaskPilot account: ` +
            `${pendingTasks.length} pending and ${completedTasks.length} completed.\n\n` +
            `Try asking me things like:\n` +
            `• What do I have today?\n` +
            `• What's due tomorrow?\n` +
            `• Do I have overdue tasks?\n` +
            `• What should I do first?\n` +
            `• How many tasks are left?`
        );
    };

    useSpeechRecognitionEvent("start", () => {
        voiceActiveRef.current = true;
        voiceBusyRef.current = false;
        voiceStopRequestedRef.current = false;
        setIsListening(true);
    });

    useSpeechRecognitionEvent("end", () => {
        voiceActiveRef.current = false;
        voiceBusyRef.current = false;
        voiceStopRequestedRef.current = false;
        setIsListening(false);
        endVoiceTransition();
    });

    useSpeechRecognitionEvent("error", (event) => {
        voiceActiveRef.current = false;
        voiceBusyRef.current = false;
        voiceStopRequestedRef.current = false;
        setIsListening(false);
        endVoiceTransition();
        if (event.error === "no-speech" || event.error === "aborted") return;
        console.error("Speech recognition error:", event);
        Alert.alert("Voice recognition", "Voice recognition encountered an error. Please try typing your command.");
    });

    useSpeechRecognitionEvent("result", (event) => {
        const transcript = event.results?.[0]?.transcript?.trim();
        if (transcript) setInput(transcript);
    });

    useEffect(() => {
        return () => {
            if (voiceActiveRef.current || voiceBusyRef.current) {
                try { ExpoSpeechRecognitionModule.abort(); } catch (_) { }
            }
            endVoiceTransition();
        };
    }, []);

    const sendMessage = async (customMessage) => {
        const cleanMessage = (
            customMessage ?? input
        ).trim();

        if (!cleanMessage || isTyping) {
            return;
        }

        const userMessage = {
            id: createMessageId(),
            role: "user",
            text: cleanMessage,
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            userMessage,
        ]);

        setInput("");
        setIsTyping(true);
        scrollToBottom();

        await new Promise((resolve) => {
            setTimeout(resolve, 500);
        });

        const parsedEdit =
            parsePriorityEditCommand(cleanMessage) ||
            parseRenameTaskCommand(cleanMessage) ||
            parseMoveTaskCommand(cleanMessage);

        if (parsedEdit) {
            const normalizedTitle =
                parsedEdit.title.toLowerCase();

            const matchingTasks = tasks.filter(
                (task) =>
                    task.title
                        ?.toLowerCase()
                        .includes(normalizedTitle)
            );

            if (matchingTasks.length === 0) {
                const assistantMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    text:
                        `I couldn't find a task matching "${parsedEdit.title}".`,
                };

                setMessages((currentMessages) => [
                    ...currentMessages,
                    assistantMessage,
                ]);

                setIsTyping(false);
                scrollToBottom();
                return;
            }

            if (matchingTasks.length > 1) {
                const taskList = matchingTasks
                    .slice(0, 5)
                    .map(
                        (task) =>
                            `• ${task.title}${task.dueDate
                                ? ` — ${task.dueDate}`
                                : ""
                            }`
                    )
                    .join("\n");

                const assistantMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    text:
                        `I found more than one matching task:\n\n` +
                        `${taskList}\n\n` +
                        `Please be more specific.`,
                };

                setMessages((currentMessages) => [
                    ...currentMessages,
                    assistantMessage,
                ]);

                setIsTyping(false);
                scrollToBottom();
                return;
            }

            const matchedTask = matchingTasks[0];

            setPendingEdit({
                task: matchedTask,
                updates: parsedEdit.updates,
                description: parsedEdit.description,
            });

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `I found "${matchedTask.title}".\n\n` +
                    `Change: ${parsedEdit.description}\n\n` +
                    `Please confirm before I update it.`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);

            setIsTyping(false);
            scrollToBottom();
            return;
        }
        const deletionTitle =
            parseDeleteTaskCommand(cleanMessage);

        if (deletionTitle) {
            const normalizedTitle =
                deletionTitle.toLowerCase();

            const matchingTasks = tasks.filter(
                (task) =>
                    task.title
                        ?.toLowerCase()
                        .includes(normalizedTitle)
            );

            if (matchingTasks.length === 0) {
                const assistantMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    text:
                        `I couldn't find a task matching "${deletionTitle}".`,
                };

                setMessages((currentMessages) => [
                    ...currentMessages,
                    assistantMessage,
                ]);

                setIsTyping(false);
                scrollToBottom();
                return;
            }

            if (matchingTasks.length > 1) {
                const taskList = matchingTasks
                    .slice(0, 5)
                    .map(
                        (task) =>
                            `• ${task.title}${task.dueDate
                                ? ` — ${task.dueDate}`
                                : ""
                            }`
                    )
                    .join("\n");

                const assistantMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    text:
                        `I found more than one matching task:\n\n` +
                        `${taskList}\n\n` +
                        `Please be more specific.`,
                };

                setMessages((currentMessages) => [
                    ...currentMessages,
                    assistantMessage,
                ]);

                setIsTyping(false);
                scrollToBottom();
                return;
            }

            const matchedTask = matchingTasks[0];

            setPendingDeletion(matchedTask);

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `I found "${matchedTask.title}".\n\n` +
                    `Please confirm before I delete it.`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);

            setIsTyping(false);
            scrollToBottom();
            return;
        }
        const completionTitle =
            parseCompleteTaskCommand(cleanMessage);

        if (completionTitle) {
            const normalizedTitle =
                completionTitle.toLowerCase();

            const matchingTasks = tasks.filter(
                (task) =>
                    !task.completed &&
                    task.title
                        ?.toLowerCase()
                        .includes(normalizedTitle)
            );

            if (matchingTasks.length === 0) {
                const assistantMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    text:
                        `I couldn't find a pending task matching "${completionTitle}".`,
                };

                setMessages((currentMessages) => [
                    ...currentMessages,
                    assistantMessage,
                ]);

                setIsTyping(false);
                scrollToBottom();
                return;
            }

            if (matchingTasks.length > 1) {
                const taskList = matchingTasks
                    .slice(0, 5)
                    .map(
                        (task) =>
                            `• ${task.title}${task.dueDate
                                ? ` — ${task.dueDate}`
                                : ""
                            }`
                    )
                    .join("\n");

                const assistantMessage = {
                    id: createMessageId(),
                    role: "assistant",
                    text:
                        `I found more than one matching task:\n\n` +
                        `${taskList}\n\n` +
                        `Please be more specific.`,
                };

                setMessages((currentMessages) => [
                    ...currentMessages,
                    assistantMessage,
                ]);

                setIsTyping(false);
                scrollToBottom();
                return;
            }

            const matchedTask = matchingTasks[0];

            setPendingCompletion(matchedTask);

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `I found "${matchedTask.title}".\n\n` +
                    `Please confirm before I mark it as completed.`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);

            setIsTyping(false);
            scrollToBottom();
            return;
        }

        const parsedTask =
            parseCreateTaskCommand(cleanMessage);

        if (/^(add|create|make)\s+(?:(?:a\s+)?task\b)/i.test(cleanMessage) && !parsedTask) {
            setMessages((currentMessages) => [
                ...currentMessages,
                {
                    id: createMessageId(),
                    role: "assistant",
                    text: 'What should I name the task? Try "Add task Study math tomorrow at 3 PM".',
                },
            ]);
            setIsTyping(false);
            scrollToBottom();
            return;
        }

        if (parsedTask) {
            setPendingTask(parsedTask);

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `I understood that as a new task:\n\n` +
                    `Title: ${parsedTask.title}\n` +
                    `Date: ${parsedTask.dueDate || "Not set"}\n` +
                    `Time: ${parsedTask.dueTime || "Not set"}\n` +
                    `Priority: ${parsedTask.priority}\n\n` +
                    `Please confirm before I create it.`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);

            setIsTyping(false);
            scrollToBottom();
            return;
        }

        // Offline-only: no cloud API account, key, or network request required.
        const reply = generateTemporaryResponse(cleanMessage);

        const assistantMessage = {
            id: createMessageId(),
            role: "assistant",
            text: reply,
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            assistantMessage,
        ]);

        setIsTyping(false);
        scrollToBottom();
    };
    const confirmPendingTask = async () => {
        if (!pendingTask || !user?.uid) {
            return;
        }

        try {
            setIsTyping(true);

            const createdResult = await addUserTask(
                user.uid,
                pendingTask
            );
            const createdId = typeof createdResult === "string"
                ? createdResult
                : createdResult?.id;
            if (createdId) {
                try {
                    await scheduleTaskReminder(user.uid, createdId, pendingTask);
                } catch (reminderError) {
                    console.warn("Assistant reminder scheduling failed:", reminderError);
                }
            }

            const createdTask = pendingTask;

            setPendingTask(null);

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `Task created successfully! ✅\n\n` +
                    `• ${createdTask.title}\n` +
                    `• Date: ${createdTask.dueDate || "Not set"}\n` +
                    `• Time: ${createdTask.dueTime || "Not set"}\n` +
                    `• Priority: ${createdTask.priority}`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);
        } catch (error) {
            console.error(
                "AI task creation error:",
                error
            );

            const errorMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    "I couldn't create that task. Please try again.",
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                errorMessage,
            ]);
        } finally {
            setIsTyping(false);
            scrollToBottom();
        }
    };

    const cancelPendingTask = () => {
        setPendingTask(null);

        const assistantMessage = {
            id: createMessageId(),
            role: "assistant",
            text: "Okay, I won't create that task.",
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            assistantMessage,
        ]);

        scrollToBottom();
    };
    const confirmPendingCompletion = async () => {
        if (!pendingCompletion?.id) {
            return;
        }

        try {
            setIsTyping(true);

            await changeTaskCompletion(
                pendingCompletion.id,
                true
            );
            try {
                await cancelTaskReminder(pendingCompletion.id, user.uid);
            } catch (reminderError) {
                console.warn("Assistant reminder cancellation failed:", reminderError);
            }

            const completedTask = pendingCompletion;

            setPendingCompletion(null);

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `Task completed successfully! ✅\n\n` +
                    `• ${completedTask.title}`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);
        } catch (error) {
            console.error(
                "AI task completion error:",
                error
            );

            const errorMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    "I couldn't mark that task as completed. Please try again.",
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                errorMessage,
            ]);
        } finally {
            setIsTyping(false);
            scrollToBottom();
        }
    };

    const confirmPendingDeletion = async () => {
        if (!pendingDeletion?.id) {
            return;
        }

        try {
            setIsTyping(true);

            const deletedTask = pendingDeletion;

            await removeUserTask(
                pendingDeletion.id
            );
            try {
                await cancelTaskReminder(pendingDeletion.id, user.uid);
            } catch (reminderError) {
                console.warn("Assistant reminder cancellation failed:", reminderError);
            }

            setPendingDeletion(null);

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `Task deleted successfully.\n\n` +
                    `• ${deletedTask.title}`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);
        } catch (error) {
            console.error(
                "AI task deletion error:",
                error
            );

            const errorMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    "I couldn't delete that task. Please try again.",
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                errorMessage,
            ]);
        } finally {
            setIsTyping(false);
            scrollToBottom();
        }
    };

    const cancelPendingDeletion = () => {
        const taskTitle = pendingDeletion?.title;

        setPendingDeletion(null);

        const assistantMessage = {
            id: createMessageId(),
            role: "assistant",
            text: taskTitle
                ? `Okay, I won't delete "${taskTitle}".`
                : "Okay, I won't delete that task.",
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            assistantMessage,
        ]);

        scrollToBottom();
    };

    const cancelPendingCompletion = () => {
        const taskTitle = pendingCompletion?.title;

        setPendingCompletion(null);

        const assistantMessage = {
            id: createMessageId(),
            role: "assistant",
            text: taskTitle
                ? `Okay, I won't mark "${taskTitle}" as completed.`
                : "Okay, I won't complete that task.",
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            assistantMessage,
        ]);

        scrollToBottom();
    };

    const confirmPendingEdit = async () => {
        if (!pendingEdit?.task?.id || !pendingEdit?.updates) {
            return;
        }

        try {
            setIsTyping(true);

            await editUserTask(
                pendingEdit.task.id,
                pendingEdit.updates
            );
            if ("dueDate" in pendingEdit.updates || "dueTime" in pendingEdit.updates) {
                try {
                    await scheduleTaskReminder(
                        user.uid,
                        pendingEdit.task.id,
                        { ...pendingEdit.task, ...pendingEdit.updates }
                    );
                } catch (reminderError) {
                    console.warn("Assistant reminder rescheduling failed:", reminderError);
                }
            }

            const editedTask = pendingEdit.task;
            const editDescription = pendingEdit.description;

            setPendingEdit(null);

            const assistantMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    `Task updated successfully! ✅\n\n` +
                    `• ${editedTask.title}\n` +
                    `• ${editDescription}`,
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                assistantMessage,
            ]);
        } catch (error) {
            console.error("AI task edit error:", error);

            const errorMessage = {
                id: createMessageId(),
                role: "assistant",
                text:
                    "I couldn't update that task. Please try again.",
            };

            setMessages((currentMessages) => [
                ...currentMessages,
                errorMessage,
            ]);
        } finally {
            setIsTyping(false);
            scrollToBottom();
        }
    };

    const cancelPendingEdit = () => {
        const taskTitle = pendingEdit?.task?.title;

        setPendingEdit(null);

        const assistantMessage = {
            id: createMessageId(),
            role: "assistant",
            text: taskTitle
                ? `Okay, I won't change "${taskTitle}".`
                : "Okay, I won't make that change.",
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            assistantMessage,
        ]);

        scrollToBottom();
    };

    const resetConversation = () => {
        setMessages(INITIAL_MESSAGES);
        setInput("");
        setIsTyping(false);
        setPendingTask(null);
        setPendingCompletion(null);
        setPendingDeletion(null);
        setPendingEdit(null);
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === "user";

        return (
            <View
                style={[
                    styles.messageRow,
                    isUser
                        ? styles.userMessageRow
                        : styles.assistantMessageRow,
                ]}
            >
                {!isUser && (
                    <View style={styles.avatar}>
                        <Ionicons
                            name="sparkles"
                            size={17}
                            color="#FFFFFF"
                        />
                    </View>
                )}

                <View
                    style={[
                        styles.messageBubble,
                        isUser
                            ? styles.userBubble
                            : styles.assistantBubble,
                    ]}
                >
                    {!isUser && (
                        <Text style={styles.assistantName}>
                            TaskPilot AI
                        </Text>
                    )}

                    <Text
                        style={[
                            styles.messageText,
                            isUser
                                ? styles.userMessageText
                                : styles.assistantMessageText,
                        ]}
                    >
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };

    const renderTypingIndicator = () => {
        if (!isTyping) {
            return <View style={styles.footerSpacing} />;
        }

        return (
            <View style={styles.typingRow}>
                <View style={styles.avatar}>
                    <Ionicons
                        name="sparkles"
                        size={17}
                        color="#FFFFFF"
                    />
                </View>

                <View style={styles.typingBubble}>
                    <ActivityIndicator
                        size="small"
                        color={colors.primary}
                    />

                    <Text style={styles.typingText}>
                        TaskPilot AI is thinking...
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top"]}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 82 : 0}
            >
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons
                            name="sparkles"
                            size={23}
                            color="#FFFFFF"
                        />
                    </View>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>
                            TaskPilot AI
                        </Text>

                        <View style={styles.statusRow}>
                            <View style={styles.statusDot} />

                            <Text style={styles.headerSubtitle}>
                                Your productivity assistant
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.refreshButton}
                        activeOpacity={0.75}
                        onPress={resetConversation}
                    >
                        <Ionicons
                            name="refresh-outline"
                            size={22}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.fixedTools}>
                    <Text style={styles.welcomeTitle}>
                        How can I help today?
                    </Text>

                    <Text style={styles.welcomeDescription}>
                        Ask about your schedule, priorities, or
                        daily productivity.
                    </Text>

                    <FlatList
                        data={QUICK_ACTIONS}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={
                            styles.quickActionsContainer
                        }
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.quickActionButton,
                                    isTyping &&
                                    styles.quickActionDisabled,
                                ]}
                                activeOpacity={0.75}
                                disabled={isTyping}
                                onPress={() =>
                                    sendMessage(item.prompt)
                                }
                            >
                                <Ionicons
                                    name={item.icon}
                                    size={17}
                                    color={
                                        colors.primary
                                    }
                                />

                                <Text
                                    style={
                                        styles.quickActionText
                                    }
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                <FlatList
                    ref={listRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    style={styles.messageList}
                    contentContainerStyle={
                        styles.messageContent
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={scrollToBottom}
                    ListFooterComponent={
                        renderTypingIndicator
                    }
                />
                {pendingTask && (
                    <View style={styles.confirmationContainer}>
                        <View style={styles.confirmationCard}>
                            <View style={styles.confirmationHeader}>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={21}
                                    color={colors.primary}
                                />

                                <Text style={styles.confirmationTitle}>
                                    Create this task?
                                </Text>
                            </View>

                            <Text style={styles.confirmationTaskTitle}>
                                {pendingTask.title}
                            </Text>

                            <Text style={styles.confirmationDetail}>
                                Date: {pendingTask.dueDate || "Not set"}
                            </Text>

                            <Text style={styles.confirmationDetail}>
                                Time: {pendingTask.dueTime || "Not set"}
                            </Text>

                            <Text style={styles.confirmationDetail}>
                                Priority: {pendingTask.priority}
                            </Text>

                            <View style={styles.confirmationActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={cancelPendingTask}
                                    disabled={isTyping}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={confirmPendingTask}
                                    disabled={isTyping}
                                >
                                    <Ionicons
                                        name="checkmark"
                                        size={18}
                                        color="#FFFFFF"
                                    />

                                    <Text style={styles.confirmButtonText}>
                                        Create Task
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                {pendingCompletion && (
                    <View style={styles.confirmationContainer}>
                        <View style={styles.confirmationCard}>
                            <View style={styles.confirmationHeader}>
                                <Ionicons
                                    name="checkmark-done-circle-outline"
                                    size={21}
                                    color={colors.primary}
                                />

                                <Text style={styles.confirmationTitle}>
                                    Mark this task complete?
                                </Text>
                            </View>

                            <Text style={styles.confirmationTaskTitle}>
                                {pendingCompletion.title}
                            </Text>

                            {pendingCompletion.dueDate && (
                                <Text style={styles.confirmationDetail}>
                                    Date: {pendingCompletion.dueDate}
                                </Text>
                            )}

                            {pendingCompletion.dueTime && (
                                <Text style={styles.confirmationDetail}>
                                    Time: {pendingCompletion.dueTime}
                                </Text>
                            )}

                            <View style={styles.confirmationActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={cancelPendingCompletion}
                                    disabled={isTyping}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={confirmPendingCompletion}
                                    disabled={isTyping}
                                >
                                    <Ionicons
                                        name="checkmark"
                                        size={18}
                                        color="#FFFFFF"
                                    />

                                    <Text style={styles.confirmButtonText}>
                                        Mark Complete
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                {pendingDeletion && (
                    <View style={styles.confirmationContainer}>
                        <View style={styles.confirmationCard}>
                            <View style={styles.confirmationHeader}>
                                <Ionicons
                                    name="trash-outline"
                                    size={21}
                                    color={colors.error}
                                />

                                <Text style={styles.confirmationTitle}>
                                    Delete this task?
                                </Text>
                            </View>

                            <Text style={styles.confirmationTaskTitle}>
                                {pendingDeletion.title}
                            </Text>

                            {pendingDeletion.dueDate && (
                                <Text style={styles.confirmationDetail}>
                                    Date: {pendingDeletion.dueDate}
                                </Text>
                            )}

                            {pendingDeletion.dueTime && (
                                <Text style={styles.confirmationDetail}>
                                    Time: {pendingDeletion.dueTime}
                                </Text>
                            )}

                            <View style={styles.confirmationActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={cancelPendingDeletion}
                                    disabled={isTyping}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteConfirmButton}
                                    onPress={confirmPendingDeletion}
                                    disabled={isTyping}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={17}
                                        color="#FFFFFF"
                                    />

                                    <Text style={styles.confirmButtonText}>
                                        Delete Task
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                {pendingEdit && (
                    <View style={styles.confirmationContainer}>
                        <View style={styles.confirmationCard}>
                            <View style={styles.confirmationHeader}>
                                <Ionicons
                                    name="create-outline"
                                    size={21}
                                    color={colors.primary}
                                />

                                <Text style={styles.confirmationTitle}>
                                    Update this task?
                                </Text>
                            </View>

                            <Text style={styles.confirmationTaskTitle}>
                                {pendingEdit.task.title}
                            </Text>

                            <Text style={styles.confirmationDetail}>
                                {pendingEdit.description}
                            </Text>

                            <View style={styles.confirmationActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={cancelPendingEdit}
                                    disabled={isTyping}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={confirmPendingEdit}
                                    disabled={isTyping}
                                >
                                    <Ionicons
                                        name="checkmark"
                                        size={18}
                                        color="#FFFFFF"
                                    />

                                    <Text style={styles.confirmButtonText}>
                                        Update Task
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                <View style={styles.inputSection}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            style={[
                                styles.voiceButton,
                                isListening && styles.voiceButtonListening,
                            ]}
                            activeOpacity={0.75}
                            onPress={toggleVoiceRecognition}
                        >
                            <Ionicons
                                name={
                                    isListening
                                        ? "stop-circle"
                                        : "mic-outline"
                                }
                                size={22}
                                color={
                                    isListening
                                        ? "#FFFFFF"
                                        : colors.primary
                                }
                            />
                        </TouchableOpacity>

                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask TaskPilot AI..."
                            placeholderTextColor={
                                colors.secondaryText
                            }
                            style={styles.input}
                            multiline
                            maxLength={500}
                            returnKeyType="send"
                            blurOnSubmit={false}
                            onSubmitEditing={() =>
                                sendMessage()
                            }
                        />

                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (!input.trim() ||
                                    isTyping) &&
                                styles.sendButtonDisabled,
                            ]}
                            activeOpacity={0.8}
                            disabled={
                                !input.trim() || isTyping
                            }
                            onPress={() => sendMessage()}
                        >
                            <Ionicons
                                name="arrow-up"
                                size={21}
                                color="#FFFFFF"
                            />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.disclaimer}>
                        TaskPilot AI may make mistakes. Review
                        important task details.
                    </Text>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const make_styles = (colors) => StyleSheet.create({
    confirmationContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.background,
    },

    confirmationCard: {
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
    },

    confirmationHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginBottom: 10,
    },

    confirmationTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: colors.text,
    },

    confirmationTaskTitle: {
        marginBottom: 8,
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },

    confirmationDetail: {
        marginBottom: 3,
        fontSize: 13,
        color: colors.secondaryText,
    },

    confirmationActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 14,
    },

    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
    },

    cancelButtonText: {
        fontWeight: "700",
        color: colors.text,
    },

    confirmButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.primary,
    },

    confirmButtonText: {
        fontWeight: "700",
        color: "#FFFFFF",
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },

    container: {
        flex: 1,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },

    headerIcon: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 11,
        borderRadius: 15,
        backgroundColor: colors.primary,
    },

    headerTextContainer: {
        flex: 1,
    },

    headerTitle: {
        fontSize: 19,
        fontWeight: "800",
        color: colors.text,
    },

    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 3,
    },

    statusDot: {
        width: 7,
        height: 7,
        marginRight: 6,
        borderRadius: 4,
        backgroundColor: "#22C55E",
    },

    headerSubtitle: {
        fontSize: 12,
        color: colors.secondaryText,
    },

    refreshButton: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
    },

    fixedTools: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },

    welcomeTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.text,
    },

    welcomeDescription: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: colors.secondaryText,
    },

    quickActionsContainer: {
        gap: 9,
        paddingTop: 12,
        paddingRight: 10,
    },

    quickActionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
    },

    quickActionDisabled: {
        opacity: 0.55,
    },

    quickActionText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.text,
    },

    messageList: {
        flex: 1,
    },

    messageContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },

    messageRow: {
        width: "100%",
        marginBottom: 15,
    },

    userMessageRow: {
        alignItems: "flex-end",
    },

    assistantMessageRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },

    avatar: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
        borderRadius: 12,
        backgroundColor: colors.primary,
    },

    messageBubble: {
        maxWidth: "82%",
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 17,
    },

    userBubble: {
        borderBottomRightRadius: 5,
        backgroundColor: colors.primary,
    },

    assistantBubble: {
        borderWidth: 1,
        borderColor: colors.border,
        borderTopLeftRadius: 5,
        backgroundColor: colors.surface,
    },

    assistantName: {
        marginBottom: 4,
        fontSize: 11,
        fontWeight: "800",
        color: colors.primary,
    },

    messageText: {
        fontSize: 14,
        lineHeight: 21,
    },

    userMessageText: {
        color: "#FFFFFF",
    },

    assistantMessageText: {
        color: colors.text,
    },

    typingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },

    typingBubble: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
    },

    typingText: {
        fontSize: 13,
        color: colors.secondaryText,
    },

    footerSpacing: {
        height: 14,
    },

    inputSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,

        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    voiceButtonListening: {
        backgroundColor: colors.primary,
    },

    inputContainer: {
        minHeight: 54,
        flexDirection: "row",
        alignItems: "flex-end",
        padding: 6,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        backgroundColor: colors.background,
    },

    voiceButton: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
    },

    input: {
        flex: 1,
        minHeight: 42,
        maxHeight: 110,
        paddingHorizontal: 8,
        paddingTop: Platform.OS === "ios" ? 11 : 8,
        paddingBottom: 8,
        fontSize: 15,
        color: colors.text,
    },

    sendButton: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        backgroundColor: colors.primary,
    },

    sendButtonDisabled: {
        opacity: 0.4,
    },

    disclaimer: {
        marginTop: 7,
        textAlign: "center",
        fontSize: 10,
        color: colors.secondaryText,
    },
    deleteConfirmButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.error,
    },
});