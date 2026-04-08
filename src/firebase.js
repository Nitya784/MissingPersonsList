// ─── PASTE YOUR FIREBASE CONFIG HERE ─────────────────────────────────────────
// Go to: console.firebase.google.com → your project → Project Settings → Your Apps → Web App
// Copy the firebaseConfig object and replace below

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue, remove, update, get } from "firebase/database";

const firebaseConfig = {
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByRf0lK-X938sgThv1eNAeFM6fwOBdwfk",
  authDomain: "bvrit-attendance.firebaseapp.com",
  databaseURL: "https://bvrit-attendance-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bvrit-attendance",
  storageBucket: "bvrit-attendance.firebasestorage.app",
  messagingSenderId: "324718188881",
  appId: "1:324718188881:web:97f75e720f245e9dbe9b70"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ─── DB HELPERS ───────────────────────────────────────────────────────────────

// Sessions
export async function createSession(session) {
  await set(ref(db, `sessions/${session.id}`), session);
}

export async function closeSession(id) {
  await update(ref(db, `sessions/${id}`), { closed: true });
}

export async function rotateCode(id, newCode) {
  await update(ref(db, `sessions/${id}`), { code: newCode });
}

export async function deleteSession(id) {
  await remove(ref(db, `sessions/${id}`));
  // also remove all records for this session
  const snap = await get(ref(db, "records"));
  if (snap.exists()) {
    const all = snap.val();
    const toDelete = Object.entries(all)
      .filter(([, v]) => v.sessionId === id)
      .map(([k]) => k);
    await Promise.all(toDelete.map(k => remove(ref(db, `records/${k}`))));
  }
}

export async function markPresent(record) {
  // check duplicate first
  const snap = await get(ref(db, "records"));
  if (snap.exists()) {
    const existing = Object.values(snap.val()).find(
      r => r.sessionId === record.sessionId && r.username === record.username
    );
    if (existing) return false;
  }
  const newRef = push(ref(db, "records"));
  await set(newRef, { ...record, id: newRef.key, markedAt: new Date().toISOString() });
  return true;
}

export async function toggleRecord(sessionId, student) {
  const snap = await get(ref(db, "records"));
  if (snap.exists()) {
    const entries = Object.entries(snap.val());
    const existing = entries.find(([, v]) => v.sessionId === sessionId && v.username === student.username);
    if (existing) {
      await remove(ref(db, `records/${existing[0]}`));
      return;
    }
  }
  const newRef = push(ref(db, "records"));
  await set(newRef, {
    id:        newRef.key,
    sessionId,
    username:  student.username,
    name:      student.name,
    rollNo:    student.rollNo,
    method:    "manual",
    markedAt:  new Date().toISOString(),
  });
}

// Real-time listeners
export function listenSessions(callback) {
  const r = ref(db, "sessions");
  return onValue(r, snap => {
    const val = snap.val() || {};
    callback(Object.values(val));
  });
}

export function listenRecords(callback) {
  const r = ref(db, "records");
  return onValue(r, snap => {
    const val = snap.val() || {};
    callback(Object.values(val));
  });
}
