import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { Theme } from "../../constants/theme";
import { auth } from "../../firebase/firebaseConfig";
import { cancelTaskReminder, scheduleTaskReminder } from "../../services/notificationService";
import {
  changeTaskCompletion,
  fetchTaskById,
  removeUserTask,
} from "../../services/taskService";

const PRIORITY_DETAILS = {
  low: {
    label: "Low",
    icon: "leaf-outline",
  },
  medium: {
    label: "Medium",
    icon: "flag-outline",
  },
  high: {
    label: "High",
    icon: "flame-outline",
  },
};

const CATEGORY_ICONS = {
  Personal: "person-outline",
  Work: "briefcase-outline",
  Study: "book-outline",
  Health: "fitness-outline",
  Shopping: "cart-outline",
};

export default function TaskDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const taskId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadTask = useCallback(
    async ({ showLoader = true } = {}) => {
      if (!taskId) {
        setErrorMessage("We could not identify this task.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setErrorMessage("");

        const taskData = await fetchTaskById(taskId);

        if (!taskData) {
          setTask(null);
          setErrorMessage(
            "This task could not be found. It may have been removed."
          );
          return;
        }

        const currentUser = auth.currentUser;

        if (
          currentUser &&
          taskData.userId &&
          taskData.userId !== currentUser.uid
        ) {
          setTask(null);
          setErrorMessage(
            "You do not have permission to view this task."
          );
          return;
        }

        setTask(taskData);
      } catch (error) {
        console.error("Load task error:", error);

        setTask(null);
        setErrorMessage(
          "We could not load this task. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [taskId]
  );

  useFocusEffect(
    useCallback(() => {
      loadTask();

      return undefined;
    }, [loadTask])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTask({ showLoader: false });
  };

  const handleToggleCompletion = async () => {
    if (!task || updating || deleting) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || (task.userId && task.userId !== currentUser.uid)) {
      Alert.alert("Session unavailable", "Please sign in again to update this task.");
      return;
    }

    const nextCompletedState = !task.completed;

    try {
      setUpdating(true);

      // Save to Firestore before changing the local reminder.
      await changeTaskCompletion(task.id, nextCompletedState);

      setTask((currentTask) =>
        currentTask
          ? { ...currentTask, completed: nextCompletedState }
          : currentTask
      );
    } catch (error) {
      console.error("Update completion error:", error);
      Alert.alert(
        "Unable to update task",
        "Please check your connection and try again."
      );
      setUpdating(false);
      return;
    }

    try {
      if (nextCompletedState) {
        await cancelTaskReminder(task.id, currentUser.uid);
      } else {
        await scheduleTaskReminder(currentUser.uid, task.id, {
          ...task,
          completed: false,
        });
      }
    } catch (notificationError) {
      console.error("Update task reminder error:", notificationError);
      Alert.alert(
        "Task saved",
        "The task was updated, but its reminder could not be updated."
      );
    } finally {
      setUpdating(false);
    }
  };

  const confirmDeleteTask = async () => {
    if (!task?.id || deleting || updating) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || (task.userId && task.userId !== currentUser.uid)) {
      Alert.alert("Session unavailable", "Please sign in again to delete this task.");
      return;
    }

    try {
      setDeleting(true);

      // Delete from Firestore first. A failed delete leaves the reminder intact.
      await removeUserTask(task.id);

      let reminderCancelled = true;
      try {
        await cancelTaskReminder(task.id, currentUser.uid);
      } catch (notificationError) {
        reminderCancelled = false;
        console.error("Cancel deleted task reminder error:", notificationError);
      }

      Alert.alert(
        "Task deleted",
        reminderCancelled
          ? "The task and its scheduled reminder have been removed."
          : "The task was deleted, but its scheduled reminder could not be cancelled.",
        [
          {
            text: "Done",
            onPress: () => router.replace("/(tabs)/tasks"),
          },
        ]
      );
    } catch (error) {
      console.error("Delete task error:", error);
      Alert.alert(
        "Unable to delete task",
        "Something went wrong while deleting the task. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteTask = () => {
    if (!task?.id || deleting) {
      return;
    }

    Alert.alert(
      "Delete task?",
      `"${task.title}" will be permanently removed.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDeleteTask,
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!task?.id || deleting) {
      return;
    }

    router.push({
      pathname: "/edit-task/[id]",
      params: {
        id: task.id,
      },
    });
  };

  const priority =
    PRIORITY_DETAILS[task?.priority?.toLowerCase()] ||
    PRIORITY_DETAILS.medium;

  const categoryIcon =
    CATEGORY_ICONS[task?.category] || "folder-outline";

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color={Theme.colors.primary}
          />

          <Text style={styles.loadingText}>
            Getting your task ready...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.simpleHeader}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={Theme.colors.text}
            />
          </TouchableOpacity>

          <Text style={styles.simpleHeaderTitle}>
            Task Details
          </Text>
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="document-text-outline"
              size={34}
              color={Theme.colors.primary}
            />
          </View>

          <Text style={styles.errorTitle}>
            Task unavailable
          </Text>

          <Text style={styles.errorText}>
            {errorMessage ||
              "We could not find the task you were looking for."}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => loadTask()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          disabled={deleting}
          activeOpacity={0.75}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={Theme.colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Task Details
          </Text>

          <Text style={styles.headerSubtitle}>
            Review your plan and keep moving forward.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleEdit}
          disabled={deleting}
          activeOpacity={0.75}
        >
          <Ionicons
            name="create-outline"
            size={22}
            color={Theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
          />
        }
      >
        <View style={styles.taskCard}>
          <TouchableOpacity
            style={[
              styles.completionButton,
              task.completed &&
                styles.completionButtonActive,
            ]}
            onPress={handleToggleCompletion}
            disabled={updating || deleting}
            activeOpacity={0.75}
          >
            {updating ? (
              <ActivityIndicator
                size="small"
                color={
                  task.completed
                    ? "#FFFFFF"
                    : Theme.colors.primary
                }
              />
            ) : (
              <Ionicons
                name={
                  task.completed
                    ? "checkmark"
                    : "ellipse-outline"
                }
                size={25}
                color={
                  task.completed
                    ? "#FFFFFF"
                    : Theme.colors.primary
                }
              />
            )}
          </TouchableOpacity>

          <View style={styles.taskTitleContainer}>
            <Text
              style={[
                styles.taskTitle,
                task.completed &&
                  styles.completedTaskTitle,
              ]}
            >
              {task.title}
            </Text>

            <Text style={styles.taskStatus}>
              {task.completed
                ? "Completed â€” great work!"
                : "Active task"}
            </Text>
          </View>
        </View>

        {task.completed && (
          <View style={styles.successCard}>
            <Ionicons
              name="sparkles"
              size={22}
              color={Theme.colors.primary}
            />

            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>
                Nicely done!
              </Text>

              <Text style={styles.successDescription}>
                You completed this task. Every finished
                step counts.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          Task information
        </Text>

        <View style={styles.detailsCard}>
          <DetailRow
            icon={categoryIcon}
            label="Category"
            value={task.category || "No category"}
          />

          <View style={styles.divider} />

          <DetailRow
            icon={priority.icon}
            label="Priority"
            value={priority.label}
          />

          <View style={styles.divider} />

          <DetailRow
            icon="calendar-outline"
            label="Due date"
            value={task.dueDate || "No due date"}
          />

          <View style={styles.divider} />

          <DetailRow
            icon="time-outline"
            label="Due time"
            value={task.dueTime || "No due time"}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Description
        </Text>

        <View style={styles.descriptionCard}>
          <Ionicons
            name="document-text-outline"
            size={22}
            color={Theme.colors.secondaryText}
          />

          <Text
            style={[
              styles.descriptionText,
              !task.description &&
                styles.descriptionPlaceholder,
            ]}
          >
            {task.description?.trim() ||
              "No description was added to this task."}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.editButton,
            deleting && styles.actionButtonDisabled,
          ]}
          onPress={handleEdit}
          disabled={deleting}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text style={styles.editButtonText}>
            Edit Task
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            (deleting || updating) &&
              styles.actionButtonDisabled,
          ]}
          onPress={handleDeleteTask}
          disabled={deleting || updating}
          activeOpacity={0.8}
        >
          {deleting ? (
            <>
              <ActivityIndicator
                size="small"
                color={Theme.colors.error}
              />

              <Text style={styles.deleteButtonText}>
                Deleting task...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="trash-outline"
                size={20}
                color={Theme.colors.error}
              />

              <Text style={styles.deleteButtonText}>
                Delete Task
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerMessage}>
          One task at a time. You&apos;re doing great.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={Theme.colors.primary}
        />
      </View>

      <View style={styles.detailTextContainer}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: Theme.colors.secondaryText,
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

  simpleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },

  simpleHeaderTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
  },

  iconButton: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 14,
    backgroundColor: Theme.colors.surface,
  },

  headerTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: Theme.colors.text,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Theme.colors.secondaryText,
  },

  scrollContent: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 50,
  },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 20,
    backgroundColor: Theme.colors.surface,
  },

  completionButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: 16,
    backgroundColor: Theme.colors.background,
  },

  completionButtonActive: {
    backgroundColor: Theme.colors.primary,
  },

  taskTitleContainer: {
    flex: 1,
  },

  taskTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    color: Theme.colors.text,
  },

  completedTaskTitle: {
    textDecorationLine: "line-through",
    color: Theme.colors.secondaryText,
  },

  taskStatus: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "600",
    color: Theme.colors.secondaryText,
  },

  successCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 17,
    backgroundColor: Theme.colors.primaryLight,
  },

  successTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  successTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.text,
  },

  successDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: Theme.colors.secondaryText,
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: "800",
    color: Theme.colors.text,
  },

  detailsCard: {
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 19,
    backgroundColor: Theme.colors.surface,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
  },

  detailIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: Theme.colors.primaryLight,
  },

  detailTextContainer: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 12,
    color: Theme.colors.secondaryText,
  },

  detailValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
  },

  descriptionCard: {
    minHeight: 110,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 17,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 19,
    backgroundColor: Theme.colors.surface,
  },

  descriptionText: {
    flex: 1,
    marginLeft: 11,
    fontSize: 14,
    lineHeight: 22,
    color: Theme.colors.text,
  },

  descriptionPlaceholder: {
    color: Theme.colors.secondaryText,
  },

  editButton: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 28,
    borderRadius: 17,
    backgroundColor: Theme.colors.primary,
  },

  editButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  deleteButton: {
    minHeight: 53,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Theme.colors.error,
    borderRadius: 16,
    backgroundColor: Theme.colors.surface,
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.error,
  },

  actionButtonDisabled: {
    opacity: 0.6,
  },

  footerMessage: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    color: Theme.colors.secondaryText,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: Theme.colors.primaryLight,
  },

  errorTitle: {
    marginTop: 17,
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
  },

  errorText: {
    maxWidth: 330,
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: Theme.colors.secondaryText,
  },

  primaryButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 25,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});