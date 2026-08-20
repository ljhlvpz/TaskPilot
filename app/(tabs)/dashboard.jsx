import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ScreenContainer from "../../components/ScreenContainer";
import { Theme } from "../../constants/theme";
import { auth } from "../../firebase/firebaseConfig";
import { getUserProfile } from "../../firebase/firestore";
import { listenToUserTasks } from "../../services/taskService";

export default function Dashboard() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setLoadingProfile(false);
          return;
        }

        const profile = await getUserProfile(currentUser.uid);

        if (profile?.fullName) {
          setFullName(profile.fullName);
        } else if (currentUser.displayName) {
          setFullName(currentUser.displayName);
        } else if (currentUser.email) {
          setFullName(currentUser.email.split("@")[0]);
        }
      } catch (error) {
        console.error("Dashboard profile error:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }

    setLoadingTasks(true);

    const unsubscribe = listenToUserTasks(
      currentUser.uid,
      (receivedTasks) => {
        setTasks(receivedTasks);
        setLoadingTasks(false);
      },
      (error) => {
        console.error("Dashboard task listener error:", error);
        setLoadingTasks(false);
      }
    );

    return unsubscribe;
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good Morning";
    }

    if (hour < 18) {
      return "Good Afternoon";
    }

    return "Good Evening";
  }, []);

  const firstName = fullName.trim().split(" ")[0] || "User";

  const today = useMemo(() => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const todayTasks = useMemo(() => {
    return tasks.filter(
      (task) => task.dueDate === today
    );
  }, [tasks, today]);

  const completedToday = useMemo(() => {
    return todayTasks.filter(
      (task) => task.completed
    ).length;
  }, [todayTasks]);

  const pendingToday = useMemo(() => {
    return todayTasks.filter(
      (task) => !task.completed
    ).length;
  }, [todayTasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        !task.completed &&
        task.dueDate &&
        task.dueDate < today
    );
  }, [tasks, today]);
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          !task.completed &&
          task.dueDate &&
          task.dueDate > today
      )
      .sort((a, b) => {
        if (a.dueDate !== b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }

        return (a.dueTime || "").localeCompare(
          b.dueTime || ""
        );
      })
      .slice(0, 3);
  }, [tasks, today]);

  const progress =
    todayTasks.length > 0
      ? Math.round(
        (completedToday / todayTasks.length) * 100
      )
      : 0;

  const navigateToTasks = () => {
    router.push("/(tabs)/tasks");
  };

  const navigateToAssistant = () => {
    router.push("/(tabs)/assistant");
  };
  const navigateToCreateTask = () => {
    router.push("/create-task");
  };
  const formatUpcomingDate = (dateString) => {
    if (!dateString) {
      return "No date";
    }

    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    const date = new Date(
      year,
      month - 1,
      day
    );

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            {loadingProfile ? (
              <ActivityIndicator size="small" color={Theme.colors.primary} />
            ) : (
              <>
                <Text style={styles.greeting}>
                  {greeting}, {firstName} 👋
                </Text>

                <Text style={styles.headerSubtitle}>
                  Let&apos;s make today productive.
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.75}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={Theme.colors.text}
            />


          </TouchableOpacity>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.sectionLabel}>Today&apos;s Progress</Text>

              <Text style={styles.progressText}>
                {completedToday} of {todayTasks.length} tasks completed today
              </Text>
            </View>

            <Text style={styles.progressPercentage}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <View style={styles.summaryRow}>
            <SummaryItem
              icon="list-outline"
              value={todayTasks.length}
              label="Tasks Today"
            />

            <View style={styles.summaryDivider} />

            <SummaryItem
              icon="checkmark-circle-outline"
              value={completedToday}
              label="Completed"
            />

            <View style={styles.summaryDivider} />

            <SummaryItem
              icon="time-outline"
              value={pendingToday}
              label="Pending"
            />
          </View>
        </View>
        {overdueTasks.length > 0 && (
          <TouchableOpacity
            style={styles.overdueCard}
            activeOpacity={0.75}
            onPress={navigateToTasks}
          >
            <View style={styles.overdueIcon}>
              <Ionicons
                name="warning-outline"
                size={22}
                color={Theme.colors.error}
              />
            </View>

            <View style={styles.overdueContent}>
              <Text style={styles.overdueTitle}>
                {overdueTasks.length === 1
                  ? "1 overdue task"
                  : `${overdueTasks.length} overdue tasks`}
              </Text>

              <Text style={styles.overdueText}>
                Some tasks have passed their due date. Tap to review them.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={Theme.colors.secondaryText}
            />
          </TouchableOpacity>
        )}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="add-circle-outline"
            label="Add Task"
            onPress={navigateToCreateTask}
          />

          <QuickAction
            icon="mic-outline"
            label="Voice Task"
            onPress={navigateToAssistant}
          />

          <QuickAction
            icon="sparkles-outline"
            label="AI Assistant"
            onPress={navigateToAssistant}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>

          <TouchableOpacity onPress={navigateToTasks}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loadingTasks ? (
          <View style={styles.loadingTasksContainer}>
            <ActivityIndicator
              size="small"
              color={Theme.colors.primary}
            />

            <Text style={styles.loadingTasksText}>
              Loading today's tasks...
            </Text>
          </View>
        ) : todayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={48}
              color={Theme.colors.secondaryText}
            />

            <Text style={styles.emptyTitle}>No tasks for today</Text>

            <Text style={styles.emptyText}>
              Add your first task and start organizing your day.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={navigateToCreateTask}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />

              <Text style={styles.emptyButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.taskList}>
            {todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() =>
                  router.push(`/task/${task.id}`)
                }
              />
            ))}
          </View>
        )}


        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Upcoming Tasks
          </Text>

          <TouchableOpacity onPress={navigateToTasks}>
            <Text style={styles.viewAllText}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {loadingTasks ? (
          <View style={styles.loadingTasksContainer}>
            <ActivityIndicator
              size="small"
              color={Theme.colors.primary}
            />

            <Text style={styles.loadingTasksText}>
              Loading upcoming tasks...
            </Text>
          </View>
        ) : upcomingTasks.length === 0 ? (
          <View style={styles.upcomingEmpty}>
            <Ionicons
              name="calendar-outline"
              size={28}
              color={Theme.colors.secondaryText}
            />

            <Text style={styles.upcomingEmptyTitle}>
              Nothing upcoming
            </Text>

            <Text style={styles.upcomingEmptyText}>
              Future tasks will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.upcomingList}>
            {upcomingTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.upcomingCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push(`/task/${task.id}`)
                }
              >
                <View style={styles.upcomingDateBox}>
                  <Text style={styles.upcomingDateText}>
                    {formatUpcomingDate(
                      task.dueDate
                    )}
                  </Text>
                </View>

                <View style={styles.upcomingContent}>
                  <Text
                    style={styles.upcomingTitle}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>

                  <View style={styles.upcomingMeta}>
                    {!!task.dueTime && (
                      <View
                        style={styles.upcomingMetaItem}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={
                            Theme.colors.secondaryText
                          }
                        />

                        <Text
                          style={styles.upcomingMetaText}
                        >
                          {task.dueTime}
                        </Text>
                      </View>
                    )}

                    <View
                      style={styles.upcomingMetaItem}
                    >
                      <Ionicons
                        name="flag-outline"
                        size={14}
                        color={
                          Theme.colors.secondaryText
                        }
                      />

                      <Text
                        style={[
                          styles.upcomingMetaText,
                          {
                            textTransform:
                              "capitalize",
                          },
                        ]}
                      >
                        {task.priority || "medium"}
                      </Text>
                    </View>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={Theme.colors.secondaryText}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>

  );
}

