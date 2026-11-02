import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

import { Theme } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { listenToUserTasks } from "../../services/taskService";

const PRIORITY_COLORS = {
    low: "#22C55E",
    medium: "#F59E0B",
    high: "#EF4444",
};

const CATEGORY_ICONS = {
    Personal: "person-outline",
    Work: "briefcase-outline",
    Study: "book-outline",
    Health: "fitness-outline",
    Shopping: "cart-outline",
};

const formatDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const formatSelectedDate = (dateString) => {
    if (!dateString) {
        return "Selected date";
    }

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

export default function CalendarScreen() {
    const router = useRouter();
    const { user, authLoading } = useAuth();

    const [selectedDate, setSelectedDate] = useState(
        formatDateKey()
    );
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    // Refresh the default selected day after midnight without overwriting
    // dates that the user explicitly selected.
    const lastTodayRef = useRef(formatDateKey());
    useFocusEffect(
        useCallback(() => {
            const today = formatDateKey();
            if (lastTodayRef.current !== today) {
                const previousToday = lastTodayRef.current;
                setSelectedDate((previous) =>
                    previous === previousToday ? today : previous
                );
                lastTodayRef.current = today;
            }
        }, [])
    );

    useEffect(() => {
        if (authLoading) {
            return undefined;
        }

        if (!user) {
            setTasks([]);
            setLoading(false);
            setErrorMessage(
                "Please sign in to view your calendar."
            );

            return undefined;
        }

        setLoading(true);
        setErrorMessage("");

        const unsubscribe = listenToUserTasks(
            user.uid,
            (receivedTasks) => {
                setTasks(receivedTasks);
                setLoading(false);
            },
            (error) => {
                console.error(
                    "Unable to load calendar tasks:",
                    error
                );

                setErrorMessage(
                    "We couldn't load your calendar. Please check your connection."
                );

                setLoading(false);
            }
        );

        return unsubscribe;
    }, [user, authLoading]);

    const selectedTasks = useMemo(() => {
        return tasks
            .filter((task) => task.dueDate === selectedDate)
            .sort((firstTask, secondTask) => {
                const priorityOrder = {
                    high: 0,
                    medium: 1,
                    low: 2,
                };

                return (
                    (priorityOrder[firstTask.priority] ?? 3) -
                    (priorityOrder[secondTask.priority] ?? 3)
                );
            });
    }, [tasks, selectedDate]);

    const markedDates = useMemo(() => {
        const marks = {};

        tasks.forEach((task) => {
            if (!task.dueDate) {
                return;
            }

            const priority =
                task.priority?.toLowerCase() || "medium";

            const currentMark = marks[task.dueDate] || {
                dots: [],
            };

            const dotKey = `${priority}-${task.id}`;

            currentMark.dots.push({
                key: dotKey,
                color:
                    PRIORITY_COLORS[priority] ||
                    PRIORITY_COLORS.medium,
            });

            marks[task.dueDate] = currentMark;
        });

        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: Theme.colors.primary,
            selectedTextColor: "#FFFFFF",
            dots: marks[selectedDate]?.dots || [],
        };

        return marks;
    }, [tasks, selectedDate]);

    const openCreateTask = () => {
        router.push({
            pathname: "/create-task",
            params: {
                dueDate: selectedDate,
            },
        });
    };

    const openTaskDetails = (taskId) => {
        router.push(`/task/${taskId}`);
    };

    const renderTask = ({ item }) => {
        const priority =
            item.priority?.toLowerCase() || "medium";

        return (
            <TouchableOpacity
                style={[
                    styles.taskCard,
                    item.completed && styles.completedTaskCard,
                ]}
                activeOpacity={0.78}
                onPress={() => openTaskDetails(item.id)}
            >
                <View
                    style={[
                        styles.priorityBar,
                        {
                            backgroundColor:
                                PRIORITY_COLORS[priority] ||
                                PRIORITY_COLORS.medium,
                        },
                    ]}
                />

                <View style={styles.taskContent}>
                    <View style={styles.taskTopRow}>
                        <Text
                            style={[
                                styles.taskTitle,
                                item.completed &&
                                    styles.completedTaskText,
                            ]}
                            numberOfLines={2}
                        >
                            {item.title}
                        </Text>

                        <Ionicons
                            name="chevron-forward-outline"
                            size={19}
                            color={Theme.colors.secondaryText}
                        />
                    </View>

                    {!!item.description && (
                        <Text
                            style={styles.taskDescription}
                            numberOfLines={2}
                        >
                            {item.description}
                        </Text>
                    )}

                    <View style={styles.taskMetaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons
                                name={
                                    CATEGORY_ICONS[item.category] ||
                                    "folder-outline"
                                }
                                size={15}
                                color={Theme.colors.secondaryText}
                            />

                            <Text style={styles.metaText}>
                                {item.category || "Personal"}
                            </Text>
                        </View>

                        {!!item.dueTime && (
                            <View style={styles.metaItem}>
                                <Ionicons
                                    name="time-outline"
                                    size={15}
                                    color={
                                        Theme.colors.secondaryText
                                    }
                                />

                                <Text style={styles.metaText}>
                                    {item.dueTime}
                                </Text>
                            </View>
                        )}

                        <View style={styles.metaItem}>
                            <View
                                style={[
                                    styles.priorityDot,
                                    {
                                        backgroundColor:
                                            PRIORITY_COLORS[
                                                priority
                                            ] ||
                                            PRIORITY_COLORS.medium,
                                    },
                                ]}
                            />

                            <Text
                                style={[
                                    styles.metaText,
                                    {
                                        textTransform:
                                            "capitalize",
                                    },
                                ]}
                            >
                                {priority}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top"]}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>
                        Calendar
                    </Text>

                    <Text style={styles.headerSubtitle}>
                        View and organize your scheduled tasks.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.headerAddButton}
                    activeOpacity={0.78}
                    onPress={openCreateTask}
                >
                    <Ionicons
                        name="add"
                        size={23}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </View>

            <FlatList
                data={selectedTasks}
                keyExtractor={(item) => item.id}
                renderItem={renderTask}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        <View style={styles.calendarCard}>
                            <Calendar
                                key={selectedDate.slice(0, 7)}
                                current={selectedDate}
                                markingType="multi-dot"
                                markedDates={markedDates}
                                onDayPress={(day) =>
                                    setSelectedDate(day.dateString)
                                }
                                enableSwipeMonths
                                theme={{
                                    backgroundColor:
                                        Theme.colors.surface,
                                    calendarBackground:
                                        Theme.colors.surface,
                                    textSectionTitleColor:
                                        Theme.colors.secondaryText,
                                    selectedDayBackgroundColor:
                                        Theme.colors.primary,
                                    selectedDayTextColor:
                                        "#FFFFFF",
                                    todayTextColor:
                                        Theme.colors.primary,
                                    dayTextColor:
                                        Theme.colors.text,
                                    textDisabledColor: "#C7CBD3",
                                    arrowColor:
                                        Theme.colors.primary,
                                    monthTextColor:
                                        Theme.colors.text,
                                    textMonthFontWeight: "800",
                                    textDayFontWeight: "500",
                                    textDayHeaderFontWeight:
                                        "700",
                                }}
                            />
                        </View>

                        <View style={styles.legendRow}>
                            {Object.entries(
                                PRIORITY_COLORS
                            ).map(([priority, color]) => (
                                <View
                                    key={priority}
                                    style={styles.legendItem}
                                >
                                    <View
                                        style={[
                                            styles.legendDot,
                                            {
                                                backgroundColor:
                                                    color,
                                            },
                                        ]}
                                    />

                                    <Text
                                        style={
                                            styles.legendText
                                        }
                                    >
                                        {priority}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionText}>
                                <Text style={styles.sectionTitle}>
                                    {formatSelectedDate(
                                        selectedDate
                                    )}
                                </Text>

                                <Text style={styles.taskCount}>
                                    {selectedTasks.length}{" "}
                                    {selectedTasks.length === 1
                                        ? "task"
                                        : "tasks"}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.addTaskButton}
                                activeOpacity={0.78}
                                onPress={openCreateTask}
                            >
                                <Ionicons
                                    name="add"
                                    size={18}
                                    color="#FFFFFF"
                                />

                                <Text
                                    style={
                                        styles.addTaskButtonText
                                    }
                                >
                                    Add Task
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loading && (
                            <View style={styles.statusContainer}>
                                <ActivityIndicator
                                    size="small"
                                    color={Theme.colors.primary}
                                />

                                <Text style={styles.statusText}>
                                    Loading calendar...
                                </Text>
                            </View>
                        )}

                        {!loading && !!errorMessage && (
                            <View style={styles.statusContainer}>
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={24}
                                    color={Theme.colors.error}
                                />

                                <Text style={styles.errorText}>
                                    {errorMessage}
                                </Text>
                            </View>
                        )}
                    </>
                }
                ListEmptyComponent={
                    !loading && !errorMessage ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons
                                    name="calendar-clear-outline"
                                    size={32}
                                    color={Theme.colors.primary}
                                />
                            </View>

                            <Text style={styles.emptyTitle}>
                                No tasks scheduled
                            </Text>

                            <Text
                                style={styles.emptyDescription}
                            >
                                Add a task for this date to begin
                                planning your schedule.
                            </Text>

                            <TouchableOpacity
                                style={styles.emptyButton}
                                activeOpacity={0.78}
                                onPress={openCreateTask}
                            >
                                <Ionicons
                                    name="add"
                                    size={19}
                                    color="#FFFFFF"
                                />

                                <Text
                                    style={
                                        styles.emptyButtonText
                                    }
                                >
                                    Add Task
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        backgroundColor: Theme.colors.background,
    },

    headerTitle: {
        fontSize: 25,
        fontWeight: "800",
        color: Theme.colors.text,
    },

    headerSubtitle: {
        marginTop: 3,
        fontSize: 13,
        color: Theme.colors.secondaryText,
    },

    headerAddButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 15,
        backgroundColor: Theme.colors.primary,
    },

    listContent: {
        width: "100%",
        maxWidth: 650,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 120,
    },

    calendarCard: {
        padding: 7,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 20,
        backgroundColor: Theme.colors.surface,
        overflow: "hidden",
    },

    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        paddingVertical: 13,
    },

    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    legendText: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "capitalize",
        color: Theme.colors.secondaryText,
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 7,
        marginBottom: 14,
    },

    sectionText: {
        flex: 1,
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: "800",
        lineHeight: 23,
        color: Theme.colors.text,
    },

    taskCount: {
        marginTop: 3,
        fontSize: 12,
        color: Theme.colors.secondaryText,
    },

    addTaskButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderRadius: 13,
        backgroundColor: Theme.colors.primary,
    },

    addTaskButtonText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    taskCard: {
        flexDirection: "row",
        marginBottom: 11,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 17,
        backgroundColor: Theme.colors.surface,
        overflow: "hidden",
    },

    completedTaskCard: {
        opacity: 0.68,
    },

    priorityBar: {
        width: 5,
    },

    taskContent: {
        flex: 1,
        padding: 14,
    },

    taskTopRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },

    taskTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: "800",
        lineHeight: 20,
        color: Theme.colors.text,
    },

    completedTaskText: {
        textDecorationLine: "line-through",
        color: Theme.colors.secondaryText,
    },

    taskDescription: {
        marginTop: 5,
        fontSize: 12,
        lineHeight: 18,
        color: Theme.colors.secondaryText,
    },

    taskMetaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 13,
        marginTop: 11,
    },

    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    metaText: {
        fontSize: 11,
        fontWeight: "600",
        color: Theme.colors.secondaryText,
    },

    priorityDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },

    statusContainer: {
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        paddingVertical: 40,
    },

    statusText: {
        fontSize: 13,
        color: Theme.colors.secondaryText,
    },

    errorText: {
        maxWidth: 280,
        textAlign: "center",
        fontSize: 13,
        lineHeight: 19,
        color: Theme.colors.error,
    },

    emptyState: {
        alignItems: "center",
        paddingHorizontal: 25,
        paddingVertical: 40,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 18,
        backgroundColor: Theme.colors.surface,
    },

    emptyIcon: {
        width: 62,
        height: 62,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        backgroundColor: Theme.colors.primaryLight,
    },

    emptyTitle: {
        marginTop: 14,
        fontSize: 17,
        fontWeight: "800",
        color: Theme.colors.text,
    },

    emptyDescription: {
        maxWidth: 280,
        marginTop: 6,
        textAlign: "center",
        fontSize: 13,
        lineHeight: 19,
        color: Theme.colors.secondaryText,
    },

    emptyButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 16,
        paddingHorizontal: 15,
        paddingVertical: 11,
        borderRadius: 13,
        backgroundColor: Theme.colors.primary,
    },

    emptyButtonText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#FFFFFF",
    },
});