import React from "react";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

import { Theme } from "../../constants/theme";
import { auth } from "../../firebase/firebaseConfig";
import {
  cancelTaskReminder,
  scheduleTaskReminder,
} from "../../services/notificationService";
import {
  listenToUserTasks,
  changeTaskCompletion,
} from "../../services/taskService";

const FILTERS = ["All", "Active", "Completed"];

export default function Tasks() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let unsubscribeTasks = () => { };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeTasks();

      if (!user) {
        setTasks([]);
        setLoading(false);
        setErrorMessage("Please sign in to view your tasks.");
        return;
      }

      setLoading(true);
      setErrorMessage("");

      unsubscribeTasks = listenToUserTasks(
        user.uid,
        (receivedTasks) => {
          setTasks(receivedTasks);
          setLoading(false);
        },
        (error) => {
          console.error("Unable to load tasks:", error);

          setErrorMessage(
            "We couldn't load your tasks. Please check your connection."
          );

          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeTasks();
      unsubscribeAuth();
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !cleanSearch ||
        task.title?.toLowerCase().includes(cleanSearch) ||
        task.description?.toLowerCase().includes(cleanSearch) ||
        task.category?.toLowerCase().includes(cleanSearch);

      const matchesFilter =
        selectedFilter === "All" ||
        (selectedFilter === "Active" && !task.completed) ||
        (selectedFilter === "Completed" && task.completed);

      return matchesSearch && matchesFilter;
    });
  }, [tasks, searchText, selectedFilter]);

  const activeTaskCount = tasks.filter((task) => !task.completed).length;
  const completedTaskCount = tasks.filter((task) => task.completed).length;

  const handleToggleTask = async (task) => {
    if (updatingTaskId) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Session expired", "Please sign in again.");
      return;
    }

    const nextCompleted = !task.completed;

    try {
      setUpdatingTaskId(task.id);

      // Update Firestore before changing the local reminder.
      await changeTaskCompletion(task.id, nextCompleted);

      try {
        if (nextCompleted) {
          // Finished tasks should no longer trigger reminders.
          await cancelTaskReminder(task.id, currentUser.uid);
        } else {
          // Restore a reminder only if its scheduled time is still ahead.
          await scheduleTaskReminder(currentUser.uid, task.id, {
            ...task,
            completed: false,
          });
        }
      } catch (notificationError) {
        console.error("Unable to update task reminder:", notificationError);
        Alert.alert(
          "Task updated",
          "Your task was saved, but its reminder could not be updated."
        );
      }
    } catch (error) {
      console.error("Unable to update task:", error);

      Alert.alert(
        "Unable to update task",
        "Something went wrong. Please try again."
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const renderTask = ({ item }) => {
    return (
      <TaskCard
        task={item}
        updating={updatingTaskId === item.id}
        onToggle={() => handleToggleTask(item)}
        onOpen={() =>
          router.push({
            pathname: "/task/[id]",
            params: { id: item.id },
          })
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>My Tasks</Text>

            <Text style={styles.subtitle}>
              Let&apos;s organize your day, one task at a time.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={() => router.push("/create-task")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add task"
          >
            <Ionicons
              name="add"
              size={26}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryContainer}>
          <SummaryItem
            icon="list-outline"
            value={activeTaskCount}
            label="Active"
          />

          <View style={styles.summaryDivider} />

          <SummaryItem
            icon="checkmark-circle-outline"
            value={completedTaskCount}
            label="Completed"
          />

          <View style={styles.summaryDivider} />

          <SummaryItem
            icon="albums-outline"
            value={tasks.length}
            label="Total"
          />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={21}
            color={colors.secondaryText}
          />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search your tasks..."
            placeholderTextColor={colors.secondaryText}
            style={styles.searchInput}
            returnKeyType="search"
          />

          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const selected = selectedFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  selected && styles.filterButtonSelected,
                ]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadingText}>
              Preparing your tasks...
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerContent}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="cloud-offline-outline"
                size={42}
                color={colors.error}
              />
            </View>

            <Text style={styles.emptyTitle}>Something went wrong</Text>

            <Text style={styles.emptyDescription}>{errorMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              filteredTasks.length === 0 && styles.emptyListContent,
            ]}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <TaskEmptyState
                hasTasks={tasks.length > 0}
                searchText={searchText}
                selectedFilter={selectedFilter}
              />
            }
          />
        )}

      </View>
    </SafeAreaView>
  );
}

