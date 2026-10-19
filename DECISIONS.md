# Design decisions

## Scope and assumptions

This is an internal workspace for a small service team. Any authenticated staff member may view and update every inquiry; records are not private to their creator. Registration is out of scope, so local seeded staff accounts will be used. The API is the security boundary: protected inquiry endpoints must require valid authentication and enforce the same access and lifecycle rules regardless of what the frontend displays.

## Access, validation, and lifecycle

- **Access:** all signed-in staff can list, view, create, and update inquiries. Unauthenticated requests return `401`. A malformed inquiry ID returns `400`, and a well-formed ID with no matching record returns `404`.
- **Customer input:** customer name, contact method, subject, and description are required and trimmed; the API validates them independently of the form. Possible duplicate submissions are accepted. A lightweight deduplication rule could reject legitimate repeat requests, so staff can identify and handle duplicates from the overview.
- **Status:** valid statuses are `New`, `In Progress`, and `Resolved`. Allowed transitions are `New → In Progress`, `In Progress → Resolved`, and `Resolved → In Progress` (reopen). Other transitions are rejected by the API with a clear client error; the UI should explain the allowed action.

## Stale records and trade-off

The overview and detail view should fetch the current server record when opened. Updates should include the version the user last saw (for example, `updated_at`); if another tab has changed the record, the API returns `409 Conflict` and the UI asks the user to refresh before trying again. This adds a small amount of request and UI handling but avoids silently overwriting another staff member’s update. Real-time synchronization is outside this assessment’s scope.

## AI assistance

AI helped scaffold the initial project and turn the assessment brief into implementation steps. The access and status rules above are deliberate project choices, not assumptions that the generated scaffold already enforces them. They still need to be implemented and tested in the API as the workflow is built.
