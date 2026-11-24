import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
