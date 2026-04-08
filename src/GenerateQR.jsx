import { useState } from "react";
import QRCode from "react-qr-code";

export default function GenerateQR() {
  const [sessionId, setSessionId] = useState("");

  const createSession = () => {
    const id = "session-" + Date.now();
    setSessionId(id);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Generate QR</h2>

      <button onClick={createSession}>Create QR</button>

      {sessionId && (
        <div style={{ marginTop: "20px" }}>
          <p>{sessionId}</p>
          <QRCode value={sessionId} size={200} />
        </div>
      )}
    </div>
  );
}