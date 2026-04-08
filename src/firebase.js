import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyByRf0lK-X938sgThv1eNAeFM6fw0Bdwfk",
  authDomain: "bvrit-attendance.firebaseapp.com",
  databaseURL: "https://bvrit-attendance-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bvrit-attendance",
  storageBucket: "bvrit-attendance.firebasestorage.app",
  messagingSenderId: "324718188881",
  appId: "1:324718188881:web:97f75e720f245e9dbe9b70"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };