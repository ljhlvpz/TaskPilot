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

// Update User Profile
export const updateUserProfile = async (uid, data) => {
  if (!uid) {
    throw new Error("User ID is required.");
  }

  return setDoc(
    doc(db, "users", uid),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
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

  // Save the machine-learning inputs to Firebase
  ...(Number.isInteger(Number(taskData.importance)) &&
  Number(taskData.importance) >= 1 &&
  Number(taskData.importance) <= 5
    ? { importance: Number(taskData.importance) }
    : {}),

  ...(Number.isFinite(Number(taskData.estimatedMinutes)) &&
  Number(taskData.estimatedMinutes) > 0 &&
  taskData.estimatedMinutes != null
    ? { estimatedMinutes: Number(taskData.estimatedMinutes) }
    : {}),

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

// Create a new note
export const createNote = async (uid, noteData) => {
  if (!uid) {
    throw new Error("User ID is required.");
  }

  const notesRef = collection(db, "notes");

  const newNote = {
    userId: uid,
    title: noteData.title?.trim() || "Untitled Note",
    content: noteData.content?.trim() || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const noteDocument = await addDoc(notesRef, newNote);

  return noteDocument.id;
};


// Listen to the logged-in user's notes
export const subscribeToUserNotes = (uid, onNotesChanged, onError) => {
  if (!uid) {
    onNotesChanged([]);
    return () => {};
  }

  const notesQuery = query(
    collection(db, "notes"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    notesQuery,
    (snapshot) => {
      const notes = snapshot.docs.map((noteDocument) => ({
        id: noteDocument.id,
        ...noteDocument.data(),
      }));

      onNotesChanged(notes);
    },
    (error) => {
      console.error("Note listener error:", error);

      if (onError) {
        onError(error);
      }
    }
  );
};


// Update an existing note
export const updateNote = async (noteId, updates) => {
  if (!noteId) {
    throw new Error("Note ID is required.");
  }

  const noteRef = doc(db, "notes", noteId);

  await updateDoc(noteRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};


// Delete a note
export const deleteNote = async (noteId) => {
  if (!noteId) {
    throw new Error("Note ID is required.");
  }

  await deleteDoc(doc(db, "notes", noteId));
};