import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "./config";

export const useStore = create(
  persist(
    (set, get) => ({
      // sessions: { id, subjectId, date, code, rotatedAt, closed, markedBy: "admin"|"qr" }
      sessions: [],
      // records: { id, sessionId, username, name, rollNo, markedAt, method }
      records: [],

      openSession: (session) =>
        set(s => ({ sessions: [session, ...s.sessions] })),

      closeSession: (id) =>
        set(s => ({ sessions: s.sessions.map(x => x.id === id ? { ...x, closed: true } : x) })),

      rotateCode: (id) =>
        set(s => ({
          sessions: s.sessions.map(x =>
            x.id === id
              ? { ...x, code: Math.random().toString(36).slice(2,8).toUpperCase() }
              : x
          )
        })),

      markPresent: (record) => {
        const already = get().records.find(
          r => r.sessionId === record.sessionId && r.username === record.username
        );
        if (already) return false;
        set(s => ({ records: [...s.records, { ...record, id: uid(), markedAt: new Date().toISOString() }] }));
        return true;
      },

      // Admin manually overrides — toggle present/absent
      toggleRecord: (sessionId, student) => {
        const existing = get().records.find(
          r => r.sessionId === sessionId && r.username === student.username
        );
        if (existing) {
          set(s => ({ records: s.records.filter(r => !(r.sessionId === sessionId && r.username === student.username)) }));
        } else {
          set(s => ({
            records: [...s.records, {
              id: uid(), sessionId,
              username: student.username,
              name: student.name,
              rollNo: student.rollNo,
              markedAt: new Date().toISOString(),
              method: "manual",
            }]
          }));
        }
      },

      deleteSession: (id) =>
        set(s => ({
          sessions: s.sessions.filter(x => x.id !== id),
          records:  s.records.filter(r => r.sessionId !== id),
        })),
    }),
    {
      name: "attendance-v1",
      merge: (persisted, current) => ({
        ...current,
        sessions: persisted.sessions ?? [],
        records:  persisted.records  ?? [],
      }),
    }
  )
);
