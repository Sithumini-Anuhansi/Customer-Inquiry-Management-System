"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, ApiError } from "../../../lib/api";

function ErrorMessage({ children, onRetry }) {
  return <div className="notice notice-error" role="alert"><span>{children}</span>{onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}</div>;
}

export default function InquiryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [saving, setSaving] = useState(false);

  const loadInquiry = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest(`/api/inquiries/${encodeURIComponent(id)}`);
      setInquiry(result.inquiry);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        router.replace("/");
        return;
      }
      setError(requestError.message);
      setInquiry(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadInquiry(); }, [loadInquiry]);

  const nextStatus = inquiry?.status === "New" ? "In Progress" : inquiry?.status === "In Progress" ? "Resolved" : "In Progress";
  const actionLabel = inquiry?.status === "Resolved" ? "Reopen inquiry" : inquiry?.status === "In Progress" ? "Mark as resolved" : "Start working";

  async function updateStatus() {
    setSaving(true);
    setConflict("");
    setError("");
    try {
      const result = await apiRequest(`/api/inquiries/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, expectedUpdatedAt: inquiry.updatedAt }),
      });
      setInquiry(result.inquiry);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        await loadInquiry();
        setConflict(requestError.message);
      } else {
        setError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell detail-shell">
      <header className="topbar">
        <Link href="/" className="brand-lockup"><span className="brand-mark small" aria-hidden="true">ID</span><span>Inquiry Desk</span></Link>
        <Link href="/" className="text-button">← All inquiries</Link>
      </header>

      <div className="breadcrumb"><Link href="/">Inquiries</Link><span aria-hidden="true">/</span><span>Details</span></div>
      {loading ? <div className="state-block" role="status"><span className="spinner" /> Loading inquiry…</div> : error ? <ErrorMessage onRetry={loadInquiry}>{error}</ErrorMessage> : inquiry ? (
        <>
          {conflict && <div className="notice notice-warning" role="status">{conflict}</div>}
          <section className="detail-heading">
            <div>
              <p className="eyebrow">INQUIRY DETAILS</p>
              <h1>{inquiry.subject}</h1>
              <p className="muted">Created {new Date(inquiry.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <span className={`status-pill status-${inquiry.status.toLowerCase().replaceAll(" ", "-")}`}>{inquiry.status}</span>
          </section>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="detail-grid">
            <section className="panel detail-main">
              <p className="eyebrow">CUSTOMER REQUEST</p>
              <h2>{inquiry.customerName}</h2>
              <a className="contact-link" href={inquiry.contact.includes("@") ? `mailto:${inquiry.contact}` : undefined}>{inquiry.contact}</a>
              <div className="detail-divider" />
              <h3>Description</h3>
              <p className="description-text">{inquiry.description}</p>
            </section>
            <aside className="panel detail-aside">
              <p className="eyebrow">WORKFLOW</p>
              <h2>Move this forward</h2>
              <p className="muted">Update the status when the next step is clear.</p>
              <div className="workflow-current"><span className={`status-dot dot-${inquiry.status.toLowerCase().replaceAll(" ", "-")}`} />Current status <strong>{inquiry.status}</strong></div>
              <button className="button button-primary button-wide" onClick={updateStatus} disabled={saving}>
                {saving ? "Updating…" : actionLabel}
              </button>
              <button className="button button-secondary button-wide refresh-button" onClick={loadInquiry} disabled={loading}>Refresh inquiry</button>
              <p className="version-note">Your update is checked against the version you opened.</p>
            </aside>
          </div>
          <div className="detail-footer"><Link className="text-button" href="/">← Back to overview</Link><span>Last updated {new Date(inquiry.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span></div>
        </>
      ) : null}
    </main>
  );
}
