import { useEffect, useState } from "react";
import { database } from "./firebase";
import { ref, onValue } from "firebase/database";

export default function ViewAttendance({ sessionId }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const attendanceRef = ref(database, "attendance/" + sessionId);

    onValue(attendanceRef, (snapshot) => {
      const val = snapshot.val();
      setData(val ? Object.values(val) : []);
    });
  }, [sessionId]);

  return (
    <div>
      <h2>Attendance List</h2>
      {data.map((item, i) => (
        <p key={i}>{item.name} - {item.time}</p>
      ))}
    </div>
  );
}