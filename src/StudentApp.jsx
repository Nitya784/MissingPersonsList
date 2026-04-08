import { useState } from "react";
import { SUBJECTS, fmtDate, fmtTime } from "./config";
import { markPresent } from "./firebase";
import { playAlert } from "./audio";

function msLeft(iso) { return new Date(iso) - new Date(); }

export default function StudentApp({ user, sessions, records, onLogout }) {
  const [code, setCode]    = useState("");
  const [msg, setMsg]      = useState(null);
  const [loading, setLoad] = useState(false);

  const live    = sessions.filter(s => !s.closed && msLeft(s.expiresAt) > 0);
  const myRecs  = records.filter(r => r.username === user.username)
                         .sort((a,b) => new Date(b.markedAt)-new Date(a.markedAt));

  const showMsg = (text, ok) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),4000); };

  const attempt = async (inputCode) => {
    const c = (inputCode||code).trim().toUpperCase();
    if (!c) { showMsg("Enter the code first!", false); return; }
    const session = sessions.find(s => s.code===c && !s.closed && msLeft(s.expiresAt)>0);
    if (!session) { showMsg("Invalid or expired code — get the latest from your admin.", false); return; }
    setLoad(true);
    const ok = await markPresent({
      sessionId: session.id,
      username:  user.username,
      name:      user.name,
      rollNo:    user.rollNo,
      method:    "qr",
    });
    setLoad(false);
    if (ok) {
      const sub = SUBJECTS.find(s=>s.id===session.subjectId);
      showMsg(`✅ Attendance marked for ${sub?.name}!`, true);
      setCode("");
      try { playAlert("info"); } catch {}
    } else {
      showMsg("Already marked present for this session!", false);
    }
  };

  // per-subject stats
  const stats = SUBJECTS.map(sub => {
    const subSess  = sessions.filter(s=>s.subjectId===sub.id);
    const attended = subSess.filter(s=>records.some(r=>r.sessionId===s.id&&r.username===user.username));
    return { sub, total:subSess.length, attended:attended.length };
  }).filter(x=>x.total>0);

  return (
    <div style={{ minHeight:"100vh", background:"#09090f" }}>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 18px 80px" }}>
        {/* Header */}
        <div className="fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", fontFamily:"'DM Mono',monospace", letterSpacing:3, marginBottom:5 }}>BVRIT HYD · AIML</div>
            <div style={{ fontSize:28, fontWeight:800, letterSpacing:-1 }}>Attendance</div>
            <div className="mono" style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginTop:3 }}>{user.rollNo} · {user.name}</div>
          </div>
          <button onClick={onLogout} className="btn btn-ghost" style={{ padding:"8px 14px", fontSize:12 }}>Logout</button>
        </div>

        {/* Live session banners */}
        {live.length > 0 && (
          <div className="fade-up s1" style={{ marginBottom:16 }}>
            {live.map(s => {
              const sub     = SUBJECTS.find(x=>x.id===s.subjectId);
              const already = records.some(r=>r.sessionId===s.id&&r.username===user.username);
              return (
                <div key={s.id} style={{ background:already?"rgba(99,179,100,.08)":"rgba(99,179,100,.12)", border:`1px solid ${already?"rgba(99,179,100,.2)":"rgba(99,179,100,.35)"}`, borderRadius:16, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#63b364", animation:already?"none":"pulse 1.4s infinite", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{sub?.name} — {sub?.lecturer}</div>
                    <div className="mono" style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                      {already ? "✅ You're marked present" : `Live now · Code: ${s.code}`}
                    </div>
                  </div>
                  {!already && (
                    <button className="btn btn-green" style={{ padding:"8px 16px", fontSize:13 }} onClick={()=>attempt(s.code)} disabled={loading}>
                      {loading?"⟳":"Mark ✓"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Code entry */}
        <div className="card fade-up s2" style={{ padding:24, marginBottom:22 }}>
          <div className="label" style={{ marginBottom:12 }}>ENTER ATTENDANCE CODE</div>
          <div className="mono" style={{ fontSize:12, color:"rgba(255,255,255,.25)", marginBottom:14 }}>
            6-character code shown on admin's screen — changes every 60 seconds
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <input placeholder="e.g. AB3X9Z" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&attempt(code)} maxLength={8} style={{ fontFamily:"'DM Mono',monospace", letterSpacing:5, fontSize:20, fontWeight:700, textAlign:"center" }}/>
            <button className="btn btn-green" onClick={()=>attempt(code)} disabled={loading} style={{ padding:"11px 22px", fontSize:15, flexShrink:0 }}>
              {loading?"⟳":"Go"}
            </button>
          </div>
          {msg && (
            <div style={{ marginTop:14, padding:"11px 16px", borderRadius:12, background:msg.ok?"rgba(99,179,100,.1)":"rgba(220,80,80,.1)", border:`1px solid ${msg.ok?"rgba(99,179,100,.3)":"rgba(220,80,80,.3)"}`, fontSize:14, fontWeight:700, color:msg.ok?"#63b364":"#e05555" }}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Subject-wise stats */}
        {stats.length > 0 && (
          <div className="fade-up s3">
            <div className="label" style={{ marginBottom:14 }}>YOUR ATTENDANCE</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
              {stats.map(({sub,total,attended}) => {
                const pct   = Math.round((attended/total)*100);
                const color = pct>=75?"#63b364":pct>=60?"#f5a623":"#e05555";
                return (
                  <div key={sub.id} className="card" style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{sub.name}</div>
                      <div className="mono" style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>{sub.lecturer} · {attended}/{total} classes</div>
                    </div>
                    <div style={{ width:100, flexShrink:0 }}>
                      <div style={{ height:6, background:"rgba(255,255,255,.07)", borderRadius:99, overflow:"hidden", marginBottom:5 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width 1s ease" }}/>
                      </div>
                      <div style={{ textAlign:"right", fontSize:12, fontWeight:800, color }}>{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent marks */}
        {myRecs.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom:14 }}>RECENT MARKS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {myRecs.slice(0,10).map(r => {
                const sess = sessions.find(s=>s.id===r.sessionId);
                const sub  = SUBJECTS.find(s=>s.id===sess?.subjectId);
                return (
                  <div key={r.id} className="card" style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12, opacity:.8 }}>
                    <span className="chip-present" style={{ flexShrink:0 }}>✓ Present</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub?.name||"Unknown"}</div>
                      <div className="mono" style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>{fmtDate(r.markedAt)} {fmtTime(r.markedAt)} · {r.method}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {live.length===0 && myRecs.length===0 && stats.length===0 && (
          <div className="card" style={{ padding:50, textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
            <div style={{ fontWeight:700, fontSize:18, color:"rgba(255,255,255,.4)" }}>No active sessions</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.2)", marginTop:8 }}>Your admin will start a session when class begins.</div>
          </div>
        )}
      </div>
    </div>
  );
}
