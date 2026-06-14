import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, FileUp, LogIn, LogOut, RefreshCw, Scale, UserPlus, Users } from "lucide-react";
import { api, clearSession, getStoredUser, getToken, setSession } from "./api.js";
import "./styles.css";

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@splitpilot.local");
  const [password, setPassword] = useState("splitpilot123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = isSignup ? "/auth/register" : "/auth/login";
      const body = isSignup ? { name, email, password } : { email, password };
      const data = await api(path, { method: "POST", body });
      setSession(data);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <section className="login-panel">
        <div>
          <p className="eyebrow">SplitPilot</p>
          <h1>Shared expenses, with every messy row accounted for.</h1>
        </div>
        <form onSubmit={submit}>
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button type="button" className={!isSignup ? "active" : ""} onClick={() => setMode("login")}>
              <LogIn size={16} /> Sign in
            </button>
            <button type="button" className={isSignup ? "active" : ""} onClick={() => setMode("signup")}>
              <UserPlus size={16} /> Sign up
            </button>
          </div>
          {isSignup && (
            <label>Name<input value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} /></label>
          )}
          <label>Email<input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" minLength={8} value={password} autoComplete={isSignup ? "new-password" : "current-password"} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="error">{error}</p>}
          <button disabled={loading}>
            {isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadGroups() {
    const data = await api("/groups");
    setGroups(data);
    setSelectedGroup(data[0] || null);
  }

  function logout() {
    clearSession();
    setUser(null);
    setGroups([]);
    setMembers([]);
    setSelectedGroup(null);
    setImportRows([]);
    setBalances(null);
  }

  useEffect(() => {
    if (!getToken() || user) return;
    api("/auth/me")
      .then((data) => {
        setSession({ token: getToken(), user: data.user });
        setUser(data.user);
      })
      .catch(() => clearSession());
  }, [user]);

  useEffect(() => {
    if (user) loadGroups().catch((err) => setError(err.message));
  }, [user]);

  useEffect(() => {
    if (!selectedGroup) return;
    api(`/groups/${selectedGroup.id}/members`).then(setMembers).catch((err) => setError(err.message));
    api(`/balances/${selectedGroup.id}`).then(setBalances).catch(() => setBalances(null));
  }, [selectedGroup]);

  async function uploadCsv(event) {
    const file = event.target.files[0];
    if (!file || !selectedGroup) return;
    setLoading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await api(`/imports/${selectedGroup.id}`, { method: "POST", body });
      setImportRows(data.rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const anomalyCount = useMemo(
    () => importRows.reduce((sum, row) => sum + row.anomalies.length, 0),
    [importRows]
  );

  if (!user) return <AuthScreen onLogin={setUser} />;

  return (
    <main className="app-shell">
      <aside>
        <div className="brand">SplitPilot</div>
        <nav>
          <a href="#members"><Users size={17} /> Members</a>
          <a href="#import"><FileUp size={17} /> Import</a>
          <a href="#balances"><Scale size={17} /> Balances</a>
        </nav>
      </aside>

      <section className="workspace">
        <header>
          <div>
            <p className="eyebrow">Assignment build</p>
            <h1>{selectedGroup?.name || "SplitPilot Flat"}</h1>
          </div>
          <div className="header-actions">
            <div className="user-chip">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <select value={selectedGroup?.id || ""} onChange={(event) => setSelectedGroup(groups.find((group) => group.id === Number(event.target.value)))}>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
            <button className="icon-button" type="button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        </header>

        {error && <div className="notice error">{error}</div>}

        <section id="members" className="band">
          <div className="section-title">
            <h2>Membership Timeline</h2>
            <p>Join and leave dates are used when imported rows involve inactive members.</p>
          </div>
          <div className="member-grid">
            {members.map((member) => (
              <article className="card" key={member.id}>
                <strong>{member.display_name}</strong>
                <span>{member.role}</span>
                <small>{member.joined_on?.slice(0, 10)} to {member.left_on?.slice(0, 10) || "present"}</small>
              </article>
            ))}
          </div>
        </section>

        <section id="import" className="band">
          <div className="section-title">
            <h2>CSV Import</h2>
            <label className="upload-button">
              <FileUp size={18} />
              <input type="file" accept=".csv" onChange={uploadCsv} />
              Import expenses_export.csv
            </label>
          </div>
          {loading && <div className="notice"><RefreshCw size={16} /> Importing and checking anomalies...</div>}
          {importRows.length > 0 && (
            <>
              <div className="stats">
                <div><strong>{importRows.length}</strong><span>Rows checked</span></div>
                <div><strong>{anomalyCount}</strong><span>Anomalies surfaced</span></div>
                <div><strong>{importRows.filter((row) => row.action === "review_required").length}</strong><span>Need approval</span></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Row</th><th>Description</th><th>Action</th><th>Anomalies</th></tr></thead>
                  <tbody>
                    {importRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>{row.normalized.description}</td>
                        <td><span className={`pill ${row.action}`}>{row.action.replace("_", " ")}</span></td>
                        <td>
                          {row.anomalies.map((issue, index) => (
                            <details key={`${issue.code}-${index}`}>
                              <summary><AlertTriangle size={14} /> {issue.code}</summary>
                              <p>{issue.message}</p>
                              <small>{issue.policy} Action: {issue.action}</small>
                            </details>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section id="balances" className="band">
          <div className="section-title"><h2>Balances</h2><p>Once approved expenses are posted, this shows group totals and settlement suggestions.</p></div>
          {balances?.people?.length ? (
            <div className="balance-grid">
              {balances.people.map((person) => (
                <article className="card" key={person.person}>
                  <strong>{person.person}</strong>
                  <span className={person.netPaise >= 0 ? "positive" : "negative"}>{person.net >= 0 ? "+" : ""}{person.net}</span>
                  <small>Paid {person.paid}; owes {person.owed}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">Import review is ready. Posting approved expenses is the next operational step.</div>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