function SummaryItem({ icon, value, label }) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons
        name={icon}
        size={22}
        color={Theme.colors.primary}
      />

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons
          name={icon}
          size={25}
          color={Theme.colors.primary}
        />
      </View>

      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TaskItem({ task, onPress }) {
  const priorityColor = {
    high: Theme.colors.high,
    medium: Theme.colors.medium,
    low: Theme.colors.low,
  }[task.priority];

  return (
    <TouchableOpacity
      style={styles.taskCard}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View
        style={[
          styles.checkbox,
          task.completed && styles.checkboxCompleted,
        ]}
      >
        {task.completed && (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        )}
      </View>

      <View style={styles.taskContent}>
        <Text
          style={[
            styles.taskTitle,
            task.completed && styles.taskTitleCompleted,
          ]}
        >
          {task.title}
        </Text>

        <View style={styles.taskDetails}>
          <View style={styles.taskTimeContainer}>
            <Ionicons
              name="time-outline"
              size={15}
              color={Theme.colors.secondaryText}
            />

            <Text style={styles.taskTime}>
              {task.dueTime || "No time set"}
            </Text>
          </View>

          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: `${priorityColor}20`,
              },
            ]}
          >
            <View
              style={[
                styles.priorityDot,
                {
                  backgroundColor: priorityColor,
                },
              ]}
            />

            <Text
              style={[
                styles.priorityText,
                {
                  color: priorityColor,
                },
              ]}
            >
              {task.priority}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={Theme.colors.secondaryText}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  upcomingList: {
    gap: 10,
  },

  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
  },

  upcomingDateBox: {
    minWidth: 58,
    paddingHorizontal: 8,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Theme.colors.primaryLight,
  },

  upcomingDateText: {
    fontSize: 12,
    fontWeight: "800",
    color: Theme.colors.primary,
  },

  upcomingContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  upcomingTitle: {
    fontSize: Theme.fonts.body,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  upcomingMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 6,
  },

  upcomingMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  upcomingMetaText: {
    fontSize: 11,
    color: Theme.colors.secondaryText,
  },

  upcomingEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
  },

  upcomingEmptyTitle: {
    marginTop: 8,
    fontSize: Theme.fonts.body,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  upcomingEmptyText: {
    marginTop: 4,
    fontSize: Theme.fonts.caption,
    color: Theme.colors.secondaryText,
  },

  overdueCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 15,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.error,
  },

  overdueIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: `${Theme.colors.error}15`,
  },

  overdueContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  overdueTitle: {
    fontSize: Theme.fonts.body,
    fontWeight: "700",
    color: Theme.colors.error,
  },

  overdueText: {
    marginTop: 3,
    fontSize: Theme.fonts.caption,
    lineHeight: 17,
    color: Theme.colors.secondaryText,
  },
  container: {
    width: "100%",
    maxWidth: 550,
    alignSelf: "center",
    paddingBottom: 32,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  greetingContainer: {
    flex: 1,
  },

  greeting: {
    fontSize: Theme.fonts.title,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: Theme.fonts.body,
    color: Theme.colors.secondaryText,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },


  progressCard: {
    padding: 20,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  sectionLabel: {
    fontSize: Theme.fonts.subtitle,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  progressText: {
    marginTop: 5,
    color: Theme.colors.secondaryText,
    fontSize: Theme.fonts.caption,
  },

  progressPercentage: {
    fontSize: 22,
    fontWeight: "800",
    color: Theme.colors.primary,
  },

  progressTrack: {
    height: 9,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Theme.colors.primaryLight,
    marginTop: 18,
    marginBottom: 22,
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  summaryLabel: {
    marginTop: 2,
    fontSize: 11,
    textAlign: "center",
    color: Theme.colors.secondaryText,
  },

  summaryDivider: {
    width: 1,
    height: 46,
    backgroundColor: Theme.colors.border,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: Theme.fonts.subtitle,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  viewAllText: {
    fontWeight: "600",
    color: Theme.colors.primary,
  },

  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
  },

  quickAction: {
    flex: 1,
    minHeight: 104,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  quickActionIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: Theme.colors.primaryLight,
  },

  quickActionLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: Theme.colors.text,
  },

  taskList: {
    gap: 12,
  },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },

  checkboxCompleted: {
    backgroundColor: Theme.colors.primary,
  },

  taskContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  taskTitle: {
    fontSize: Theme.fonts.body,
    fontWeight: "600",
    color: Theme.colors.text,
  },

  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: Theme.colors.secondaryText,
  },

  taskDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    gap: 12,
  },

  taskTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  taskTime: {
    fontSize: 12,
    color: Theme.colors.secondaryText,
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

  emptyState: {
    alignItems: "center",
    paddingVertical: 38,
    paddingHorizontal: 20,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: Theme.fonts.subtitle,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  emptyText: {
    maxWidth: 280,
    marginTop: 7,
    textAlign: "center",
    lineHeight: 20,
    color: Theme.colors.secondaryText,
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
  },

  emptyButtonText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingTasksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 28,
  },

  loadingTasksText: {
    fontSize: Theme.fonts.body,
    color: Theme.colors.secondaryText,
  },
});