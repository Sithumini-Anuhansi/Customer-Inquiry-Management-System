"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, ApiError } from "../lib/api";
import NewInquiryForm from "../components/NewInquiryForm";

const statuses = ["New", "In Progress", "Resolved"];

function ErrorMessage({ children, onRetry }) {
  return (
    <div className="notice notice-error" role="alert">
      <span>{children}</span>
      {onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onSignedIn(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <div className="brand-mark" aria-hidden="true">ID</div>
        <p className="eyebrow">COFFEE NINJA · STAFF WORKSPACE</p>
        <h1 id="sign-in-title">Welcome back</h1>
        <p className="muted">Sign in to keep customer requests moving.</p>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="button button-primary button-wide" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-footnote">Use the staff account configured in your local environment.</p>
      </section>
    </main>
  );
}

function Dashboard({ user, onSignOut }) {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadInquiries = useCallback(async (signal) => {
    setLoading(true);
    setListError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    try {
      const result = await apiRequest(`/api/inquiries${params.size ? `?${params}` : ""}`, { signal });
      if (!signal?.aborted) setItems(result.inquiries);
    } catch (requestError) {
      if (!signal?.aborted) setListError(requestError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const controller = new AbortController();
    loadInquiries(controller.signal);
    return () => controller.abort();
  }, [loadInquiries]);

  async function signOut() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear the local session view even if the server is temporarily unavailable.
    } finally {
      onSignOut();
    }
  }

  function created(inquiry) {
    setShowForm(false);
    setStatus("");
    setSearchText("");
    setSearch("");
    setItems((current) => [inquiry, ...current.filter((item) => item.id !== inquiry.id)]);
    setFlash(`Inquiry for ${inquiry.customerName} was saved.`);
    window.setTimeout(() => setFlash(""), 4500);
  }

  const counts = statuses.map((itemStatus) => ({ label: itemStatus, count: items.filter((item) => item.status === itemStatus).length }));

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand-lockup"><span className="brand-mark small" aria-hidden="true">ID</span><span>Inquiry Desk</span></Link>
        <div className="user-menu">
          <span className="user-greeting">{user.displayName}</span>
          <button className="text-button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMER CARE</p>
          <h1>Inquiry overview</h1>
          <p className="muted">A clear view of every customer request and what needs attention.</p>
        </div>
        <button className="button button-primary" onClick={() => { setShowForm((visible) => !visible); setFlash(""); }}>
          <span aria-hidden="true">＋</span> New inquiry
        </button>
      </section>

      {flash && <div className="notice notice-success" role="status">{flash}</div>}
      {showForm && <NewInquiryForm onCreated={created} onCancel={() => setShowForm(false)} />}

      <section className="status-summary" aria-label="Inquiry status counts">
        {counts.map((item) => (
          <button key={item.label} className={`summary-card ${status === item.label ? "summary-card-active" : ""}`} onClick={() => setStatus(status === item.label ? "" : item.label)}>
            <span className={`status-dot dot-${item.label.toLowerCase().replaceAll(" ", "-")}`} />
            <span className="summary-label">{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </section>

      <section className="panel list-panel" aria-labelledby="all-inquiries-title">
        <div className="list-heading">
          <div>
            <h2 id="all-inquiries-title">All inquiries</h2>
            <p className="muted">Search by customer, contact, subject, or details.</p>
          </div>
          <label className="search-box">
            <span className="sr-only">Search inquiries</span>
            <span aria-hidden="true">⌕</span>
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search inquiries" />
          </label>
        </div>
        {listError && <ErrorMessage onRetry={loadInquiries}>{listError}</ErrorMessage>}
        {loading ? (
          <div className="state-block" role="status"><span className="spinner" /> Loading inquiries…</div>
        ) : listError ? null : items.length === 0 ? (
          <div className="state-block empty-state">
            <span className="empty-icon" aria-hidden="true">⌕</span>
            <h3>{search || status ? "No matching inquiries" : "No inquiries yet"}</h3>
            <p>{search || status ? "Try a different search or clear the status filter." : "Record the first customer request to get the team started."}</p>
            {!search && !status && <button className="button button-secondary" onClick={() => setShowForm(true)}>Create an inquiry</button>}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Customer</th><th>Subject</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><Link className="customer-link" href={`/inquiries/${item.id}`}>{item.customerName}</Link><span className="table-subtext">{item.contact}</span></td>
                    <td><Link className="subject-link" href={`/inquiries/${item.id}`}>{item.subject}</Link></td>
                    <td><span className={`status-pill status-${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></td>
                    <td className="date-cell">{new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td><Link className="row-arrow" aria-label={`Open ${item.subject}`} href={`/inquiries/${item.id}`}>↗</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !listError && items.length > 0 && <p className="list-footer">Showing {items.length} {items.length === 1 ? "inquiry" : "inquiries"}</p>}
      </section>
      <footer className="footer-note">Every request has an owner, a status, and a next step.</footer>
    </main>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  async function checkSession() {
    setCheckingSession(true);
    setSessionError("");
    try {
      const result = await apiRequest("/api/auth/me");
      setUser(result.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setUser(null);
      else setSessionError(error.message);
    } finally {
      setCheckingSession(false);
    }
  }

  useEffect(() => { checkSession(); }, []);

  if (checkingSession) {
    return <main className="auth-layout"><div className="state-block" role="status"><span className="spinner" /> Checking your session…</div></main>;
  }
  if (sessionError) {
    return <main className="auth-layout"><section className="auth-card"><div className="brand-mark" aria-hidden="true">ID</div><h1>Workspace unavailable</h1><ErrorMessage onRetry={checkSession}>{sessionError}</ErrorMessage></section></main>;
  }
  return user ? <Dashboard user={user} onSignOut={() => setUser(null)} /> : <SignIn onSignedIn={setUser} />;
}
