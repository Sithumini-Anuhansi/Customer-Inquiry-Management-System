"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, ApiError } from "../../../lib/api";
import { formatInquiryDate } from "../../../lib/format-date";

function ErrorMessage({ children, onRetry }) {
  return <div className="notice notice-error" role="alert"><span>{children}</span>{onRetry && <button className="text-button" type="button" onClick={() => onRetry()}>Try again</button>}</div>;
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
      setInquiry((current) => ({
        ...result.inquiry,
        statusHistory: [result.statusChange, ...(current?.statusHistory ?? [])],
      }));
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
        <Link href="/" className="brand-lockup" aria-label="InquiTrack home">
          <Image className="brand-symbol" src="/logo.png" alt="" width={50} height={38} priority />
          <Image className="brand-logo" src="/inquitrack-wordmark.png" alt="InquiTrack" width={158} height={45} priority />
        </Link>
        <Link href="/" className="text-button">← All inquiries</Link>
      </header>

      <div className="breadcrumb"><Link href="/">Inquiries</Link><span aria-hidden="true">/</span><span>Details</span></div>
      {loading ? <div className="state-block" role="status"><span className="spinner" /> Loading inquiry…</div> : error ? <ErrorMessage onRetry={loadInquiry}>{error}</ErrorMessage> : inquiry ? (
        <>
          {conflict && <div className="notice notice-warning" role="status">{conflict}</div>}
          <section className="detail-heading">
            <div>
              <p className="eyebrow">INQUIRY DETAILS</p>
              <p className="detail-id-badge"><span>Inquiry ID</span><strong>{inquiry.displayId}</strong></p>
              <h1>{inquiry.subject}</h1>
              <div className="detail-meta">
                <p className="muted">Date of inquiry: <time dateTime={inquiry.createdAt}>{formatInquiryDate(inquiry.createdAt)}</time></p>
                <span className={`status-pill status-${inquiry.status.toLowerCase().replaceAll(" ", "-")}`}>{inquiry.status}</span>
              </div>
            </div>
          </section>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="detail-grid">
            <section className="panel detail-main">
              <p className="eyebrow">CUSTOMER REQUEST DETAILS</p>
              <h2>{inquiry.customerName}</h2>
              <a className="contact-link" href={inquiry.contact.includes("@") ? `mailto:${inquiry.contact}` : undefined}>{inquiry.contact}</a>
              <div className="detail-divider" />
              <h3>Inquiry description</h3>
              <p className="description-text">{inquiry.description}</p>
            </section>
            <aside className="panel detail-aside">
              <p className="eyebrow">WORKFLOW</p>
              <h2>Status and next steps</h2>
              <p className="muted">Use the button below to move this inquiry to its next status.</p>
              <div className="workflow-current"><span className={`status-dot dot-${inquiry.status.toLowerCase().replaceAll(" ", "-")}`} />Current status <strong>{inquiry.status}</strong></div>
              <button className="button button-primary button-wide" onClick={updateStatus} disabled={saving}>
                {saving ? "Updating…" : actionLabel}
              </button>
              <button className="button button-secondary button-wide refresh-button" onClick={loadInquiry} disabled={loading}>Refresh inquiry</button>
              <p className="version-note">We check for newer changes before saving so you don’t overwrite someone else’s update.</p>
            </aside>
          </div>
          <section className="panel status-history-panel" aria-labelledby="status-history-title">
            <p className="eyebrow">ACTIVITY</p>
            <h2 id="status-history-title">Status history</h2>
            {inquiry.statusHistory?.length ? (
              <ol className="status-history-list">
                {inquiry.statusHistory.map((change, index) => (
                  <li key={`${change.changedAt}-${index}`}>
                    <span className="history-marker" aria-hidden="true" />
                    <div className="history-entry">
                      <strong>{change.fromStatus ? `${change.fromStatus} → ${change.toStatus}` : `Inquiry created · ${change.toStatus}`}</strong>
                      <time dateTime={change.changedAt}>{formatInquiryDate(change.changedAt)}</time>
                      {change.changedBy && <span>By {change.changedBy}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted history-empty">No status changes have been recorded for this inquiry yet.</p>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
