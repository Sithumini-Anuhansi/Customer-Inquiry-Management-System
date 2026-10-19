# InquiTrack — Customer Inquiry Management System

InquiTrack is a small full-stack workspace for staff to sign in, record customer inquiries, find them later, and move them through a clear status lifecycle. It was built for the supplied Fullstack Development Technical Assessment, which evaluates the complete workflow across the frontend, API, and PostgreSQL database.

## Assessment workflow

- **Sign in:** seeded staff account; the API validates credentials and protects inquiry endpoints with an HTTP-only session cookie.
- **Capture:** authenticated staff can record a customer name, contact method, subject, and description. The API validates submissions independently of the form.
- **Find and review:** search by inquiry ID, customer, or status; filter by status; see inquiry and update dates; open an inquiry to review its details and status history.
- **Manage lifecycle:** move inquiries through `New`, `In Progress`, and `Resolved`, including reopening a resolved inquiry. The API rejects invalid transitions.
- **Persistence:** PostgreSQL is accessed through the Express API; the Next.js frontend does not use a mock-only backend.
- **Trust and feedback:** unauthenticated requests are rejected by the API; invalid IDs and missing records return distinct errors. The UI includes loading, empty, validation, API failure, and stale-update feedback. Updates carry the version last seen and return `409 Conflict` instead of silently overwriting a newer version.

## Stack and structure

- Frontend: Next.js and React in `apps/web`
- Backend: Node.js and Express in `apps/api`
- Database: PostgreSQL 16, started with Docker Compose
- Architecture: client–server, with a separate frontend and backend workspace in one repository. The API owns authentication, validation, workflow rules, and database access. This keeps the assessment-sized workflow understandable without the operational overhead of microservices.

## Prerequisites

- Node.js 20 or newer and npm
- Docker Desktop (or another Docker Compose implementation)

## Run locally

Run these commands from the repository root in PowerShell, Command Prompt, or a terminal:

```sh
copy .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run db:seed:inquiries
npm run dev
```

Open <http://localhost:3000>. The API health check is <http://localhost:4000/health>. The database is exposed on port `5433` so it does not conflict with a local PostgreSQL server on the default port.

The local demo login is **staff@example.com** / **staff123**. These credentials are deliberately simple for the assessment demonstration; use them only in a local development database. The seeder accepts passwords of at least 8 characters. For a non-demo environment, set a private password in `.env` before running `npm run db:seed`. The actual `.env` file is ignored by Git.

The seeded inquiry script creates or refreshes four examples with different inquiry/update dates and status history for in-progress and resolved examples. It is safe to rerun against the local assessment database.

## Tests and build

Run both focused test suites:

```sh
npm test
```

Run either suite separately:

```sh
npm run test --workspace=@inquiry/api
npm run test --workspace=@inquiry/web
```

Build the frontend for production:

```sh
npm run build
```

The backend tests cover inquiry input validation, malformed IDs, and allowed status transitions. The frontend test covers showing a server validation error while preserving entered form values. Current gaps include authenticated HTTP/database integration tests, session expiry tests, and full browser automation; those should be added next.

## Assessment demonstration recording

Record a 3–5 minute walkthrough. A suggested flow and evidence checklist are included below:

1. Start the local app and show the sign-in page. Sign in with the local demo account; do not show the `.env` file.
2. Show the inquiry overview, status statistics, search, seeded dates, and seeded status history.
3. Create an inquiry with valid customer/contact/subject/description values, save it, and show it in the list.
4. Search for it by its `INQ-ID-...` ID or customer name. Open the detail page and show its ID, inquiry date, and status history.
5. Change its status and show the updated status/date. Briefly show a seeded resolved or in-progress inquiry and explain that resolved inquiries may be reopened.
6. Demonstrate one failure: omit a required field and show the form/API validation feedback. Explain that validation also runs on the API.
7. Explain that inquiry APIs require a valid signed-in session and that a stale update returns `409 Conflict` with a reload/review message rather than silently overwriting newer data.
8. Close by explaining the client–server architecture choice and one trade-off or next improvement.

For screenshots, capture the signed-in overview with seeded data, the successful new inquiry in the list, the inquiry detail/history view, and the validation or stale-update feedback. Avoid capturing passwords or `.env` contents.

## API overview

- Authentication: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Inquiries: protected routes under `/api/inquiries` for list/search, create, detail, and update
- Health: `GET /health`

All inquiry routes require the HTTP-only session cookie. Database migrations are in `apps/api/db/migrations`.
