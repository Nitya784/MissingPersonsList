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
      <h2>Generate QR</h2>
      <button onClick={createSession}>Create QR</button>

      {sessionId && <QRCode value={sessionId} />}
    </div>
  );
}