import React, { useMemo } from "react";
import { useAppTheme } from "../contexts/ThemeContext";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Theme } from "../constants/theme";
import { auth } from "../firebase/firebaseConfig";
import { addUserTask } from "../services/taskService";
import { scheduleTaskReminder } from "../services/notificationService";
import { predictTaskPriority } from "../services/priorityService";
import TaskSaveAnimation from "../components/TaskSaveAnimation";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";

// Keep the saving overlay brief while still waiting for the actual save.
const MIN_SAVING_DURATION_MS = 900;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CATEGORIES = [
    {
        name: "Personal",
        icon: "person-outline",
    },
    {
        name: "Work",
        icon: "briefcase-outline",
    },
    {
        name: "Study",
        icon: "book-outline",
    },
    {
        name: "Health",
        icon: "fitness-outline",
    },
    {
        name: "Shopping",
        icon: "cart-outline",
    },
];

const PRIORITIES = [
    {
        name: "low",
        label: "Low",
        color: "#22C55E",
    },
    {
        name: "medium",
        label: "Medium",
        color: "#F59E0B",
    },
    {
        name: "high",
        label: "High",
        color: "#EF4444",
    },
];

export default function CreateTask() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Personal");
    const [priority, setPriority] = useState("medium");
    const [importance, setImportance] = useState(5);
    const [estimatedMinutes, setEstimatedMinutes] = useState(60);
    const [dueDate, setDueDate] = useState(null);
    const [dueTime, setDueTime] = useState(null);

    const params = useLocalSearchParams();

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [animationPhase, setAnimationPhase] = useState("idle");

    useEffect(() => {
        if (!params.dueDate) {
            return;
        }

        const dateString = Array.isArray(params.dueDate)
            ? params.dueDate[0]
            : params.dueDate;

        const [year, month, day] = dateString
            .split("-")
            .map(Number);

        if (!year || !month || !day) {
            return;
        }

        setDueDate(new Date(year, month - 1, day));
    }, [params.dueDate]);

    const formatDate = (date) => {
        if (!date) {
            return "";
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (date) => {
        if (!date) {
            return "Choose a due date";
        }

        return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatTime = (date) => {
        if (!date) {
            return "";
        }

        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const openDatePicker = () => {
        Keyboard.dismiss();
        setShowTimePicker(false);
        setShowDatePicker(true);
    };

    const openTimePicker = () => {
        Keyboard.dismiss();
        setShowDatePicker(false);
        setShowTimePicker(true);
    };

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }

        if (event.type === "dismissed") {
            return;
        }

        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    const handleTimeChange = (event, selectedTime) => {
        if (Platform.OS === "android") {
            setShowTimePicker(false);
        }

        if (event.type === "dismissed") {
            return;
        }

        if (selectedTime) {
            setDueTime(selectedTime);
        }
    };


    // Predictions run entirely on-device using the exported ML model.
    // A date is required by this model; never invent a deadline.
    const aiRecommendation = useMemo(() => {
        if (!dueDate) return null;
        try {
            return predictTaskPriority({
                dueDate: formatDate(dueDate),
                importance,
                estimatedMinutes,
                completed: false,
            });
        } catch (error) {
            console.warn("AI priority prediction failed:", error);
            return null;
        }
    }, [dueDate, importance, estimatedMinutes]);

    const applyAiPriority = () => {
        if (!aiRecommendation) return;
        const suggested = aiRecommendation.priority.toLowerCase();
        if (["low", "medium", "high"].includes(suggested)) {
            setPriority(suggested);
        }
    };

    const handleSaveTask = async () => {
        const cleanTitle = title.trim();
        const currentUser = auth.currentUser;

        if (!cleanTitle) {
            Alert.alert(
                "Task title needed",
                "Please enter a short title for your task."
            );
            return;
        }

        if (!currentUser) {
            Alert.alert(
                "Session expired",
                "Please sign in again before creating a task."
            );
            return;
        }

        const taskData = {
            title: cleanTitle,
            description,
            category,
            priority,
            importance,
            estimatedMinutes,
            dueDate: dueDate ? formatDate(dueDate) : null,
            dueTime: dueTime ? formatTime(dueTime) : null,
        };

        if (saving || animationPhase !== "idle") return;

        const savingStartedAt = Date.now();

        try {
            setSaving(true);
            Keyboard.dismiss();
            setAnimationPhase("saving");

            // First, save the task to Firebase.
            const taskId = await addUserTask(
                currentUser.uid,
                taskData
            );

            // Then, attempt to schedule its local reminder.
            // A notification error should not undo a saved task.
            let reminderScheduled = false;

            try {
                const notificationId = await scheduleTaskReminder(
                    currentUser.uid,
                    taskId,
                    taskData
                );

                reminderScheduled = Array.isArray(notificationId) ? notificationId.length > 0 : Boolean(notificationId);
            } catch (notificationError) {
                console.error(
                    "Task reminder scheduling error:",
                    notificationError
                );
            }

            const hasSchedule = Boolean(
                taskData.dueDate && taskData.dueTime
            );

            // Give the PNG saving sequence time to animate, even when
            // Firebase and notification scheduling finish very quickly.
            const elapsed = Date.now() - savingStartedAt;
            if (elapsed < MIN_SAVING_DURATION_MS) {
                await wait(MIN_SAVING_DURATION_MS - elapsed);
            }

            setAnimationPhase("success");
        } catch (error) {
            setAnimationPhase("idle");
            console.error("Create task error:", error);

            Alert.alert(
                "Unable to add task",
                "Something went wrong while saving. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSuccessFinished = () => {
        setAnimationPhase("idle");
        router.replace("/(tabs)/tasks");
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={23}
                            color={colors.text}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Create Task</Text>
                        <Text style={styles.headerSubtitle}>
                            Add something you want to accomplish.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerTaskListButton}
                        onPress={() => router.push("/(tabs)/tasks")}
                        disabled={saving || animationPhase !== "idle"}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Open Task List"
                    >
                        <Ionicons
                            name="list-outline"
                            size={24}
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                >
                    <View style={styles.introCard}>
                        <View style={styles.introIcon}>
                            <Ionicons
                                name="sparkles-outline"
                                size={25}
                                color={colors.primary}
                            />
                        </View>

                        <View style={styles.introTextContainer}>
                            <Text style={styles.introTitle}>
                                Let&apos;s plan your next step
                            </Text>

                            <Text style={styles.introDescription}>
                                Keep it simple. You can edit the details later.
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.label}>
                        Task title <Text style={styles.required}>*</Text>
                    </Text>

                    <View style={styles.inputContainer}>
                        <Ionicons
                            name="checkmark-circle-outline"
                            size={21}
                            color={colors.secondaryText}
                        />

                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="What do you need to do?"
                            placeholderTextColor={colors.secondaryText}
                            style={styles.input}
                            maxLength={100}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.characterRow}>
                        <Text style={styles.helperText}>
                            Use a short and clear task title.
                        </Text>

                        <Text style={styles.characterCount}>
                            {title.length}/100
                        </Text>
                    </View>

                    <Text style={styles.label}>Description</Text>

                    <View style={[styles.inputContainer, styles.descriptionContainer]}>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add helpful details..."
                            placeholderTextColor={colors.secondaryText}
                            style={[styles.input, styles.descriptionInput]}
                            multiline
                            textAlignVertical="top"
                            maxLength={500}
                        />
                    </View>

                    <Text style={styles.label}>Category</Text>

                    <View style={styles.optionGrid}>
                        {CATEGORIES.map((item) => {
                            const selected = category === item.name;

                            return (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.categoryButton,
                                        selected && styles.categoryButtonSelected,
                                    ]}
                                    onPress={() => setCategory(item.name)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons
                                        name={item.icon}
                                        size={19}
                                        color={
                                            selected
                                                ? "#FFFFFF"
                                                : colors.secondaryText
                                        }
                                    />

                                    <Text
                                        style={[
                                            styles.categoryText,
                                            selected && styles.categoryTextSelected,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.label}>Priority</Text>

                    <View style={styles.priorityRow}>
                        {PRIORITIES.map((item) => {
                            const selected = priority === item.name;

                            return (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.priorityButton,
                                        selected && {
                                            borderColor: item.color,
                                            backgroundColor: `${item.color}15`,
                                        },
                                    ]}
                                    onPress={() => setPriority(item.name)}
                                    activeOpacity={0.75}
                                >
                                    <View
                                        style={[
                                            styles.priorityDot,
                                            {
                                                backgroundColor: item.color,
                                            },
                                        ]}
                                    />

                                    <Text
                                        style={[
                                            styles.priorityLabel,
                                            selected && {
                                                color: item.color,
                                            },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>

                                    {selected && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={17}
                                            color={item.color}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.sectionTitle}>Schedule</Text>

                    <Text style={styles.label}>Due date</Text>

                    <TouchableOpacity
                        style={styles.inputContainer}
                        onPress={openDatePicker}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={21}
                            color={
                                dueDate
                                    ? colors.primary
                                    : colors.secondaryText
                            }
                        />

                        <Text
                            style={[
                                styles.pickerText,
                                !dueDate && styles.pickerPlaceholder,
                            ]}
                        >
                            {formatDisplayDate(dueDate)}
                        </Text>

                        <Ionicons
                            name="chevron-down-outline"
                            size={20}
                            color={colors.secondaryText}
                        />
                    </TouchableOpacity>

                    {showDatePicker && (
                        <View style={styles.pickerContainer}>
                            <DateTimePicker
                                value={dueDate || new Date()}
                                mode="date"
                                display={Platform.OS === "ios" ? "inline" : "calendar"}
                                minimumDate={new Date()}
                                onChange={handleDateChange}
                            />

                            {Platform.OS === "ios" && (
                                <TouchableOpacity
                                    style={styles.pickerDoneButton}
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <Text style={styles.pickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {dueDate && (
                        <TouchableOpacity
                            style={styles.clearSelectionButton}
                            onPress={() => setDueDate(null)}
                        >
                            <Ionicons
                                name="close-circle-outline"
                                size={16}
                                color={colors.secondaryText}
                            />

                            <Text style={styles.clearSelectionText}>
                                Remove due date
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Due time</Text>

                    <TouchableOpacity
                        style={styles.inputContainer}
                        onPress={openTimePicker}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name="time-outline"
                            size={21}
                            color={
                                dueTime
                                    ? colors.primary
                                    : colors.secondaryText
                            }
                        />

                        <Text
                            style={[
                                styles.pickerText,
                                !dueTime && styles.pickerPlaceholder,
                            ]}
                        >
                            {dueTime ? formatTime(dueTime) : "Choose a due time"}
                        </Text>

                        <Ionicons
                            name="chevron-down-outline"
                            size={20}
                            color={colors.secondaryText}
                        />
                    </TouchableOpacity>

                    {showTimePicker && (
                        <View style={styles.pickerContainer}>
                            <DateTimePicker
                                value={dueTime || new Date()}
                                mode="time"
                                display={Platform.OS === "ios" ? "spinner" : "clock"}
                                onChange={handleTimeChange}
                            />

                            {Platform.OS === "ios" && (
                                <TouchableOpacity
                                    style={styles.pickerDoneButton}
                                    onPress={() => setShowTimePicker(false)}
                                >
                                    <Text style={styles.pickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {dueTime && (
                        <TouchableOpacity
                            style={styles.clearSelectionButton}
                            onPress={() => setDueTime(null)}
                        >
                            <Ionicons
                                name="close-circle-outline"
                                size={16}
                                color={colors.secondaryText}
                            />

                            <Text style={styles.clearSelectionText}>
                                Remove due time
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.helperText}>
                        The date and time are optional. You can add them later.
                    </Text>

                    <View style={styles.aiCard}>
                        <View style={styles.aiHeadingRow}>
                            <Ionicons name="sparkles" size={20} color={colors.primary} />
                            <Text style={styles.aiTitle}>AI Priority Recommendation</Text>
                        </View>
                        <Text style={styles.aiDescription}>
                            Enter task details to get an offline machine-learning suggestion. You decide whether to use it.
                        </Text>

                        <Text style={styles.aiFieldLabel}>Importance: {importance}/5</Text>
                        <View style={styles.importanceRow}>
                            {[1, 2, 3, 4, 5].map((level) => (
                                <TouchableOpacity
                                    key={level}
                                    style={[
                                        styles.importanceButton,
                                        importance === level && styles.importanceButtonSelected,
                                    ]}
                                    onPress={() => setImportance(level)}
                                    disabled={saving || animationPhase !== "idle"}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Importance ${level} out of 5`}
                                    accessibilityState={{ selected: importance === level }}
                                >
                                    <Text style={[
                                        styles.importanceButtonText,
                                        importance === level && styles.importanceButtonTextSelected,
                                    ]}>{level}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.aiFieldLabel}>Estimated duration</Text>
                        <View style={styles.durationRow}>
                            {[30, 60, 120, 240].map((minutes) => (
                                <TouchableOpacity
                                    key={minutes}
                                    style={[
                                        styles.durationButton,
                                        estimatedMinutes === minutes && styles.durationButtonSelected,
                                    ]}
                                    onPress={() => setEstimatedMinutes(minutes)}
                                    disabled={saving || animationPhase !== "idle"}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${minutes} minutes estimated duration`}
                                    accessibilityState={{ selected: estimatedMinutes === minutes }}
                                >
                                    <Text style={[
                                        styles.durationButtonText,
                                        estimatedMinutes === minutes && styles.durationButtonTextSelected,
                                    ]}>{minutes === 60 ? "1 hr" : minutes === 120 ? "2 hrs" : minutes === 240 ? "4 hrs" : "30 min"}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {aiRecommendation ? (
                            <View style={styles.aiResult}>
                                <Text style={styles.aiResultTitle}>
                                    AI suggests: {aiRecommendation.priority} priority
                                </Text>
                                <Text style={styles.aiResultDetail}>
                                    {Math.round(aiRecommendation.confidence * 100)}% model probability · Advisory only
                                </Text>
                                <TouchableOpacity
                                    style={styles.aiApplyButton}
                                    onPress={applyAiPriority}
                                    disabled={saving || animationPhase !== "idle" || priority === aiRecommendation.priority.toLowerCase()}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.aiApplyButtonText}>
                                        {priority === aiRecommendation.priority.toLowerCase() ? "Suggestion selected" : "Use AI Suggestion"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={styles.aiHint}>
                                Choose a due date above to see an AI recommendation.
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            saving && styles.saveButtonDisabled,
                        ]}
                        onPress={handleSaveTask}
                        disabled={saving || animationPhase !== "idle"}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Saving task...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={22}
                                    color="#FFFFFF"
                                />

                                <Text style={styles.saveButtonText}>Save Task</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                        disabled={saving || animationPhase !== "idle"}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
            <TaskSaveAnimation
                phase={animationPhase}
                onSuccessFinished={handleSuccessFinished}
            />
        </SafeAreaView>
    );
}


const make_styles = (colors) => StyleSheet.create({
    aiCard: {
        marginTop: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        backgroundColor: colors.surface,
    },
    aiHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    aiTitle: { color: colors.text, fontSize: 16, fontWeight: "800", flexShrink: 1 },
    aiDescription: { color: colors.secondaryText, fontSize: 12, lineHeight: 18, marginTop: 8 },
    aiFieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 18, marginBottom: 9 },
    importanceRow: { flexDirection: "row", gap: 8 },
    importanceButton: { flex: 1, minHeight: 43, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 11 },
    importanceButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    importanceButtonText: { color: colors.text, fontWeight: "700" },
    importanceButtonTextSelected: { color: "#FFFFFF" },
    durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    durationButton: { flexGrow: 1, minWidth: "20%", minHeight: 42, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 11 },
    durationButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    durationButtonText: { color: colors.text, fontSize: 12, fontWeight: "700" },
    durationButtonTextSelected: { color: "#FFFFFF" },
    aiResult: { marginTop: 18, padding: 12, borderRadius: 12, backgroundColor: colors.primaryLight },
    aiResultTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
    aiResultDetail: { color: colors.secondaryText, fontSize: 12, marginTop: 5 },
    aiApplyButton: { alignSelf: "flex-start", backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 12 },
    aiApplyButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    aiHint: { color: colors.secondaryText, fontSize: 12, marginTop: 16 },
    headerTaskListButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },

    pickerText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        fontWeight: "500",
        color: colors.text,
    },

    pickerPlaceholder: {
        fontWeight: "400",
        color: colors.secondaryText,
    },

    pickerContainer: {
        marginTop: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        overflow: "hidden",
    },

    pickerDoneButton: {
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: colors.primary,
    },

    pickerDoneText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    clearSelectionButton: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 8,
        paddingVertical: 3,
    },

    clearSelectionText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.secondaryText,
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },

    keyboardView: {
        flex: 1,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },

    backButton: {
        width: 43,
        height: 43,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
    },

    headerTextContainer: {
        flex: 1,
        minWidth: 0,
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: colors.text,
    },

    headerSubtitle: {
        marginTop: 2,
        fontSize: 13,
        color: colors.secondaryText,
    },

    scrollContent: {
        width: "100%",
        maxWidth: 600,
        alignSelf: "center",
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 140,
    },

    introCard: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        backgroundColor: colors.surface,
    },

    introIcon: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderRadius: 16,
        backgroundColor: colors.primaryLight,
    },

    introTextContainer: {
        flex: 1,
    },

    introTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
    },

    introDescription: {
        marginTop: 3,
        fontSize: 13,
        lineHeight: 18,
        color: colors.secondaryText,
    },

    label: {
        marginTop: 17,
        marginBottom: 9,
        fontSize: 14,
        fontWeight: "700",
        color: colors.text,
    },

    required: {
        color: colors.error,
    },

    inputContainer: {
        minHeight: 53,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
    },

    input: {
        flex: 1,
        minHeight: 51,
        marginLeft: 10,
        fontSize: 15,
        color: colors.text,
    },

    descriptionContainer: {
        minHeight: 115,
        alignItems: "flex-start",
        paddingTop: 3,
    },

    descriptionInput: {
        minHeight: 105,
        marginLeft: 0,
        paddingTop: 13,
    },

    characterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 7,
    },

    helperText: {
        marginTop: 7,
        fontSize: 12,
        lineHeight: 17,
        color: colors.secondaryText,
    },

    characterCount: {
        fontSize: 12,
        color: colors.secondaryText,
    },

    optionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 9,
    },

    categoryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
    },

    categoryButtonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },

    categoryText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.secondaryText,
    },

    categoryTextSelected: {
        color: "#FFFFFF",
    },

    priorityRow: {
        flexDirection: "row",
        gap: 8,
    },

    priorityButton: {
        flex: 1,
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        backgroundColor: colors.surface,
    },

    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    priorityLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.secondaryText,
    },

    sectionTitle: {
        marginTop: 29,
        marginBottom: 1,
        fontSize: 18,
        fontWeight: "800",
        color: colors.text,
    },

    saveButton: {
        minHeight: 55,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        marginTop: 30,
        borderRadius: 17,
        backgroundColor: colors.primary,
    },

    saveButtonDisabled: {
        opacity: 0.7,
    },

    saveButtonText: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    cancelButton: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 50,
        marginTop: 8,
    },

    cancelButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.secondaryText,
    },
});