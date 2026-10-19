import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionStatus, isValidInquiryId, validateInquiry } from "../src/inquiry-rules.js";

test("inquiry validation rejects missing fields and trims accepted values", () => {
  const missingContact = validateInquiry({ customerName: "Jamie", subject: "A question", description: "Please call me." });
  assert.equal(missingContact.error, "contact is required.");

  const valid = validateInquiry({
    customerName: "  Jamie Lee  ",
    contact: " jamie@example.com ",
    subject: "  Opening hours  ",
    description: "  Are you open on Sunday?  ",
  });
  assert.deepEqual(valid.values, {
    customerName: "Jamie Lee",
    contact: "jamie@example.com",
    subject: "Opening hours",
    description: "Are you open on Sunday?",
  });
});

test("status transitions permit the lifecycle and reopening, but reject skipped steps", () => {
  assert.equal(canTransitionStatus("New", "In Progress"), true);
  assert.equal(canTransitionStatus("In Progress", "Resolved"), true);
  assert.equal(canTransitionStatus("Resolved", "In Progress"), true);
  assert.equal(canTransitionStatus("New", "Resolved"), false);
  assert.equal(canTransitionStatus("Resolved", "New"), false);
});

test("inquiry IDs must be valid UUIDs before they reach PostgreSQL", () => {
  assert.equal(isValidInquiryId("d9428888-122b-11e1-b85c-61cd3cbb3210"), true);
  assert.equal(isValidInquiryId("not-an-id"), false);
});
