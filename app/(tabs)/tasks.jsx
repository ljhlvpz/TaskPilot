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
  listenToUserTasks,
  changeTaskCompletion,
} from "../../services/taskService";

const FILTERS = ["All", "Active", "Completed"];

export default function Tasks() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let unsubscribeTasks = () => {};

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

    try {
      setUpdatingTaskId(task.id);

      await changeTaskCompletion(task.id, !task.completed);
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

  const handleAddTask = () => {
  router.push("/create-task");
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
          <View>
            <Text style={styles.title}>My Tasks</Text>

            <Text style={styles.subtitle}>
              Let&apos;s organize your day, one task at a time.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={handleAddTask}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={25} color="#FFFFFF" />
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
            color={Theme.colors.secondaryText}
          />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search your tasks..."
            placeholderTextColor={Theme.colors.secondaryText}
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
                color={Theme.colors.secondaryText}
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
              color={Theme.colors.primary}
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
                color={Theme.colors.error}
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
                onAddTask={handleAddTask}
              />
            }
          />
        )}

        {!loading && !errorMessage && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleAddTask}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryItem({ icon, value, label }) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons
        name={icon}
        size={21}
        color={Theme.colors.primary}
      />

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TaskCard({ task, updating, onToggle, onOpen }) {
  const priority = task.priority?.toLowerCase() || "medium";

  const priorityColor =
    {
      high: Theme.colors.high || "#EF4444",
      medium: Theme.colors.medium || "#F59E0B",
      low: Theme.colors.low || "#22C55E",
    }[priority] || Theme.colors.primary;

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
            color={task.completed ? "#FFFFFF" : Theme.colors.primary}
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
              color={Theme.colors.secondaryText}
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
        color={Theme.colors.secondaryText}
      />
    </TouchableOpacity>
  );
}

function TaskEmptyState({
  hasTasks,
  searchText,
  selectedFilter,
  onAddTask,
}) {
  const isFiltering =
    searchText.trim().length > 0 || selectedFilter !== "All";

  if (hasTasks && isFiltering) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="search-outline"
            size={42}
            color={Theme.colors.primary}
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
          color={Theme.colors.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>Your task list is ready</Text>

      <Text style={styles.emptyDescription}>
        Every achievement starts with one small task. Add your first one
        when you&apos;re ready.
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        onPress={onAddTask}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />

        <Text style={styles.emptyButtonText}>Add My First Task</Text>
      </TouchableOpacity>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    backgroundColor: Theme.colors.background,
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
    color: Theme.colors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: Theme.colors.secondaryText,
  },

  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primary,
  },

  summaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: "800",
    color: Theme.colors.text,
  },

  summaryLabel: {
    marginTop: 1,
    fontSize: 11,
    color: Theme.colors.secondaryText,
  },

  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: Theme.colors.border,
  },

  searchContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 16,
    backgroundColor: Theme.colors.surface,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginHorizontal: 10,
    fontSize: 15,
    color: Theme.colors.text,
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
    borderColor: Theme.colors.border,
    borderRadius: 30,
    backgroundColor: Theme.colors.surface,
  },

  filterButtonSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: Theme.colors.secondaryText,
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
    borderColor: Theme.colors.border,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
  },

  checkbox: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: 8,
  },

  checkboxCompleted: {
    backgroundColor: Theme.colors.primary,
  },

  taskContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  taskTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: Theme.colors.secondaryText,
  },

  taskDescription: {
    marginTop: 4,
    fontSize: 13,
    color: Theme.colors.secondaryText,
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

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 80,
  },

  loadingText: {
    marginTop: 14,
    color: Theme.colors.secondaryText,
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
    backgroundColor: Theme.colors.primaryLight,
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    color: Theme.colors.text,
  },

  emptyDescription: {
    maxWidth: 310,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: Theme.colors.secondaryText,
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
  },

  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 22,
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    elevation: 7,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    backgroundColor: Theme.colors.primary,
  },
});