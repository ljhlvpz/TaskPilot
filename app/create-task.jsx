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
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";

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
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Personal");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState(null);
    const [dueTime, setDueTime] = useState(null);

    const params = useLocalSearchParams();

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [saving, setSaving] = useState(false);

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

        try {
            setSaving(true);

            await addUserTask(currentUser.uid, {
                title: cleanTitle,
                description,
                category,
                priority,
                dueDate: dueDate ? formatDate(dueDate) : null,
                dueTime: dueTime ? formatTime(dueTime) : null,
            });

            Alert.alert(
                "Task added 🎉",
                "Your new task is ready.",
                [
                    {
                        text: "Great",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error("Create task error:", error);

            Alert.alert(
                "Unable to add task",
                "Something went wrong while saving. Please try again."
            );
        } finally {
            setSaving(false);
        }
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
                            color={Theme.colors.text}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Create Task</Text>
                        <Text style={styles.headerSubtitle}>
                            Add something you want to accomplish.
                        </Text>
                    </View>
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
                                color={Theme.colors.primary}
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
                            color={Theme.colors.secondaryText}
                        />

                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="What do you need to do?"
                            placeholderTextColor={Theme.colors.secondaryText}
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
                            placeholderTextColor={Theme.colors.secondaryText}
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
                                                : Theme.colors.secondaryText
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
                                    ? Theme.colors.primary
                                    : Theme.colors.secondaryText
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
                            color={Theme.colors.secondaryText}
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
                                color={Theme.colors.secondaryText}
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
                                    ? Theme.colors.primary
                                    : Theme.colors.secondaryText
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
                            color={Theme.colors.secondaryText}
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
                                color={Theme.colors.secondaryText}
                            />

                            <Text style={styles.clearSelectionText}>
                                Remove due time
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.helperText}>
                        The date and time are optional. You can add them later.
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            saving && styles.saveButtonDisabled,
                        ]}
                        onPress={handleSaveTask}
                        disabled={saving}
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
                        disabled={saving}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    pickerText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        fontWeight: "500",
        color: Theme.colors.text,
    },

    pickerPlaceholder: {
        fontWeight: "400",
        color: Theme.colors.secondaryText,
    },

    pickerContainer: {
        marginTop: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 16,
        backgroundColor: Theme.colors.surface,
        overflow: "hidden",
    },

    pickerDoneButton: {
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: Theme.colors.primary,
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
        color: Theme.colors.secondaryText,
    },
    safeArea: {
        flex: 1,
        backgroundColor: Theme.colors.background,
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
        borderBottomColor: Theme.colors.border,
        backgroundColor: Theme.colors.background,
    },

    backButton: {
        width: 43,
        height: 43,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 14,
        backgroundColor: Theme.colors.surface,
    },

    headerTextContainer: {
        flex: 1,
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: Theme.colors.text,
    },

    headerSubtitle: {
        marginTop: 2,
        fontSize: 13,
        color: Theme.colors.secondaryText,
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
        borderColor: Theme.colors.border,
        borderRadius: 18,
        backgroundColor: Theme.colors.surface,
    },

    introIcon: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderRadius: 16,
        backgroundColor: Theme.colors.primaryLight,
    },

    introTextContainer: {
        flex: 1,
    },

    introTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: Theme.colors.text,
    },

    introDescription: {
        marginTop: 3,
        fontSize: 13,
        lineHeight: 18,
        color: Theme.colors.secondaryText,
    },

    label: {
        marginTop: 17,
        marginBottom: 9,
        fontSize: 14,
        fontWeight: "700",
        color: Theme.colors.text,
    },

    required: {
        color: Theme.colors.error,
    },

    inputContainer: {
        minHeight: 53,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 16,
        backgroundColor: Theme.colors.surface,
    },

    input: {
        flex: 1,
        minHeight: 51,
        marginLeft: 10,
        fontSize: 15,
        color: Theme.colors.text,
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
        color: Theme.colors.secondaryText,
    },

    characterCount: {
        fontSize: 12,
        color: Theme.colors.secondaryText,
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
        borderColor: Theme.colors.border,
        borderRadius: 14,
        backgroundColor: Theme.colors.surface,
    },

    categoryButtonSelected: {
        borderColor: Theme.colors.primary,
        backgroundColor: Theme.colors.primary,
    },

    categoryText: {
        fontSize: 13,
        fontWeight: "600",
        color: Theme.colors.secondaryText,
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
        borderColor: Theme.colors.border,
        borderRadius: 14,
        backgroundColor: Theme.colors.surface,
    },

    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    priorityLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: Theme.colors.secondaryText,
    },

    sectionTitle: {
        marginTop: 29,
        marginBottom: 1,
        fontSize: 18,
        fontWeight: "800",
        color: Theme.colors.text,
    },

    saveButton: {
        minHeight: 55,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        marginTop: 30,
        borderRadius: 17,
        backgroundColor: Theme.colors.primary,
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
        color: Theme.colors.secondaryText,
    },
});