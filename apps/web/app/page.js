"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, ApiError } from "../lib/api";
import { formatInquiryDate } from "../lib/format-date";
import NewInquiryForm from "../components/NewInquiryForm";

const statuses = ["New", "In Progress", "Resolved"];

function ErrorMessage({ children, onRetry }) {
  return (
    <div className="notice notice-error" role="alert">
      <span>{children}</span>
      {onRetry && <button className="text-button" type="button" onClick={() => onRetry()}>Try again</button>}
    </div>
  );
}

function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="auth-brand-lockup" aria-label="InquiTrack">
          <Image className="auth-symbol" src="/logo.png" alt="" width={70} height={53} priority />
          <Image className="auth-logo" src="/inquitrack-wordmark.png" alt="InquiTrack" width={220} height={63} priority />
        </div>
        <p className="eyebrow">STAFF WORKSPACE</p>
        <h1 id="sign-in-title">Welcome back</h1>
        <p className="muted">Sign in to keep customer requests moving.</p>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3M6.2 6.2C3.8 7.8 2.7 10.5 2.5 12c1 2.5 4.5 7 9.5 7 1 0 2-.2 2.8-.5" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="2.5" /></svg>
              )}
            </button>
          </div>
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
    try {
      const result = await apiRequest(`/api/inquiries${params.size ? `?${params}` : ""}`, { signal });
      if (!signal?.aborted) setItems(result.inquiries);
    } catch (requestError) {
      if (!signal?.aborted) setListError(requestError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search]);

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
  const visibleItems = status ? items.filter((item) => item.status === status) : items;
  const chartMax = Math.max(items.length, 1);
  const renderStatusCard = (item) => (
    <button type="button" key={item.label} aria-pressed={status === item.label} className={`summary-card ${status === item.label ? "summary-card-active" : ""}`} onClick={() => setStatus(status === item.label ? "" : item.label)}>
      <span className={`status-dot dot-${item.label.toLowerCase().replaceAll(" ", "-")}`} />
      <span className="summary-label">{item.label}</span>
      <strong>{item.count}</strong>
    </button>
  );

  return (
    <main className="app-shell dashboard-shell">
      <header className="topbar">
        <Link href="/" className="brand-lockup" aria-label="InquiTrack home">
          <Image className="brand-symbol" src="/logo.png" alt="" width={50} height={38} priority />
          <Image className="brand-logo" src="/inquitrack-wordmark.png" alt="InquiTrack" width={158} height={45} priority />
        </Link>
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

      <section className="statistics-layout" aria-label="Inquiry statistics">
        <div className="panel stats-chart" aria-labelledby="status-distribution-title">
          <div className="stats-chart-heading">
            <div>
              <h2 id="status-distribution-title">Status distribution</h2>
              <p className="muted">Inquiry counts by status{search ? " for this search" : ""}.</p>
            </div>
            <span className="stats-chart-total">{items.length} total</span>
          </div>
          <div className="distribution-list">
            {counts.map((item) => {
              const percentage = Math.round((item.count / chartMax) * 100);
              const colorClass = `distribution-${item.label.toLowerCase().replaceAll(" ", "-")}`;
              return (
                <div className="distribution-row" key={item.label}>
                  <span className="distribution-label">{item.label}</span>
                  <div className="distribution-track" role="progressbar" aria-label={`${item.label} inquiries`} aria-valuemin={0} aria-valuemax={chartMax} aria-valuenow={item.count}>
                    <span className={`distribution-fill ${colorClass}`} style={{ width: `${percentage}%` }} />
                  </div>
                  <strong className="distribution-count">{item.count}</strong>
                </div>
              );
            })}
          </div>
        </div>
        <div className="stats-card-column" aria-label="Inquiry totals and new inquiries">
          <button type="button" className={`summary-card summary-card-total ${!status ? "summary-card-active" : ""}`} aria-pressed={!status} onClick={() => setStatus("")}>
            <span className="summary-label">All inquiries</span>
            <strong>{items.length}</strong>
          </button>
          {counts.slice(0, 1).map(renderStatusCard)}
        </div>
        <div className="stats-card-column" aria-label="In-progress and resolved inquiries">
          {counts.slice(1).map(renderStatusCard)}
        </div>
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
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by ID, customer, or status" />
          </label>
        </div>
        {listError && <ErrorMessage onRetry={loadInquiries}>{listError}</ErrorMessage>}
        {loading ? (
          <div className="state-block" role="status"><span className="spinner" /> Loading inquiries…</div>
        ) : listError ? null : items.length === 0 || visibleItems.length === 0 ? (
          <div className="state-block empty-state">
            <span className="empty-icon" aria-hidden="true">⌕</span>
            <h3>{search || status ? "No matching inquiries" : "No inquiries yet"}</h3>
            <p>{search || status ? "Try a different search or select All inquiries to clear the status filter." : "Record the first customer request to get the team started."}</p>
            {status && <button className="button button-secondary" type="button" onClick={() => setStatus("")}>Show all inquiries</button>}
            {!search && !status && <button className="button button-secondary" onClick={() => setShowForm(true)}>Create an inquiry</button>}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Inquiry ID</th><th>Customer</th><th>Subject</th><th className="status-column">Status</th><th>Date of inquiry</th><th>Last updated</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td><code className="inquiry-id">{item.displayId}</code></td>
                    <td><Link className="customer-link" href={`/inquiries/${item.id}`}>{item.customerName}</Link><span className="table-subtext">{item.contact}</span></td>
                    <td><Link className="subject-link" href={`/inquiries/${item.id}`}>{item.subject}</Link></td>
                    <td className="status-column"><span className={`status-pill status-${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></td>
                    <td className="date-cell"><time dateTime={item.createdAt}>{formatInquiryDate(item.createdAt)}</time></td>
                    <td className="date-cell"><time dateTime={item.updatedAt}>{formatInquiryDate(item.updatedAt)}</time></td>
                    <td><Link className="row-arrow" aria-label={`Open ${item.subject}`} href={`/inquiries/${item.id}`}>↗</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !listError && visibleItems.length > 0 && <p className="list-footer">Showing {visibleItems.length} {visibleItems.length === 1 ? "inquiry" : "inquiries"}{search ? ` matching “${search}”` : ""}{status ? ` with status ${status}` : ""}</p>}
      </section>
      <div className="footer-spacer" aria-hidden="true" />
      <footer className="site-footer">
        <span className="site-footer-brand">© InquiTrack</span>
        <span className="site-footer-separator" aria-hidden="true">·</span>
        <span className="site-footer-product">Customer Inquiry Management System</span>
        <span className="site-footer-separator" aria-hidden="true">·</span>
        <span className="site-footer-credit">Powered by Sithumini Anuhansi</span>
      </footer>
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
    return <main className="auth-layout"><section className="auth-card"><div className="auth-brand-lockup" aria-label="InquiTrack"><Image className="auth-symbol" src="/logo.png" alt="" width={70} height={53} priority /><Image className="auth-logo" src="/inquitrack-wordmark.png" alt="InquiTrack" width={220} height={63} priority /></div><h1>Workspace unavailable</h1><ErrorMessage onRetry={checkSession}>{sessionError}</ErrorMessage></section></main>;
  }
  return user ? <Dashboard user={user} onSignOut={() => setUser(null)} /> : <SignIn onSignedIn={setUser} />;
}
