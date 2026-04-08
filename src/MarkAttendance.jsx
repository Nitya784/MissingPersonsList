import { useState } from "react";
import { database } from "./firebase";
import { ref, push } from "firebase/database";

export default function MarkAttendance() {
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");

  const submitAttendance = () => {
    if (!sessionId || !name) return;

    const attendanceRef = ref(database, "attendance/" + sessionId);

    push(attendanceRef, {
      name,
      time: new Date().toLocaleString(),
    });

    alert("Attendance marked!");
  };

  return (
    <div>
      <h2>Mark Attendance</h2>

      <input placeholder="Session ID" onChange={(e) => setSessionId(e.target.value)} />
      <input placeholder="Your Name" onChange={(e) => setName(e.target.value)} />

      <button onClick={submitAttendance}>Submit</button>
    </div>
  );
}