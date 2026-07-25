import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebaseConfig";


export const getTaskById = async (taskId) => {
  if (!taskId) {
    throw new Error("A task ID is required.");
  }

  const taskReference = doc(db, "tasks", taskId);
  const taskSnapshot = await getDoc(taskReference);

  if (!taskSnapshot.exists()) {
    return null;
  }

  return {
    id: taskSnapshot.id,
    ...taskSnapshot.data(),
  };
};

// Create User Profile
export const createUserProfile = async (uid, data) => {
  return setDoc(doc(db, "users", uid), data);
};


// Get User Profile
export const getUserProfile = async (uid) => {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data();
  }

  return null;
};

// Create a new task
export const createTask = async (uid, taskData) => {
  if (!uid) {
    throw new Error("User ID is required.");
  }

  const tasksRef = collection(db, "tasks");

  const newTask = {
    userId: uid,
    title: taskData.title.trim(),
    description: taskData.description?.trim() || "",
    category: taskData.category || "Personal",
    priority: taskData.priority || "medium",
    dueDate: taskData.dueDate || null,
    dueTime: taskData.dueTime || null,
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const taskDocument = await addDoc(tasksRef, newTask);

  return taskDocument.id;
};

// Listen to the logged-in user's tasks
export const subscribeToUserTasks = (uid, onTasksChanged, onError) => {
  if (!uid) {
    onTasksChanged([]);
    return () => { };
  }

  const tasksQuery = query(
    collection(db, "tasks"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      const tasks = snapshot.docs.map((taskDocument) => ({
        id: taskDocument.id,
        ...taskDocument.data(),
      }));

      onTasksChanged(tasks);
    },
    (error) => {
      console.error("Task listener error:", error);

      if (onError) {
        onError(error);
      }
    }
  );
};

// Update an existing task
export const updateTask = async (taskId, updates) => {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const taskRef = doc(db, "tasks", taskId);

  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Mark a task completed or incomplete
export const toggleTaskCompletion = async (taskId, completed) => {
  return updateTask(taskId, {
    completed,
  });
};

// Delete a task
export const deleteTask = async (taskId) => {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  await deleteDoc(doc(db, "tasks", taskId));
};