import QRCode from "react-qr-code";
import { useState } from "react";

export default function GenerateQR() {
  const [sessionId, setSessionId] = useState("");

  const createSession = () => {
    const id = "session-" + Date.now();
    setSessionId(id);
  };

  return (
    <div>
      <h2>Generate Attendance QR</h2>
      <button onClick={createSession}>Generate QR</button>

      {sessionId && (
        <div>
          <p>{sessionId}</p>
          <QRCode value={sessionId} />
        </div>
      )}
    </div>
  );
}