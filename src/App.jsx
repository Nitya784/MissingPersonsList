import React, { useState } from "react";
import "./index.css";
import GenerateQR from "./GenerateQR";

function App() {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="app">
      <h1 className="title">📸 Attendance Tracker</h1>

      {!showQR ? (
        <div className="card">
          <h2>👨‍🏫 Admin Panel</h2>
          <button className="btn" onClick={() => setShowQR(true)}>
            Generate QR
          </button>
        </div>
      ) : (
        <GenerateQR />
      )}
    </div>
  );
}

export default App;