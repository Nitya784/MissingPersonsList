import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { SUBJECTS, STUDENTS, fmtDate, fmtTime, uid } from "./config";
import { createSession, closeSession, rotateCode, deleteSession, toggleRecord, markPresent } from "./firebase";

const ROTATE_SECS = 60;

function msLeft(iso) { return new Date(iso) - new Date(); }
function fmtCountdown(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return "00:00";
  const s = Math.ceil(ms / 1000);
  return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");
}

// ── QR Modal ──────────────────────────────────────────────────────────────────
function QRModal({ sessionId, sessions, records, onClose }) {
  const [secs, setSecs]    = useState(ROTATE_SECS);
  const [cd, setCd]        = useState("");
  const secsRef            = useRef(ROTATE_SECS);

  const session  = sessions.find(s => s.id === sessionId);
  const present  = records.filter(r => r.sessionId === sessionId);

  useEffect(() => {
    const id = setInterval(() => {
      const sess = sessions.find(s => s.id === sessionId);
      if (sess) setCd(fmtCountdown(sess.expiresAt));
      secsRef.current -= 1;
      setSecs(secsRef.current);
      if (secsRef.current <= 0) {
        secsRef.current = ROTATE_SECS;
        setSecs(ROTATE_SECS);
        const newCode = Math.random().toString(36).slice(2,8).toUpperCase();
        rotateCode(sessionId, newCode);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sessionId]);

  if (!session) return null;
  const sub      = SUBJECTS.find(s => s.id === session.subjectId);
  const expired  = msLeft(session.expiresAt) <= 0;
  const payload  = JSON.stringify({ sessionId, code: session.code });
  const rotPct   = ((ROTATE_SECS - secs) / ROTATE_SECS) * 100;
  const circ     = String(2 * Math.PI * 52);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,.9)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="card" style={{ width:"100%", maxWidth:480, borderRadius:24, overflow:"hidden" }}>
        <div style={{ background:"rgba(61,145,66,.12)", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:17 }}>{sub?.name}</div>
            <div className="mono" style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>{sub?.lecturer} · {fmtDate(session.date)}</div>
          </div>
          <button onClick={() => { closeSession(sessionId); onClose(); }} className="btn btn-ghost" style={{ padding:"7px 14px", fontSize:13 }}>Close</button>
        </div>
        <div style={{ padding:28, display:"flex", flexDirection:"column", alignItems:"center", gap:22 }}>
          {/* QR + ring */}
          <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="128" height="128" style={{ position:"absolute", top:-8, left:-8, transform:"rotate(-90deg)", zIndex:1 }}>
              <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5"/>
              <circle cx="64" cy="64" r="52" fill="none" stroke={expired?"#e05555":"#63b364"} strokeWidth="5"
                strokeDasharray={circ} strokeDashoffset={String(parseFloat(circ) * (1 - rotPct / 100))}
                strokeLinecap="round" style={{ transition:"stroke-dashoffset .9s linear" }}/>
            </svg>
            <div style={{ background:"#fff", padding:14, borderRadius:14, opacity:expired?.3:1, filter:expired?"grayscale(1) blur(1px)":"none", boxShadow:expired?"none":"0 0 40px rgba(99,179,100,.25)" }}>
              <QRCode value={payload} size={172}/>
            </div>
          </div>

          <div style={{ display:"flex", gap:24, alignItems:"center", textAlign:"center", flexWrap:"wrap", justifyContent:"center" }}>
            <div>
              <div className="label" style={{ marginBottom:5 }}>Rotates in</div>
              <div className="mono" style={{ fontSize:26, fontWeight:800, color:secs<=10?"#e05555":"#63b364" }}>{String(secs).padStart(2,"0")}s</div>
            </div>
            <div style={{ width:1, height:36, background:"rgba(255,255,255,.08)" }}/>
            <div>
              <div className="label" style={{ marginBottom:5 }}>Current code</div>
              <div className="mono" style={{ fontSize:24, fontWeight:800, letterSpacing:6, color:"#eee" }}>{session.code}</div>
            </div>
            <div style={{ width:1, height:36, background:"rgba(255,255,255,.08)" }}/>
            <div>
              <div className="label" style={{ marginBottom:5 }}>Session ends</div>
              <div className="mono" style={{ fontSize:22, fontWeight:800, color:expired?"#e05555":"#63b364" }}>{expired?"Expired":cd}</div>
            </div>
          </div>

          <div style={{ width:"100%", background:"rgba(99,179,100,.07)", border:"1px solid rgba(99,179,100,.2)", borderRadius:14, padding:"14px 18px" }}>
            <div className="label" style={{ marginBottom:10 }}>Present — {present.length} / {STUDENTS.length}</div>
            {present.length === 0
              ? <div style={{ color:"rgba(255,255,255,.2)", fontSize:13 }}>Waiting for students…</div>
              : <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {present.map(r => <span key={r.id} className="chip-present">{r.rollNo} {r.name.split(" ")[0]}</span>)}
                </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Roll Call ─────────────────────────────────────────────────────────────────
function RollCall({ sessionId, sessions, records, onDone }) {
  const session   = sessions.find(s => s.id === sessionId);
  const sub       = SUBJECTS.find(s => s.id === session?.subjectId);
  const present   = new Set(records.filter(r => r.sessionId === sessionId).map(r => r.username));
  const [saving, setSaving] = useState(false);

  const toggle = async (st) => { await toggleRecord(sessionId, st); };
  const markAll = async () => {
    setSaving(true);
    for (const st of STUDENTS) { if (!present.has(st.username)) await toggle(st); }
    setSaving(false);
  };
  const clearAll = async () => {
    setSaving(true);
    for (const st of STUDENTS) { if (present.has(st.username)) await toggle(st); }
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:998, background:"rgba(0,0,0,.9)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div className="card" style={{ width:"100%", maxWidth:600, borderRadius:24, overflow:"hidden" }}>
        <div style={{ background:"rgba(255,255,255,.04)", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:17 }}>Manual Roll Call</div>
            <div className="mono" style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>{sub?.name} · {sub?.lecturer}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:13, color:"#63b364", fontWeight:700 }}>{present.size}/{STUDENTS.length}</span>
            <button onClick={onDone} className="btn btn-green" style={{ padding:"8px 18px", fontSize:13 }}>Done ✓</button>
          </div>
        </div>
        <div style={{ padding:20, maxHeight:"70vh", overflowY:"auto" }}>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <button className="btn btn-ghost" style={{ fontSize:12, padding:"7px 14px" }} onClick={markAll} disabled={saving}>✓ Mark All Present</button>
            <button className="btn btn-ghost" style={{ fontSize:12, padding:"7px 14px" }} onClick={clearAll} disabled={saving}>✗ Clear All</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {STUDENTS.map(st => {
              const isP = present.has(st.username);
              return (
                <button key={st.username} onClick={() => toggle(st)} disabled={saving}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:12, cursor:"pointer", textAlign:"left", background:isP?"rgba(99,179,100,.12)":"rgba(255,255,255,.03)", border:`1px solid ${isP?"rgba(99,179,100,.3)":"rgba(255,255,255,.07)"}`, transition:"all .15s" }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:isP?"rgba(99,179,100,.25)":"rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:isP?"#63b364":"rgba(255,255,255,.3)", flexShrink:0 }}>
                    {isP?"✓":st.name[0]}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:isP?"#eee":"rgba(255,255,255,.5)" }}>{st.name}</div>
                    <div className="mono" style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>{st.rollNo}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Report ────────────────────────────────────────────────────────────────────
function ReportScreen({ sessionId, sessions, records, onClose }) {
  const session  = sessions.find(s => s.id === sessionId);
  const sub      = SUBJECTS.find(s => s.id === session?.subjectId);
  const present  = records.filter(r => r.sessionId === sessionId);
  const presentSet = new Set(present.map(r => r.username));
  const absent   = STUDENTS.filter(st => !presentSet.has(st.username));
  if (!session || !sub) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:997, background:"rgba(0,0,0,.92)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ width:"100%", maxWidth:640 }}>
        <div className="card" style={{ borderRadius:24, overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(135deg,rgba(61,145,66,.2),rgba(61,145,66,.05))", borderBottom:"1px solid rgba(99,179,100,.2)", padding:"22px 26px" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontFamily:"'DM Mono',monospace", letterSpacing:2, marginBottom:6 }}>ATTENDANCE REPORT</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{sub.name}</div>
            <div style={{ fontSize:14, color:"rgba(255,255,255,.5)", marginTop:4 }}>{sub.lecturer} · {fmtDate(session.date)} · {fmtTime(session.date)}</div>
          </div>
          <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            {[
              { label:"Total",   val:STUDENTS.length, color:"rgba(255,255,255,.7)" },
              { label:"Present", val:present.length,  color:"#63b364" },
              { label:"Absent",  val:absent.length,   color:"#e05555" },
              { label:"Percent", val:Math.round(present.length/STUDENTS.length*100)+"%", color:present.length/STUDENTS.length>=.75?"#63b364":"#e05555" },
            ].map(x => (
              <div key={x.label} style={{ flex:1, padding:"18px 22px", borderRight:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize:28, fontWeight:900, color:x.color }}>{x.val}</div>
                <div className="label" style={{ marginTop:4 }}>{x.label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"20px 26px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            <div className="label" style={{ marginBottom:12 }}>Present ({present.length})</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {present.length === 0
                ? <span style={{ color:"rgba(255,255,255,.2)", fontSize:13 }}>None</span>
                : present.sort((a,b)=>a.rollNo.localeCompare(b.rollNo)).map(r => <span key={r.id} className="chip-present">{r.rollNo} — {r.name}</span>)}
            </div>
          </div>
          <div style={{ padding:"20px 26px" }}>
            <div className="label" style={{ marginBottom:12 }}>Absent ({absent.length})</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {absent.length === 0
                ? <span style={{ color:"rgba(255,255,255,.2)", fontSize:13 }}>None — full attendance! 🎉</span>
                : absent.map(st => <span key={st.username} className="chip-absent">{st.rollNo} — {st.name}</span>)}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:14 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex:1 }}>← Back</button>
          <button className="btn btn-green" style={{ flex:2 }} onClick={() => {
            const rows = [
              `ATTENDANCE REPORT — ${sub.name}`,
              `Lecturer: ${sub.lecturer}`,
              `Date: ${fmtDate(session.date)}  Time: ${fmtTime(session.date)}`,
              `Total: ${STUDENTS.length}  Present: ${present.length}  Absent: ${absent.length}  (${Math.round(present.length/STUDENTS.length*100)}%)`,
              "",
              "PRESENT:",
              ...present.sort((a,b)=>a.rollNo.localeCompare(b.rollNo)).map(r=>`${r.rollNo}  ${r.name}  [${r.method||"qr"}  ${fmtTime(r.markedAt)}]`),
              "",
              "ABSENT:",
              ...absent.map(st=>`${st.rollNo}  ${st.name}`),
            ].join("\n");
            const a = document.createElement("a");
            a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(rows);
            a.download = `attendance_${sub.id}_${fmtDate(session.date).replace(/ /g,"_")}.txt`;
            a.click();
          }}>⬇ Download Report</button>
        </div>
        <div style={{ textAlign:"center", marginTop:10, fontSize:12, color:"rgba(255,255,255,.2)", fontFamily:"'DM Mono',monospace" }}>Screenshot this to send to the lecturer</div>
      </div>
    </div>
  );
}

// ── Admin App ─────────────────────────────────────────────────────────────────
export default function AdminApp({ user, sessions, records, onLogout }) {
  const [view, setView]         = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [subject, setSubject]   = useState(SUBJECTS[0].id);
  const [ttlMin, setTtlMin]     = useState(5);

  const start = async (mode) => {
    const id = uid();
    await createSession({
      id,
      subjectId:  subject,
      date:       new Date().toISOString(),
      code:       Math.random().toString(36).slice(2,8).toUpperCase(),
      expiresAt:  new Date(Date.now() + ttlMin * 60 * 1000).toISOString(),
      closed:     false,
    });
    setActiveId(id);
    setView(mode);
  };

  const sorted = [...sessions].sort((a,b) => new Date(b.date)-new Date(a.date));

  return (
    <div style={{ minHeight:"100vh", background:"#09090f" }}>
      {view==="qr"       && <QRModal       sessionId={activeId} sessions={sessions} records={records} onClose={()=>setView("home")}/>}
      {view==="rollcall" && <RollCall      sessionId={activeId} sessions={sessions} records={records} onDone={()=>setView("report")}/>}
      {view==="report"   && <ReportScreen  sessionId={activeId} sessions={sessions} records={records} onClose={()=>setView("home")}/>}

      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 18px 80px" }}>
        <div className="fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", fontFamily:"'DM Mono',monospace", letterSpacing:3, marginBottom:5 }}>BVRIT HYD · AIML</div>
            <div style={{ fontSize:28, fontWeight:800, letterSpacing:-1 }}>Attendance</div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ background:"rgba(61,145,66,.12)", border:"1px solid rgba(61,145,66,.2)", borderRadius:12, padding:"8px 14px", fontSize:13, fontWeight:700, color:"#63b364" }}>⚡ {user.name}</div>
            <button onClick={onLogout} className="btn btn-ghost" style={{ padding:"8px 14px", fontSize:12 }}>Logout</button>
          </div>
        </div>

        {/* New session */}
        <div className="card fade-up s1" style={{ padding:24, marginBottom:22 }}>
          <div className="label" style={{ marginBottom:16 }}>START NEW SESSION</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16 }}>
            <div style={{ flex:2, minWidth:200 }}>
              <div className="label" style={{ marginBottom:7 }}>Subject</div>
              <select value={subject} onChange={e=>setSubject(e.target.value)}>
                {SUBJECTS.map(s=><option key={s.id} value={s.id}>{s.name} — {s.lecturer}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:130 }}>
              <div className="label" style={{ marginBottom:7 }}>QR valid for</div>
              <select value={ttlMin} onChange={e=>setTtlMin(+e.target.value)}>
                {[2,5,10,15,30].map(m=><option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-green" style={{ flex:1, padding:13 }} onClick={()=>start("qr")}>📱 QR Code Mode</button>
            <button className="btn" style={{ flex:1, padding:13, background:"rgba(255,255,255,.07)", color:"#eee", border:"1px solid rgba(255,255,255,.12)" }} onClick={()=>start("rollcall")}>📋 Manual Roll Call</button>
          </div>
        </div>

        {/* History */}
        <div className="fade-up s2">
          <div className="label" style={{ marginBottom:14 }}>SESSION HISTORY</div>
          {sorted.length === 0 && <div className="card" style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.2)" }}>No sessions yet.</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {sorted.map(s => {
              const sub    = SUBJECTS.find(x=>x.id===s.subjectId);
              const pCount = records.filter(r=>r.sessionId===s.id).length;
              const live   = !s.closed && msLeft(s.expiresAt) > 0;
              return (
                <div key={s.id} className="card" style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:44, height:44, borderRadius:13, background:"rgba(61,145,66,.12)", border:"1px solid rgba(99,179,100,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>✓</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub?.name}</div>
                    <div className="mono" style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>{sub?.lecturer} · {fmtDate(s.date)} {fmtTime(s.date)} · {pCount}/{STUDENTS.length} present</div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                    {live && <span style={{ fontSize:10, background:"rgba(99,179,100,.15)", color:"#63b364", border:"1px solid rgba(99,179,100,.3)", borderRadius:6, padding:"2px 8px", fontWeight:800 }}>LIVE</span>}
                    <button className="btn btn-ghost" style={{ padding:"7px 14px", fontSize:12 }} onClick={()=>{setActiveId(s.id);setView("report");}}>View Report</button>
                    <button onClick={()=>deleteSession(s.id)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.2)", cursor:"pointer", fontSize:16, padding:4, borderRadius:6, transition:"color .2s" }} onMouseOver={e=>e.currentTarget.style.color="#e05555"} onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,.2)"}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
