"use client";

import { useState } from "react";
import { apiRequest } from "../lib/api";

function ErrorMessage({ children }) {
  return <div className="notice notice-error" role="alert">{children}</div>;
}

export default function NewInquiryForm({ onCreated, onCancel }) {
  const [values, setValues] = useState({ customerName: "", contact: "", subject: "", description: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiRequest("/api/inquiries", { method: "POST", body: JSON.stringify(values) });
      onCreated(result.inquiry);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel form-panel" aria-labelledby="new-inquiry-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CAPTURE A REQUEST</p>
          <h2 id="new-inquiry-title">New inquiry</h2>
          <p className="muted form-guidance">Repeat requests can be tracked separately. Search existing inquiries first if you want to check what is already recorded.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Close new inquiry form" onClick={onCancel}>×</button>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <form className="inquiry-form" aria-label="New customer inquiry" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="customerName">Customer name</label>
            <input id="customerName" required maxLength={120} value={values.customerName} onChange={(event) => update("customerName", event.target.value)} placeholder="e.g. Alex Morgan" />
          </div>
          <div className="field">
            <label htmlFor="contact">Contact details</label>
            <input id="contact" required maxLength={200} value={values.contact} onChange={(event) => update("contact", event.target.value)} placeholder="Email or phone number" />
          </div>
          <div className="field field-full">
            <label htmlFor="subject">Subject</label>
            <input id="subject" required maxLength={160} value={values.subject} onChange={(event) => update("subject", event.target.value)} placeholder="What do they need help with?" />
          </div>
          <div className="field field-full">
            <label htmlFor="description">Description</label>
            <textarea id="description" required maxLength={2000} rows={4} value={values.description} onChange={(event) => update("description", event.target.value)} placeholder="Add the key details so the next person has the full picture." />
            <span className="field-hint">Up to 2,000 characters</span>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save inquiry"}</button>
        </div>
      </form>
    </section>
  );
}
