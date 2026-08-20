import { getFunctions } from "firebase/functions";
// Firebase Core
import { initializeApp } from "firebase/app";

// Firebase Auth
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

// Firestore
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBs563qy44j1woNf2gtd5w0lfFSVj9lH68",
  authDomain: "time-management-app-e3fcf.firebaseapp.com",
  projectId: "time-management-app-e3fcf",
  storageBucket: "time-management-app-e3fcf.firebasestorage.app",
  messagingSenderId: "147193579745",
  appId: "1:147193579745:web:dbf28c72378308e9e84fa0",
};

const app = initializeApp(firebaseConfig);

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);
const functions = getFunctions(app);

export { auth, db, functions };
export default app;
