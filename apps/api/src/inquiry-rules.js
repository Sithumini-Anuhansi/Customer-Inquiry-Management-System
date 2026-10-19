export const inquiryStatuses = ["New", "In Progress", "Resolved"];

const allowedTransitions = {
  New: ["In Progress"],
  "In Progress": ["Resolved"],
  Resolved: ["In Progress"],
};

const inquiryFields = [
  ["customerName", 120],
  ["contact", 200],
  ["subject", 160],
  ["description", 2000],
];

export function hasAllowedStatus(status) {
  return inquiryStatuses.includes(status);
}

export function canTransitionStatus(currentStatus, nextStatus) {
  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

export function isValidInquiryId(id) {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function isValidExpectedVersion(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function validateInquiry(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Request body must be a JSON object." };
  const values = {};
  for (const [key, maxLength] of inquiryFields) {
    if (typeof body[key] !== "string" || !body[key].trim()) return { error: `${key} is required.` };
    values[key] = body[key].trim();
    if (values[key].length > maxLength) return { error: `${key} must be ${maxLength} characters or fewer.` };
  }
  return { values };
}
