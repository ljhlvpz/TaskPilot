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

export default function Dashboard() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Temporary sample tasks.
  // We will replace these with Firestore data when we build Task Management.
  const tasks = [
    {
      id: "1",
      title: "Review capstone documentation",
      completed: false,
      priority: "high",
      time: "2:00 PM",
    },
    {
      id: "2",
      title: "Test Firebase authentication",
      completed: true,
      priority: "medium",
      time: "4:00 PM",
    },
    {
      id: "3",
      title: "Plan dashboard interface",
      completed: false,
      priority: "low",
      time: "6:00 PM",
    },
  ];

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

  const completedTasks = tasks.filter((task) => task.completed).length;
  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "high" && !task.completed
  ).length;

  const progress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;

  const navigateToTasks = () => {
    router.push("/(tabs)/tasks");
  };

  const navigateToAssistant = () => {
    router.push("/(tabs)/assistant");
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

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.sectionLabel}>Today&apos;s Progress</Text>

              <Text style={styles.progressText}>
                {completedTasks} of {tasks.length} tasks completed
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
              value={tasks.length}
              label="Tasks Today"
            />

            <View style={styles.summaryDivider} />

            <SummaryItem
              icon="checkmark-circle-outline"
              value={completedTasks}
              label="Completed"
            />

            <View style={styles.summaryDivider} />

            <SummaryItem
              icon="flame-outline"
              value={highPriorityTasks}
              label="High Priority"
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="add-circle-outline"
            label="Add Task"
            onPress={navigateToTasks}
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

        {tasks.length === 0 ? (
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
              onPress={navigateToTasks}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />

              <Text style={styles.emptyButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
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

function TaskItem({ task }) {
  const priorityColor = {
    high: Theme.colors.high,
    medium: Theme.colors.medium,
    low: Theme.colors.low,
  }[task.priority];

  return (
    <TouchableOpacity style={styles.taskCard} activeOpacity={0.75}>
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

            <Text style={styles.taskTime}>{task.time}</Text>
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

  notificationDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Theme.colors.error,
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
});