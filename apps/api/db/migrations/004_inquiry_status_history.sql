CREATE TABLE IF NOT EXISTS inquiry_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  from_status text CHECK (from_status IS NULL OR from_status IN ('New', 'In Progress', 'Resolved')),
  to_status text NOT NULL CHECK (to_status IN ('New', 'In Progress', 'Resolved')),
  changed_by uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds', now())
);

CREATE INDEX IF NOT EXISTS inquiry_status_history_inquiry_changed_idx
  ON inquiry_status_history(inquiry_id, changed_at DESC, id DESC);