function SummaryItem({ icon, value, label }) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

  return (
    <View style={styles.summaryItem}>
      <Ionicons
        name={icon}
        size={21}
        color={colors.primary}
      />

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TaskCard({ task, updating, onToggle, onOpen }) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

  const priority = task.priority?.toLowerCase() || "medium";

  const priorityColor =
    {
      high: colors.high || "#EF4444",
      medium: colors.medium || "#F59E0B",
      low: colors.low || "#22C55E",
    }[priority] || colors.primary;

  return (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={onOpen}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        style={[
          styles.checkbox,
          task.completed && styles.checkboxCompleted,
        ]}
        onPress={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        disabled={updating}
        activeOpacity={0.7}
      >
        {updating ? (
          <ActivityIndicator
            size="small"
            color={task.completed ? "#FFFFFF" : colors.primary}
          />
        ) : task.completed ? (
          <Ionicons name="checkmark" size={17} color="#FFFFFF" />
        ) : null}
      </TouchableOpacity>

      <View style={styles.taskContent}>
        <Text
          numberOfLines={2}
          style={[
            styles.taskTitle,
            task.completed && styles.taskTitleCompleted,
          ]}
        >
          {task.title || "Untitled Task"}
        </Text>

        {task.description ? (
          <Text
            numberOfLines={1}
            style={[
              styles.taskDescription,
              task.completed && styles.taskTextCompleted,
            ]}
          >
            {task.description}
          </Text>
        ) : null}

        <View style={styles.taskMetaRow}>
          <View style={styles.categoryContainer}>
            <Ionicons
              name={getCategoryIcon(task.category)}
              size={14}
              color={colors.secondaryText}
            />

            <Text style={styles.categoryText}>
              {task.category || "Personal"}
            </Text>
          </View>

          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: `${priorityColor}18` },
            ]}
          >
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: priorityColor },
              ]}
            />

            <Text
              style={[
                styles.priorityText,
                { color: priorityColor },
              ]}
            >
              {priority}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.secondaryText}
      />
    </TouchableOpacity>
  );
}

function TaskEmptyState({
  hasTasks,
  searchText,
  selectedFilter,
}) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

  const isFiltering =
    searchText.trim().length > 0 || selectedFilter !== "All";

  if (hasTasks && isFiltering) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="search-outline"
            size={42}
            color={colors.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>No matching tasks</Text>

        <Text style={styles.emptyDescription}>
          Try another search or select a different filter.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="sparkles-outline"
          size={42}
          color={colors.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>Your task list is ready</Text>

      <Text style={styles.emptyDescription}>
        Every achievement starts with one small task. Add your first one
        using the + button in the bottom navigation.
      </Text>

    </View>
  );
}

function getCategoryIcon(category) {
  const normalizedCategory = category?.toLowerCase();

  const icons = {
    work: "briefcase-outline",
    study: "book-outline",
    health: "fitness-outline",
    shopping: "cart-outline",
    personal: "person-outline",
  };

  return icons[normalizedCategory] || "folder-outline";
}

const make_styles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.secondaryText,
  },

  summaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },

  summaryLabel: {
    marginTop: 1,
    fontSize: 11,
    color: colors.secondaryText,
  },

  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: colors.border,
  },

  searchContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginHorizontal: 10,
    fontSize: 15,
    color: colors.text,
  },

  filterRow: {
    flexDirection: "row",
    gap: 9,
    marginVertical: 15,
  },

  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 30,
    backgroundColor: colors.surface,
  },

  filterButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondaryText,
  },

  filterTextSelected: {
    color: "#FFFFFF",
  },

  listContent: {
    paddingBottom: 110,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },

  checkbox: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
  },

  checkboxCompleted: {
    backgroundColor: colors.primary,
  },

  taskContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  taskTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },

  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: colors.secondaryText,
  },

  taskDescription: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondaryText,
  },

  taskTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },

  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 10,
  },

  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  categoryText: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  priorityText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginLeft: 12,
  },

  loadingText: {
    marginTop: 14,
    color: colors.secondaryText,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 80,
  },

  emptyIconContainer: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    color: colors.text,
  },

  emptyDescription: {
    maxWidth: 310,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: colors.secondaryText,
  },

});
