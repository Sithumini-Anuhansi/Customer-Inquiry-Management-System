import { Router } from "express";
import { query } from "./db.js";
import { requireAuth } from "./security.js";
import { canTransitionStatus, hasAllowedStatus, isValidExpectedVersion, isValidInquiryId, validateInquiry } from "./inquiry-rules.js";

export const inquiriesRouter = Router();

inquiriesRouter.use(requireAuth);

inquiriesRouter.get("/", async (request, response, next) => {
  const { search = "", status = "" } = request.query;
  if (typeof search !== "string" || search.length > 200) return response.status(400).json({ error: "Search must be 200 characters or fewer." });
  if (typeof status !== "string" || (status && !hasAllowedStatus(status))) return response.status(400).json({ error: "Status filter is invalid." });

  try {
    const { rows } = await query(
      `SELECT i.id, i.customer_name AS "customerName", i.contact, i.subject, i.description,
              i.status, i.created_at AS "createdAt", i.updated_at AS "updatedAt",
              u.display_name AS "createdBy"
       FROM inquiries i JOIN staff_users u ON u.id = i.created_by
       WHERE ($1 = '' OR i.status = $1)
         AND ($2 = '' OR concat_ws(' ', i.customer_name, i.contact, i.subject, i.description) ILIKE '%' || $2 || '%')
       ORDER BY i.updated_at DESC, i.id`,
      [status, search.trim()],
    );
    return response.json({ inquiries: rows });
  } catch (error) {
    return next(error);
  }
});

inquiriesRouter.post("/", async (request, response, next) => {
  const { values, error } = validateInquiry(request.body);
  if (error) return response.status(400).json({ error });
  try {
    const { rows } = await query(
      `INSERT INTO inquiries (customer_name, contact, subject, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, customer_name AS "customerName", contact, subject, description, status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [values.customerName, values.contact, values.subject, values.description, request.user.id],
    );
    return response.status(201).json({ inquiry: rows[0] });
  } catch (error) {
    return next(error);
  }
});

inquiriesRouter.get("/:id", async (request, response, next) => {
  if (!isValidInquiryId(request.params.id)) return response.status(400).json({ error: "Inquiry ID must be a valid UUID." });
  try {
    const { rows } = await query(
      `SELECT i.id, i.customer_name AS "customerName", i.contact, i.subject, i.description,
              i.status, i.created_at AS "createdAt", i.updated_at AS "updatedAt",
              u.display_name AS "createdBy"
       FROM inquiries i JOIN staff_users u ON u.id = i.created_by WHERE i.id = $1`,
      [request.params.id],
    );
    if (!rows[0]) return response.status(404).json({ error: "Inquiry was not found." });
    return response.json({ inquiry: rows[0] });
  } catch (error) {
    return next(error);
  }
});

inquiriesRouter.patch("/:id/status", async (request, response, next) => {
  const { id } = request.params;
  if (!isValidInquiryId(id)) return response.status(400).json({ error: "Inquiry ID must be a valid UUID." });
  const { status, expectedUpdatedAt } = request.body ?? {};
  if (!hasAllowedStatus(status)) return response.status(400).json({ error: "Status must be New, In Progress, or Resolved." });
  if (!isValidExpectedVersion(expectedUpdatedAt)) return response.status(400).json({ error: "expectedUpdatedAt must be a valid timestamp from the inquiry you viewed." });

  try {
    const currentResult = await query("SELECT status, updated_at AS \"updatedAt\" FROM inquiries WHERE id = $1", [id]);
    const current = currentResult.rows[0];
    if (!current) return response.status(404).json({ error: "Inquiry was not found." });
    if (new Date(current.updatedAt).getTime() !== Date.parse(expectedUpdatedAt)) {
      return response.status(409).json({ error: "This inquiry changed after you opened it. Refresh to see the latest status.", currentStatus: current.status, updatedAt: current.updatedAt });
    }
    if (!canTransitionStatus(current.status, status)) {
      return response.status(409).json({ error: `Cannot change status from ${current.status} to ${status}.`, currentStatus: current.status });
    }

    const { rows } = await query(
      `UPDATE inquiries SET status = $1 WHERE id = $2 AND updated_at = $3
       RETURNING id, customer_name AS "customerName", contact, subject, description, status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [status, id, current.updatedAt],
    );
    if (!rows[0]) {
      return response.status(409).json({ error: "This inquiry changed after you opened it. Refresh to see the latest status." });
    }
    return response.json({ inquiry: rows[0] });
  } catch (error) {
    return next(error);
  }
});
