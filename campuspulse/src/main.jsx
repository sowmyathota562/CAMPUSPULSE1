import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = "http://localhost:3001/complaints";
const CACHE_KEY = "campuspulse-cache-v2";

const PALETTES = {
  sky: ["Sky Blue", "#45aeea", "#187fc0", "#e7f5fd"],
  lavender: ["Lavender", "#9b8de8", "#6e5ac8", "#f0edff"],
  maroon: ["Maroon", "#9b3e55", "#76253b", "#faedf1"],
  mint: ["Mint", "#39b98a", "#188364", "#e7faf4"],
  coral: ["Coral", "#ef7f72", "#c9564a", "#fff0ee"],
  amber: ["Amber", "#e6a21a", "#a66d00", "#fff6df"],
  violet: ["Violet", "#8a6de8", "#6244bf", "#f1edff"],
  teal: ["Teal", "#2aa9a0", "#177b75", "#e7f8f7"],
  rose: ["Rose", "#e477a1", "#b74d78", "#fff0f6"],
  indigo: ["Indigo", "#6175dc", "#3e52bb", "#eef0ff"],
  orange: ["Orange", "#ed8b3a", "#b95d16", "#fff2e6"],
  forest: ["Forest", "#4d9b5d", "#2f713e", "#eaf7ec"]
};

