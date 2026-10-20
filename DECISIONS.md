# Design decisions

## Assumptions and access

This is an internal workspace for a small service team. Registration is outside the assessment scope, so staff accounts are seeded locally. Any authenticated staff member can view and update every inquiry; records are not private to their creator. This simple shared-workspace rule is enforced by the API, which is the security boundary. Hiding a route or button in the frontend is not treated as authorization.

Customer name, contact method, subject, and description are required and trimmed. The UI gives immediate feedback, and the API repeats the validation so direct requests cannot bypass it. Possible duplicates are accepted: a complex deduplication rule could reject legitimate repeat requests, while staff can identify duplicates from the overview and details.

## Architecture and workflow

The application uses a client–server architecture in a single repository: Next.js/React in `apps/web`, Express in `apps/api`, and PostgreSQL behind the API. The frontend and backend have separate folders and responsibilities, but can be installed and run together from the root. The API owns authentication, validation, status rules, and database access. I chose not to use microservices because this assessment has one compact workflow; splitting it would add deployment and communication overhead without improving the user outcome.

Valid statuses are `New`, `In Progress`, and `Resolved`. The normal path is `New → In Progress → Resolved`; a resolved inquiry can be reopened to `In Progress`. Other transitions are rejected by the API. The application records status history with timestamps and the staff member responsible, so the detail view shows how the inquiry reached its current state.

The overview supports search and status filtering, displays stable counts and dates, and gives loading, empty, validation, and API error states. Inquiry creation and status changes persist through the API to PostgreSQL.

## Trade-off: stale updates

The detail view submits the `updated_at` value the user last saw. If a second browser tab has already changed the record, the API returns `409 Conflict`; the UI reloads the latest record and explains the conflict before the user tries again. This adds version handling to the workflow but prevents silent overwrites. Real-time synchronization and automatic field-level merging are outside the assessment scope.

## Testing and next improvement

The test coverage includes backend unit tests for inquiry validation, ID validation, and status transitions; a frontend test for server validation feedback; API/PostgreSQL integration tests for authentication, protected access, persistence, status history, stale-version conflicts, session expiry, and logout; and Playwright browser tests for the staff workflow and a stale update across two tabs. Integration tests create and remove a unique schema in a disposable test database. Browser tests use a separate `inquiry_e2e` database so generated test inquiries do not mix with development data.

The browser suite does not yet automate every loading, empty, and validation state, or a signed-out user opening a direct inquiry URL. These are useful next tests. The access policy is intentionally that every authenticated staff member can view and update every inquiry, so record ownership does not restrict direct links.

## AI assistance

AI helped scaffold the initial project and translate the assessment brief into an implementation plan. I accepted the recommendation to keep the frontend and API in separate workspace folders with client–server communication. I rejected microservices as unnecessary for this scope. I reviewed the access, lifecycle, duplicate-submission, and stale-update choices and implemented those rules in the API so they are not only interface decisions.
