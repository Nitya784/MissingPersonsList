import { useState, useEffect } from "react";
import { ALL_USERS } from "./config";
import { listenSessions, listenRecords } from "./firebase";
import AdminApp from "./AdminApp";
import StudentApp from "./StudentApp";

function Login({ onLogin }) {
  const [u, setU]       = useState("");
  const [p, setP]       = useState("");
  const [err, setErr]   = useState("");
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(false);

  const attempt = () => {
    const user = ALL_USERS.find(x => x.username === u.trim().toLowerCase() && x.password === p);
    if (user) { onLogin(user); }
    else { setErr("Wrong username or password."); setShake(true); setTimeout(() => setShake(false), 400); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20, background:"#09090f", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(61,145,66,.08),transparent 70%)", top:"-10%", left:"50%", transform:"translateX(-50%)", pointerEvents:"none" }}/>
      <div style={{ width:"100%", maxWidth:400, animation:"fadeUp .5s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,#3d9142,#1a5c1e)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px", boxShadow:"0 8px 32px rgba(61,145,66,.35)" }}>✓</div>
          <div style={{ fontSize:32, fontWeight:800, letterSpacing:-1 }}>Attendance</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.25)", marginTop:4, fontFamily:"'DM Mono',monospace", letterSpacing:2 }}>BVRIT HYD · AIML · 2023–27</div>
        </div>
        <div className="card" style={{ padding:32, animation:shake?"shake .4s ease":"none" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:18 }}>
            <div>
              <div className="label" style={{ marginBottom:7 }}>Username</div>
              <input placeholder="your username" value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} autoComplete="username"/>
            </div>
            <div>
              <div className="label" style={{ marginBottom:7 }}>Password</div>
              <div style={{ position:"relative" }}>
                <input type={show?"text":"password"} placeholder="••••••••" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} style={{ paddingRight:46 }} autoComplete="current-password"/>
                <button onClick={()=>setShow(v=>!v)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"rgba(255,255,255,.3)" }}>{show?"🙈":"👁"}</button>
              </div>
            </div>
          </div>
          {err && <div style={{ background:"rgba(220,80,80,.1)", border:"1px solid rgba(220,80,80,.3)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#e05555", fontWeight:600, marginBottom:16 }}>⚠ {err}</div>}
          <button className="btn btn-green" onClick={attempt} style={{ width:"100%", fontSize:15, padding:14 }}>Sign In →</button>
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"rgba(255,255,255,.15)", fontFamily:"'DM Mono',monospace" }}>Students: username + attend2025</div>
      </div>
    </div>
  );
}

// Root — loads all Firebase data once and passes down as props
export default function App() {
  const [user, setUser]         = useState(null);
  const [sessions, setSessions] = useState([]);
  const [records, setRecords]   = useState([]);
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    // Start real-time listeners as soon as app loads
    const unsubS = listenSessions(data => { setSessions(data); setReady(true); });
    const unsubR = listenRecords(data => setRecords(data));
    return () => { unsubS(); unsubR(); };
  }, []);

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:"#09090f", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid rgba(99,179,100,.2)", borderTop:"3px solid #63b364", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <div style={{ color:"rgba(255,255,255,.3)", fontSize:13, fontFamily:"'DM Mono',monospace" }}>Connecting…</div>
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;
  if (user.role === "admin") return <AdminApp user={user} sessions={sessions} records={records} onLogout={() => setUser(null)} />;
  return <StudentApp user={user} sessions={sessions} records={records} onLogout={() => setUser(null)} />;
}
