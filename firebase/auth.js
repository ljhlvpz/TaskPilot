import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";

import { auth } from "./firebaseConfig";
import { stopAllTaskListeners } from "../services/taskListenerRegistry";
import { clearNotificationsForLogout } from "../services/notificationService";

export const loginWithGoogleCredential = async (idToken) => {
  if (!idToken) throw new Error("Google ID token is required.");
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
};

export const register = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const logout = async () => {
  // Stop task snapshots before credentials are revoked by Firebase.
  stopAllTaskListeners();
  try {
    await clearNotificationsForLogout();
  } catch (error) {
    // Never trap a user in their account because Android cleanup failed.
    console.warn("TaskPilot notification cleanup failed:", error);
  }
  return signOut(auth);
};

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
