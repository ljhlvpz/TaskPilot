import {
    createTask,
    deleteTask,
    getTaskById,
    subscribeToUserTasks,
    toggleTaskCompletion,
    updateTask,
} from "../firebase/firestore";


/**
 * Create a new task for the logged-in user.
 */
export const addUserTask = async (uid, taskData) => {
    return createTask(uid, taskData);
};

export const fetchTaskById = async (taskId) => {
    return getTaskById(taskId);
};
/**
 * Listen to all tasks belonging to one user.
 * Returns an unsubscribe function.
 */
export const listenToUserTasks = (uid, onTasksChanged, onError) => {
    return subscribeToUserTasks(uid, onTasksChanged, onError);
};

/**
 * Change a task's completed status.
 */
export const changeTaskCompletion = async (taskId, completed) => {
    return toggleTaskCompletion(taskId, completed);
};

export const editUserTask = async (taskId, updatedTaskData) => {
    return updateTask(taskId, updatedTaskData);
};

export const removeUserTask = async (taskId) => {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  return deleteTask(taskId);
};