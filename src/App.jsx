import React from "react";
import "./index.css";

function App() {
  return (
    <div className="app">
      <h1 className="title">📸 Attendance Vibe Tracker</h1>

      <div className="card">
        <h2>👨‍🏫 Admin Panel</h2>
        <button className="btn">Generate QR</button>
        <button className="btn secondary">View Attendance</button>
      </div>

      <div className="card">
        <h2>🎓 Student Panel</h2>
        <button className="btn">Scan QR</button>
        <button className="btn secondary">Manual Entry</button>
      </div>
    </div>
  );
}

export default App;