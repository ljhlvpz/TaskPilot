
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";

import { auth } from "./firebaseConfig";

export const loginWithGoogleCredential = async (idToken) => {
  if (!idToken) {
    throw new Error("Google ID token is required.");
  }

  const credential = GoogleAuthProvider.credential(idToken);

  return signInWithCredential(auth, credential);
};

export const register = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};

export const resetPassword = (email) => {
  return sendPasswordResetEmail(auth, email);
};
