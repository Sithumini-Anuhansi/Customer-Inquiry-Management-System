import { query, pool } from "../src/db.js";

const samples = [
  {
    customerName: "Maya Perera",
    contact: "maya.perera@example.com",
    subject: "Refund for delayed delivery",
    description: "My order arrived after the promised delivery window. Could you please check whether the delivery fee can be refunded?",
    status: "New",
    createdDaysAgo: 12,
    updatedDaysAgo: 2,
  },
  {
    customerName: "Nimal Fernando",
    contact: "+94 77 000 0102",
    subject: "Change delivery address",
    description: "I need to update the delivery address for my recent order. Please contact me before the parcel is dispatched.",
    status: "In Progress",
    createdDaysAgo: 9,
    updatedDaysAgo: 1,
    history: [
      { fromStatus: null, toStatus: "New", daysAgo: 9 },
      { fromStatus: "New", toStatus: "In Progress", daysAgo: 1 },
    ],
  },
  {
    customerName: "Amara Wijesinghe",
    contact: "amara.wijesinghe@example.com",
    subject: "Product warranty details",
    description: "Could you share the warranty period and explain how I can request service if the product develops a fault?",
    status: "Resolved",
    createdDaysAgo: 6,
    updatedDaysAgo: 4,
    history: [
      { fromStatus: null, toStatus: "New", daysAgo: 6 },
      { fromStatus: "New", toStatus: "In Progress", daysAgo: 5 },
      { fromStatus: "In Progress", toStatus: "Resolved", daysAgo: 4 },
    ],
  },
  {
    customerName: "Devin Silva",
    contact: "+94 71 000 0304",
    subject: "Copy of purchase invoice",
    description: "I misplaced the invoice for my recent purchase. Please send me a copy by email when convenient.",
    status: "New",
    createdDaysAgo: 2,
    updatedDaysAgo: 1,
  },
];

try {
  const email = process.env.SEED_STAFF_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set SEED_STAFF_EMAIL before seeding inquiries.");

  const { rows } = await query("SELECT id FROM staff_users WHERE email = $1", [email]);
  const staffId = rows[0]?.id;
  if (!staffId) throw new Error(`No seeded staff account found for ${email}. Run npm run db:seed first.`);

  const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let inserted = 0;
  let refreshed = 0;
  let historiesSeeded = 0;
  for (const inquiry of samples) {
    const createdAt = daysAgo(inquiry.createdDaysAgo);
    const updatedAt = daysAgo(inquiry.updatedDaysAgo);
    const existing = await query(
      "SELECT id, status FROM inquiries WHERE customer_name = $1::text AND subject = $2::text LIMIT 1",
      [inquiry.customerName, inquiry.subject],
    );

    let inquiryId;
    let currentStatus;
    if (existing.rows.length > 0) {
      inquiryId = existing.rows[0].id;
      currentStatus = existing.rows[0].status;
      await query("UPDATE inquiries SET created_at = $1, updated_at = $2 WHERE id = $3", [createdAt, updatedAt, inquiryId]);
      refreshed += 1;
    } else {
      const result = await query(
        `INSERT INTO inquiries (customer_name, contact, subject, description, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [inquiry.customerName, inquiry.contact, inquiry.subject, inquiry.description, inquiry.status, staffId, createdAt, updatedAt],
      );
      inquiryId = result.rows[0].id;
      currentStatus = inquiry.status;
      inserted += result.rowCount;
    }

    if (currentStatus !== inquiry.status) continue;
    for (const change of inquiry.history ?? []) {
      const changedAt = daysAgo(change.daysAgo);
      const existingHistory = await query(
        `SELECT id FROM inquiry_status_history
         WHERE inquiry_id = $1 AND from_status IS NOT DISTINCT FROM $2 AND to_status = $3
         ORDER BY id LIMIT 1`,
        [inquiryId, change.fromStatus, change.toStatus],
      );
      if (existingHistory.rows[0]) {
        await query("UPDATE inquiry_status_history SET changed_at = $1, changed_by = $2 WHERE id = $3", [changedAt, staffId, existingHistory.rows[0].id]);
      } else {
        await query(
          `INSERT INTO inquiry_status_history (inquiry_id, from_status, to_status, changed_at, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [inquiryId, change.fromStatus, change.toStatus, changedAt, staffId],
        );
      }
      historiesSeeded += 1;
    }
  }

  console.log(`Added ${inserted} sample inquiries, refreshed dates on ${refreshed} existing samples, and seeded ${historiesSeeded} history events.`);
} catch (error) {
  console.error("Inquiry seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