function getStudentAccounts() {
  try { return JSON.parse(localStorage.getItem("campuspulse-student-accounts") || "{}"); } catch { return {}; }
}
function getAdminAccount() {
  try {
    const account = JSON.parse(localStorage.getItem("campuspulse-admin-account") || "null");
    if (account && String(account.username || "").toUpperCase() === "CAMPUS-ADMIN-01") {
      localStorage.removeItem("campuspulse-admin-account");
      return null;
    }
    return account;
  } catch { return null; }
}
function validAdminUsername(value) { return /^[A-Za-z0-9]+$/.test(value.trim()); }
const ADMIN_PASSWORD = "PVPSIT@123";
function saveStudentAccount(username, account) {
  const all = getStudentAccounts();
  all[username] = account;
  localStorage.setItem("campuspulse-student-accounts", JSON.stringify(all));
}
function expectedStudentPassword(registerNo) {
  return registerNo.trim().replace(/a/g, "A");
}
function validRegisterNumber(value) {
  return /^\d{5}a\d{4}$/.test(value.trim());
}
function normalizeIssue(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function isSameIssue(a, b) {
  return a.category === b.category && a.location === b.location &&
    normalizeIssue(a.description) === normalizeIssue(b.description);
}

async function apiRequest(url = API, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("Request failed");
  return response.json();
}
async function getComplaints() {
  try {
    const data = await apiRequest();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    return data;
  } catch {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return [];
  }
}
async function createComplaint(complaint) {
  try {
    return await apiRequest(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(complaint) });
  } catch {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    const saved = { ...complaint, id: crypto.randomUUID() };
    localStorage.setItem(CACHE_KEY, JSON.stringify([saved, ...cached]));
    return saved;
  }
}
async function updateComplaint(id, status) {
  try {
    return await apiRequest(`${API}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  } catch {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    const updated = cached.map(c => String(c.id) === String(id) ? { ...c, status } : c);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    return updated.find(c => String(c.id) === String(id));
  }
}

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("campuspulse-session") || "null"); } catch { return null; }
  });
  const [screen, setScreen] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem("campuspulse-session") || "null");
      return session?.role === "admin" ? "admin" : "student";
    } catch { return "student"; }
  });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("campuspulse-theme") || "light");
  const [palette, setPalette] = useState(() => localStorage.getItem("campuspulse-palette") || "sky");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("appearance");
  const settingsRef = useRef(null);

  const refresh = async () => {
    setLoading(true); setError("");
    try { setComplaints(await getComplaints()); }
    catch { setError("Unable to load complaints. Please try again."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) refresh(); else setLoading(false); }, [user]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("campuspulse-theme", theme); }, [theme]);
  useEffect(() => {
    const [name, accent, strong, soft] = PALETTES[palette] || PALETTES.sky;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-strong", strong);
    document.documentElement.style.setProperty("--accent-soft", soft);
    const rgb = hexToRgb(accent); document.documentElement.style.setProperty("--accent-rgb", rgb);
    document.documentElement.style.setProperty("--palette-name", `"${name}"`);
    localStorage.setItem("campuspulse-palette", palette);
  }, [palette]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    const closeOnOutside = e => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false); };
    const closeOnEscape = e => { if (e.key === "Escape") setSettingsOpen(false); };
    document.addEventListener("mousedown", closeOnOutside); document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  const login = account => {
    setUser(account); localStorage.setItem("campuspulse-session", JSON.stringify(account));
    setScreen(account.role === "admin" ? "admin" : "student"); setNotice(`Welcome, ${account.name || account.username}!`);
  };
  const logout = () => { localStorage.removeItem("campuspulse-session"); setUser(null); setScreen("student"); setNotice(""); };
  const addComplaint = async data => {
    setNotice("");
    const duplicateCount = complaints.filter(c => isSameIssue(c, data)).length;
    if (duplicateCount >= 20) return { blocked: true, message: "This issue has already been reported." };
    const saved = await createComplaint({ ...data, reportedBy: user.username });
    setComplaints(prev => [saved, ...prev]);
    setNotice("Complaint submitted successfully!");
    setScreen("student");
    return { blocked: false, saved };
  };
  const changeStatus = async (id, status) => {
    if (user?.role !== "admin") return;
    const updated = await updateComplaint(id, status);
    setComplaints(prev => prev.map(c => String(c.id) === String(id) ? { ...c, status: updated.status } : c));
    setNotice(`Complaint marked ${status}.`);
  };
  const saveProfile = details => {
    const next = { ...user, ...details };
    delete next.avatar;
    setUser(next); localStorage.setItem("campuspulse-session", JSON.stringify(next));
    if (next.role === "student") saveStudentAccount(next.username, next);
    else localStorage.setItem("campuspulse-admin-account", JSON.stringify(next));
    setNotice("Profile updated successfully!");
  };
  const changePassword = password => {
    const next = { ...user, password };
    setUser(next); localStorage.setItem("campuspulse-session", JSON.stringify(next));
    if (next.role === "student") saveStudentAccount(next.username, next);
    else localStorage.setItem("campuspulse-admin-account", JSON.stringify(next));
    setNotice("Password changed successfully!");
  };

  if (!user) return <LoginScreen onLogin={login} theme={theme} setTheme={setTheme} palette={palette} setPalette={setPalette} />;

  const visibleComplaints = user.role === "admin" ? complaints : complaints.filter(c => c.reportedBy === user.username);
  const chooseAppearance = () => setSettingsOpen(false);

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={() => setScreen(user.role === "admin" ? "admin" : "student")} aria-label="Go to dashboard">
        <span className="brand-mark campus-house-logo" aria-hidden="true"><svg viewBox="0 0 64 64" role="img"><path d="M10 31 32 12l22 19"/><path d="M16 28v25h32V28"/><path d="M25 53V39h14v14"/><circle cx="32" cy="29" r="5"/><path d="M10 53h44"/><path d="M32 12V6h8"/><path d="M40 6v6"/><path d="M7 26l-4-3M57 26l4-3M8 33H3M56 33h5"/></svg></span><span>CampusPulse</span>
      </button>
      <nav aria-label="Primary navigation">
        {user.role === "student" && <button className={screen === "student" ? "nav-active" : ""} onClick={() => setScreen("student")}>Student Home</button>}
        {user.role === "admin" && <button className={screen === "admin" ? "nav-active" : ""} onClick={() => setScreen("admin")}>Admin Control Center</button>}
      </nav>
      <div className={`nav-fun-text ${user.role}`} aria-live="polite"><span>{user.role === "student" ? "Saw a problem? Spill the tea ☕👀" : "A better campus starts with action. 🚀"}</span></div>
      <div className="header-actions">
        <button className="header-feedback-btn" onClick={() => setScreen(user.role === "admin" ? "feedback-review" : "feedback")} aria-label={user.role === "admin" ? "Review student feedback" : "Give feedback"} title={user.role === "admin" ? "Review student feedback" : "Give feedback"}>💬<span>{user.role === "admin" ? "Feedback" : "Feedback"}</span></button>
        <button className="icon-btn theme-header-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle display mode" title="Theme">{theme === "dark" ? "☀" : "☾"}</button>
        <div className="settings-wrap" ref={settingsRef}>
          <button className={`icon-btn settings-header-btn ${settingsOpen ? "active" : ""}`} onClick={() => setSettingsOpen(v => !v)} aria-label="Open settings" title="Settings"><span aria-hidden="true">⚙</span></button>
          {settingsOpen && <SettingsPanel user={user} tab={settingsTab} setTab={setSettingsTab} theme={theme} setTheme={setTheme} palette={palette} setPalette={setPalette} onChooseAppearance={chooseAppearance} onSaveProfile={saveProfile} onChangePassword={changePassword}/>} 
        </div>
        <button className="logout-btn" onClick={logout}>Log out</button>
      </div>
    </header>
    <main className="container">
      {notice && <div className="toast success" role="status">✓ {notice}</div>}
      {error && <div className="toast error" role="alert"><span>⚠ {error}</span><button onClick={refresh}>Retry</button></div>}
      {screen === "student" && <StudentDashboard complaints={visibleComplaints} loading={loading} onRefresh={refresh} user={user} onReport={() => setScreen("report")} />}
      {screen === "report" && user.role === "student" && <ReportProblem onBack={() => setScreen("student")} onSubmit={addComplaint} existingComplaints={complaints} />}
      {screen === "admin" && user.role === "admin" && <AdminDashboard complaints={complaints} loading={loading} onStatusChange={changeStatus} onFeedbackReview={() => setScreen("feedback-review")} />}
      {screen === "feedback" && user.role === "student" && <FeedbackPage user={user} onBack={() => setScreen("student")} onDone={() => setNotice("Thanks for your feedback! 💜")} />}
      {screen === "feedback-review" && user.role === "admin" && <FeedbackReviewPage onBack={() => setScreen("admin")} />}
    </main>
    <footer>CampusPulse · <span>{user.role === "admin" ? "Admin Control Center" : "Student Portal"}</span> · <b>{PALETTES[palette]?.[0]}</b> · <button className="footer-feedback" onClick={() => setScreen("feedback")}>💬 Give Feedback</button> · Built for a better campus</footer>
  </div>;
}

function LoginScreen({ onLogin, theme, setTheme, palette, setPalette }) {
  const [role, setRole] = useState("student"), [username, setUsername] = useState(""), [password, setPassword] = useState("");
  const [error, setError] = useState(""), [showPassword, setShowPassword] = useState(false), [shake, setShake] = useState(false);
  const [setup, setSetup] = useState(null), [newPassword, setNewPassword] = useState(""), [confirmPassword, setConfirmPassword] = useState("");

  const resetFields = () => { setUsername(""); setPassword(""); setError(""); setSetup(null); setNewPassword(""); setConfirmPassword(""); };
  const submit = e => {
    e.preventDefault(); setError("");
    if (role === "admin") {
      const adminId = username.trim();
      if (!validAdminUsername(adminId)) setError("Invalid admin username. Use letters and numbers only.");
      else if (password !== ADMIN_PASSWORD) setError("Invalid pass.");
      else {
        const admin = { username: adminId, name: adminId, role: "admin", password: ADMIN_PASSWORD, department: "Administration", year: "" };
        localStorage.setItem("campuspulse-admin-account", JSON.stringify(admin));
        return onLogin(admin);
      }
    } else {
      const registerNo = username.trim(), accounts = getStudentAccounts(), saved = accounts[registerNo];
      if (saved && password === saved.password) return onLogin(saved);
      if (!validRegisterNumber(registerNo)) setError("Invalid register number. Use the format 2501a4427.");
      else if (saved) setError("Incorrect password for this register number.");
      else if (password === expectedStudentPassword(registerNo))
        setSetup({ username: registerNo, name: "Student", role: "student", department: "Data Science", year: "3rd Year" });
      else setError("First-time password must match your register number with A in capital.");
    }
    setShake(true); setTimeout(() => setShake(false), 500);
  };
  const finishSetup = e => {
    e.preventDefault(); setError("");
    if (newPassword.length < 6) return setError("Create a password with at least 6 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    const account = { ...setup, password: newPassword };
    if (setup.role === "student") saveStudentAccount(setup.username, account);
    else localStorage.setItem("campuspulse-admin-account", JSON.stringify(account));
    onLogin(account);
  };
  return <div className="login-page">
    <div className="login-glow glow-one"/><div className="login-glow glow-two"/>
    <div className="floating-icons" aria-hidden="true">{["🎓","📚","🏫","📝","🎒","🚌","☕","📍"].map((icon,i)=><span key={i} style={{"--i":i}}>{icon}</span>)}</div>
    <div className="college-login-art" aria-hidden="true"><img src="/college-login-art.svg" alt="" /></div>
    <div className="login-top"><div className="brand login-brand"><span className="brand-mark campus-house-logo" aria-hidden="true"><svg viewBox="0 0 64 64" role="img"><path d="M10 31 32 12l22 19"/><path d="M16 28v25h32V28"/><path d="M25 53V39h14v14"/><circle cx="32" cy="29" r="5"/><path d="M10 53h44"/><path d="M32 12V6h8"/><path d="M40 6v6"/><path d="M7 26l-4-3M57 26l4-3M8 33H3M56 33h5"/></svg></span><span>CampusPulse</span></div><div className="login-theme"><button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle display mode">{theme === "dark" ? "☀" : "☾"}</button><button className="icon-btn" onClick={() => setPalette(palette === "sky" ? "lavender" : "sky")} title="Quick color">◉</button></div></div>
    <div className="login-shell">
      <div className="login-intro"><p className="eyebrow">ONE CAMPUS · ONE PULSE</p><h1>Make campus issues <span>visible.</span></h1><p>Report problems, follow progress, and help your college respond faster — all through one simple portal.</p><div className="trust-row"><span>🔒 Role based access</span><span>⚡ Quick reporting</span><span>📍 Live issue tracking</span></div></div>
      <div className={`card login-card ${shake ? "shake" : ""}`}>
        <div className="portal-tabs"><button className={role === "student" ? "selected" : ""} onClick={() => {setRole("student");resetFields()}}>👤 Student Portal</button><button className={role === "admin" ? "selected" : ""} onClick={() => {setRole("admin");resetFields()}}>◆ Admin Portal</button></div>
        {!setup ? <>
          <div className="login-card-head"><div className={`portal-icon ${role}`}>{role === "student" ? "👤" : "◆"}</div><div><h2>{role === "student" ? "Student login" : "Admin login"}</h2><p>{role === "student" ? "Use your college register number" : "Manage and resolve campus reports"}</p></div></div>
          <form className="login-form" onSubmit={submit}>
            <div className="field"><label>{role === "student" ? "Register number" : "Admin ID"}</label><input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder={role === "student" ? "e.g. 25001a4427" : "e.g. CampusAdmin01"}/>{role === "student" && <small className="field-hint">Format: 5 digits + a + 4 digits · e.g. 25001a4427</small>}{role === "admin" && <small className="field-hint">Use letters and numbers only for your admin username.</small>}</div>
            {<div className="field"><label>Password</label><div className="password-wrap"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword ? "Hide":"Show"}</button></div></div>}
            {error && <p className="login-error">⚠ {error}</p>}
            <button className="primary login-submit" type="submit">Enter {role === "student" ? "Student" : "Admin"} Portal <span>→</span></button>
          </form>
          <p className="first-login-note">🔐 {role === "student" ? "First-time access is verified using your register number." : "Admin access requires the secure campus admin password."}</p>
        </> : <>
          <div className="login-card-head"><div className="portal-icon">🔐</div><div><h2>Create your password</h2><p>First-time setup · use this password for future logins.</p></div></div>
          <form className="login-form" onSubmit={finishSetup}>
            <div className="setup-identity"><span>✓</span><div><b>{setup.username}</b><small>{setup.role === "admin" ? "Admin username verified":"Register number verified"}</small></div></div>
            <div className="field"><label>New password</label><input type="password" autoFocus value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Create a password"/></div>
            <div className="field"><label>Confirm password</label><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter password"/></div>
            {error && <p className="login-error">⚠ {error}</p>}
            <button className="primary login-submit" type="submit">Save password & enter <span>→</span></button>
            <button type="button" className="back setup-back" onClick={()=>{setSetup(null);setError("")}}>← Back to login</button>
          </form>
        </>}
      </div>
    </div>
  </div>;
}
function FeedbackPage({ user, onBack, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = e => {
    e.preventDefault();
    if (!rating || !message.trim()) return;
    setSaving(true);
    const item = { rating, message: message.trim(), submittedBy: user.username, role: user.role, date: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem("campuspulse-feedback") || "[]");
    localStorage.setItem("campuspulse-feedback", JSON.stringify([item, ...existing]));
    setTimeout(() => { setSaving(false); setSubmitted(true); onDone?.(); }, 350);
  };

  return <section className="feedback-page">
    <div className="feedback-floating-icons" aria-hidden="true">{["💬","✨","🎓","📚","💡","📝","❤️","📣","⭐","🏫"].map((icon,i)=><span key={i} style={{"--i":i}}>{icon}</span>)}</div>
    <button className="back feedback-back" onClick={onBack}>← Back to Dashboard</button>
    <div className="feedback-hero">
      <div className="feedback-hero-icon">💬</div>
      <p className="eyebrow">CAMPUSPULSE FEEDBACK</p>
      <h1>Help us make CampusPulse better.</h1>
      <p>Tell us what feels smooth, what needs attention, and what you would love to see next.</p>
    </div>
    <div className="feedback-form-wrap">
      {submitted ? <div className="feedback-success">
        <div className="feedback-success-icon">✓</div>
        <p className="eyebrow">FEEDBACK RECEIVED</p>
        <h2>Thanks for helping us improve! ✨</h2>
        <p>Your feedback has been saved successfully.</p>
        <button className="primary feedback-submit" onClick={onBack}>Back to CampusPulse <span>→</span></button>
      </div> : <form className="card feedback-card" onSubmit={submit}>
        <div className="feedback-3d-icon" aria-hidden="true"><span>💬</span><i>↗</i></div>
        <div className="feedback-card-heading"><h2>We'd love to hear from you</h2><p>Your thoughts help us build a better campus experience.</p></div>
        <div className="field"><label>What would you like to tell us?</label><textarea maxLength="400" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Share your experience, suggestion, or idea..."/><div className="counter">{message.length} / 400</div></div>
        <div className="feedback-rating">
          <div><label>Rate your CampusPulse experience</label><small>{rating ? `${rating} out of 5 stars` : "Tap a star to rate"}</small></div>
          <div className="star-row" role="radiogroup" aria-label="Rate CampusPulse from 1 to 5 stars">{[1,2,3,4,5].map(n=><button type="button" key={n} className={n <= (hover || rating) ? "star selected" : "star"} onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)} onFocus={()=>setHover(n)} onBlur={()=>setHover(0)} onClick={()=>setRating(n)} aria-label={`${n} star${n>1?"s":""}`} aria-pressed={rating===n}>★</button>)}</div>
        </div>
        <button className="primary feedback-submit" disabled={saving || !rating || !message.trim()}>{saving ? "Saving feedback..." : <>Submit Feedback <span>→</span></>}</button>
        <p className="feedback-note">🔒 Your feedback is linked only to your CampusPulse account.</p>
      </form>}
    </div>
  </section>;
}


function getFeedback() { try { return JSON.parse(localStorage.getItem("campuspulse-feedback") || "[]"); } catch { return []; } }
function AdminFeedbackPreview({onOpen}) {
  const feedback = getFeedback().filter(f => f.role === "student");
  const avg = feedback.length ? (feedback.reduce((a,f)=>a+Number(f.rating||0),0)/feedback.length).toFixed(1) : "—";
  return <div className="card admin-feedback-preview"><div><div className="card-title"><h2>💬 Student Feedback</h2><span>{feedback.length} response{feedback.length===1?"":"s"}</span></div><p className="feedback-preview-copy">Review what students think about CampusPulse and the campus experience.</p></div><div className="feedback-preview-meta"><strong>★ {avg}</strong><button className="filter-btn" onClick={onOpen}>Review feedback →</button></div></div>;
}
function FeedbackReviewPage({onBack}) {
  const [feedback,setFeedback] = useState(getFeedback);
  useEffect(() => { const refresh = () => setFeedback(getFeedback()); window.addEventListener("storage", refresh); return () => window.removeEventListener("storage", refresh); }, []);
  const students = feedback.filter(f => f.role === "student");
  const avg = students.length ? (students.reduce((a,f)=>a+Number(f.rating||0),0)/students.length).toFixed(1) : "—";
  return <section className="feedback-review-page"><button className="back" onClick={onBack}>← Back to Admin Control Center</button><div className="feedback-review-heading"><p className="eyebrow">STUDENT VOICE</p><h1>Feedback from your campus.</h1><p>See ratings and comments submitted by students.</p></div><div className="stats three"><StatCard value={students.length} label="Responses" icon="💬"/><StatCard value={avg} label="Average rating" icon="★"/><StatCard value={students.filter(f=>Number(f.rating)>=4).length} label="Positive ratings" icon="✓"/></div><div className="card feedback-review-list">{students.length===0?<EmptyState/>:students.map((f,i)=><article className="feedback-review-item" key={f.id || i}><div className="feedback-review-top"><div><strong>{f.name || f.submittedBy || "Student"}</strong><small>{f.submittedBy || "Student"} · {f.date || "Recently"}</small></div><div className="review-stars">{"★".repeat(Number(f.rating||0))}{"☆".repeat(5-Number(f.rating||0))}</div></div><p>{f.message}</p></article>)}</div></section>;
}
function SettingsPanel({ user, tab, setTab, theme, setTheme, palette, setPalette, onChooseAppearance, onSaveProfile, onChangePassword }) {
  return <div className="settings-panel" role="dialog" aria-label="CampusPulse settings">
    <div className="settings-head"><div><b>Settings</b><small>Personalize your CampusPulse</small></div><span>⚙</span></div>
    <div className="settings-tabs"><button className={tab === "appearance" ? "selected" : ""} onClick={() => setTab("appearance")}>🎨 Appearance</button><button className={tab === "profile" ? "selected" : ""} onClick={() => setTab("profile")}>👤 Profile</button><button className={tab === "security" ? "selected" : ""} onClick={() => setTab("security")}>🔐 Security</button></div>
    {tab === "appearance" && <AppearancePanel theme={theme} setTheme={setTheme} palette={palette} setPalette={setPalette} onChoose={onChooseAppearance}/>} 
    {tab === "profile" && <ProfileSettings user={user} onSave={onSaveProfile}/>} 
    {tab === "security" && <SecuritySettings user={user} onChangePassword={onChangePassword}/>} 
  </div>;
}

function AppearancePanel({ theme, setTheme, palette, setPalette, onChoose }) {
  return <div className="appearance-inner"><div className="panel-title"><span>Display mode</span><small>Choose a mood</small></div><div className="mode-row">{[["light","☀","Bright"],["dim","◐","Dim"],["dark","☾","Dark"]].map(([id,icon,label]) => <button key={id} className={`mode-btn ${theme === id ? "selected" : ""}`} onClick={() => {setTheme(id);onChoose?.();}}><b>{icon}</b>{label}</button>)}</div><div className="palette-label">12 color palettes</div><div className="palette-grid">{Object.entries(PALETTES).map(([id,[label]]) => <button key={id} className={`palette-btn ${palette === id ? "selected" : ""}`} onClick={() => {setPalette(id);onChoose?.();}} title={label}><i className={`swatch ${id}`} />{label}</button>)}</div><p className="settings-tip">✨ Pick a color and it becomes your campus accent across buttons, cards and icons.</p></div>;
}

function ProfileSettings({ user, onSave }) {
  const [name, setName] = useState(user.name || ""); const [department, setDepartment] = useState(user.department || ""); const [year, setYear] = useState(user.year || "");
  return <div className="settings-form"><div className="field"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"/></div><div className="field"><label>Register number / username</label><input value={user.username} disabled/></div><div className="two-fields"><div className="field"><label>Department</label><input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Data Science"/></div><div className="field"><label>Year</label><select value={year} onChange={e => setYear(e.target.value)}><option value="">Select</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></div></div><button className="primary settings-save" onClick={() => onSave({name:name.trim() || "Student", department, year}) }>Save profile <span>✓</span></button></div>;
}

function SecuritySettings({ user, onChangePassword }) {
  if (user?.role === "admin") return <div className="settings-form"><div className="security-note">🔐 <span>Admin sign-in uses the fixed campus administrator password for this prototype.</span></div><div className="admin-password-display"><b>Admin password</b><span>PVPSIT@123</span></div><p className="settings-tip">Keep this credential private. In production, the college would manage administrator authentication securely on the backend.</p></div>;
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState(""); const [msg, setMsg] = useState("");
  const submit = e => { e.preventDefault(); setMsg(""); if (current !== user.password) return setMsg("Current password is incorrect."); if (next.length < 6) return setMsg("New password should be at least 6 characters."); if (next !== confirm) return setMsg("New passwords do not match."); onChangePassword(next); setCurrent(""); setNext(""); setConfirm(""); setMsg("Password updated ✓"); };
  return <form className="settings-form" onSubmit={submit}><div className="security-note">🔐 <span>After changing it, use your new password the next time you sign in.</span></div><div className="field"><label>Current password</label><input type="password" value={current} onChange={e=>setCurrent(e.target.value)} /></div><div className="field"><label>New password</label><input type="password" value={next} onChange={e=>setNext(e.target.value)} /></div><div className="field"><label>Confirm new password</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} /></div>{msg&&<p className={msg.includes("✓")?"save-message":"field-error"}>{msg}</p>}<button className="primary settings-save" type="submit">Update password <span>✓</span></button></form>;
}

function Avatar({ user, size = "38" }) { return user?.avatar ? <img className="avatar" style={{width:size,height:size}} src={user.avatar} alt="Profile"/> : <span className="avatar avatar-fallback" style={{width:size,height:size}}>{(user?.name || user?.username || "S").slice(0,1).toUpperCase()}</span>; }

function StudentDashboard({ complaints, loading, onRefresh, user, onReport }) {
  const [query,setQuery]=useState("");
  const filtered=useMemo(()=>complaints.filter(c=>`${c.category} ${c.location} ${c.description}`.toLowerCase().includes(query.toLowerCase())),[complaints,query]);
  const resolved=complaints.filter(c=>c.status==="Resolved").length;
  return <section><div className="hero dashboard-hero"><div><div className="hero-chip"><span className="pulse-dot"/> STUDENT PORTAL · LIVE</div><p className="eyebrow">WELCOME BACK, {String(user.name||user.username).toUpperCase()}</p><h1>Your campus, in one pulse.</h1><p className="hero-description">See what needs attention, report issues in seconds, and track every update without chasing people.</p></div><button className="primary hero-report-btn" onClick={onReport}>+ Report a Problem <span>→</span></button></div>
    <div className="stats two"><StatCard value={complaints.length} label="My Reports" icon="◈"/><StatCard value={resolved} label="Resolved" icon="✓"/></div>
    <div className="section-head"><div><h2>My Complaints</h2><p>Search and track every issue you have reported.</p></div><span className="record-count">{filtered.length} shown</span></div>
    <div className="toolbar student-toolbar"><div className="search-wrap"><span>⌕</span><input value={query} maxLength="80" onChange={e=>setQuery(e.target.value)} placeholder="Search by issue, location..." aria-label="Search complaints"/></div></div>
    {loading?<LoadingState/>:filtered.length===0?<EmptyState/>:<div className="complaint-list">{filtered.map(c=><ComplaintCard key={c.id} complaint={c}/>)}</div>}</section>;
}
function ReportProblem({onBack,onSubmit,existingComplaints}) {
  const [form,setForm]=useState({category:"",location:"",description:"",priority:"Medium"}), [submitted,setSubmitted]=useState(false), [saving,setSaving]=useState(false), [errors,setErrors]=useState({});
  const submit=async e=>{e.preventDefault();if(saving)return;const next={};if(!form.category)next.category="Please select a category.";if(!form.location)next.location="Please select a location.";if(!form.description.trim())next.description="Description is required.";setErrors(next);if(Object.keys(next).length)return;
    const duplicateCount=existingComplaints.filter(c=>isSameIssue(c,form)).length;
    if(duplicateCount>=20){setErrors({duplicate:"This issue has already been reported."});return;}
    setSaving(true);const result=await onSubmit({...form,description:form.description.trim(),status:"Pending",date:new Date().toISOString().slice(0,10)});setSaving(false);if(result?.blocked){setErrors({duplicate:result.message});return;}setSubmitted(true);
  };
  if(submitted)return <section className="success-page"><div className="success-icon">✓</div><div className="hero-chip">REPORT RECEIVED</div><h1>Complaint Submitted!</h1><p>Your issue is now in the CampusPulse workflow.</p><button className="primary" onClick={onBack}>View Complaints →</button></section>;
  return <section className="form-page"><button className="back" onClick={onBack}>← Back to Dashboard</button><div className="form-heading"><p className="eyebrow">REPORT AN ISSUE</p><h1>Help us improve your campus.</h1><p>Give enough detail so the right team can act quickly.</p></div><div className="steps"><span className="step active">1 <b>Details</b></span><i/><span className="step">2 <b>Review</b></span><i/><span className="step">3 <b>Track</b></span></div><form className="card form-card" onSubmit={submit} noValidate><Field label="Category" error={errors.category}><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Select category</option><option>Wi-Fi</option><option>Classroom</option><option>Cleanliness</option><option>Electricity</option><option>Hostel</option><option>Water</option><option>Other</option></select></Field><Field label="Location" error={errors.location}><select value={form.location} onChange={e=>setForm({...form,location:e.target.value})}><option value="">Select location</option><option>Block A</option><option>Block B</option><option>Hostel</option><option>Canteen</option><option>Library</option><option>Lab</option><option>Ground</option></select></Field><Field label="Description" error={errors.description}><textarea maxLength="200" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What happened? Where exactly?"/><div className={`counter ${form.description.length>180?"near-limit":""}`}>{form.description.length} / 200</div></Field><div className="field"><label>Priority</label><div className="priority-row">{["Low","Medium","High"].map(p=><button type="button" key={p} className={`priority ${form.priority===p?"selected":""}`} onClick={()=>setForm({...form,priority:p})}>{p}</button>)}</div></div>{errors.duplicate&&<div className="duplicate-warning" role="alert">⚠ {errors.duplicate}</div>}<div className="form-note">⌁ Your report is protected by the student/admin role separation and can still be recovered if the API is unavailable.</div><button className="primary submit" disabled={saving}>{saving?<><span className="button-spinner"/> Submitting...</>:<>Submit Complaint <span>→</span></>}</button></form></section>;
}
function AdminDashboard({complaints,loading,onStatusChange,onFeedbackReview}){
  const [statusFilter,setStatusFilter]=useState("All"), [priorityFilter,setPriorityFilter]=useState("All"), [openFilter,setOpenFilter]=useState("");
  const pending=complaints.filter(c=>c.status==="Pending").length,progress=complaints.filter(c=>c.status==="In Progress").length,resolved=complaints.filter(c=>c.status==="Resolved").length;
  const filtered=complaints.filter(c=>(statusFilter==="All"||c.status===statusFilter)&&(priorityFilter==="All"||c.priority===priorityFilter));
  const hotspot=Object.entries(complaints.reduce((a,c)=>(a[c.location]=(a[c.location]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]);
  return <section><div className="hero compact"><div><div className="hero-chip"><span className="pulse-dot"/> ADMIN LIVE VIEW</div><p className="eyebrow">ADMIN CONTROL CENTER</p><h1>Turn reports into action.</h1><p className="hero-description">See the whole campus, prioritize recurring problems, and move each report through the workflow.</p></div><div className="admin-badge">● System healthy</div></div><div className="stats four"><StatCard value={complaints.length} label="Total" icon="◈"/><StatCard value={pending} label="Pending" icon="◷"/><StatCard value={progress} label="In Progress" icon="↗"/><StatCard value={resolved} label="Resolved" icon="✓"/></div><div className="admin-grid"><div className="card"><div className="card-title"><h2>🔥 Problem Hotspots</h2><span>By location</span></div>{hotspot.length===0?<EmptyState/>:hotspot.map(([location,count])=><div className="hotspot" key={location}><div><strong>{location}</strong><span>{count} complaints</span></div><div className="bar"><i style={{width:`${Math.max(12,count/hotspot[0][1]*100)}%`}}/></div></div>)}</div><div className="card"><div className="card-title"><h2>Most Reported</h2><span>Category</span></div><CategoryStats complaints={complaints}/></div></div><div className="card complaints-admin"><div className="card-title admin-complaints-head"><div><h2>All Complaints</h2><span>{filtered.length} of {complaints.length} records</span></div><div className="filter-buttons admin-filters"><div className="filter-menu"><button className={`filter-btn ${priorityFilter!=="All"?"active":""}`} onClick={()=>setOpenFilter(openFilter==="priority"?"":"priority")}>⚑ Priority <span>⌄</span></button>{openFilter==="priority"&&<div className="filter-popover">{["All","Low","Medium","High"].map(v=><button key={v} className={priorityFilter===v?"selected":""} onClick={()=>{setPriorityFilter(v);setOpenFilter("")}}>{v}</button>)}</div>}</div><div className="filter-menu"><button className={`filter-btn ${statusFilter!=="All"?"active":""}`} onClick={()=>setOpenFilter(openFilter==="status"?"":"status")}>◷ Progress <span>⌄</span></button>{openFilter==="status"&&<div className="filter-popover">{["All","Pending","In Progress","Resolved"].map(v=><button key={v} className={statusFilter===v?"selected":""} onClick={()=>{setStatusFilter(v);setOpenFilter("")}}>{v}</button>)}</div>}</div></div></div>{(priorityFilter!=="All"||statusFilter!=="All")&&<div className="active-filters"><span>Filters:</span>{priorityFilter!=="All"&&<button onClick={()=>setPriorityFilter("All")}>Priority: {priorityFilter} ×</button>}{statusFilter!=="All"&&<button onClick={()=>setStatusFilter("All")}>Progress: {statusFilter} ×</button>}</div>}{loading?<LoadingState/>:filtered.length===0?<EmptyState/>:filtered.map(c=><div className="admin-row" key={c.id}><div className="admin-main"><StatusDot status={c.status}/><div><strong>{c.category} issue</strong><p>{c.location} · {c.priority} priority · {c.date} · <span className="reporter">{c.reportedBy}</span></p><small>{c.description}</small></div></div><select value={c.status} onChange={e=>onStatusChange(c.id,e.target.value)} aria-label={`Status for ${c.category} issue`}><option>Pending</option><option>In Progress</option><option>Resolved</option></select></div>)} </div><AdminFeedbackPreview onOpen={onFeedbackReview} /></section>}
function CategoryStats({complaints}){const counts=Object.entries(complaints.reduce((a,c)=>(a[c.category]=(a[c.category]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,4);if(!counts.length)return <EmptyState/>;return <div>{counts.map(([name,count])=><div className="category-stat" key={name}><span>{name}</span><strong>{count}</strong></div>)}</div>}
function ComplaintCard({complaint}){return <article className="card complaint-card"><div className="card-top"><div><StatusDot status={complaint.status}/><strong>{complaint.category} issue</strong></div><span className={`badge ${complaint.status.toLowerCase().replace(" ","-")}`}>{complaint.status}</span></div><p>{complaint.description}</p><div className="meta"><span>📍 {complaint.location}</span><span>⚑ {complaint.priority}</span><span>📅 {complaint.date}</span></div></article>}
function StatusDot({status}){return <span className={`dot ${status.toLowerCase().replace(" ","-")}`} title={status}/>}
function StatCard({value,label,icon}){return <div className="card stat"><span className="stat-icon">{icon}</span><strong>{value}</strong><span>{label}</span></div>}
function Field({label,error,children}){return <div className="field"><label>{label} <em>*</em></label>{children}{error&&<p className="field-error">⚠ {error}</p>}</div>}
function LoadingState(){return <div className="card state"><div className="spinner"/><p>Loading campus data…</p><div className="skeleton-line wide"/><div className="skeleton-line mid"/></div>}
function EmptyState(){return <div className="card state"><div className="empty-icon">⌁</div><strong>No matching reports</strong><p>Try another search or clear the filter.</p></div>}
function hexToRgb(hex){const n=hex.replace("#","");const v=n.length===3?n.split("").map(x=>x+x).join(""):n;return `${parseInt(v.slice(0,2),16)}, ${parseInt(v.slice(2,4),16)}, ${parseInt(v.slice(4,6),16)}`;}

createRoot(document.getElementById("root")).render(<App/>);
