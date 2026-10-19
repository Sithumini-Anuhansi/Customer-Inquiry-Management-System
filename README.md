# Customer Inquiry Management System

A small full-stack application for staff to record, find, and manage customer inquiries.

## Stack

- Frontend: Next.js and React (`apps/web`)
- Backend: Node.js and Express (`apps/api`)
- Database: PostgreSQL 16 (Docker Compose)

## Architecture

The project uses a client–server architecture in a single repository. The Next.js frontend in `apps/web` is the client; it calls the Express API in `apps/api`, which owns authentication, request validation, business rules, and access to PostgreSQL. Keeping the frontend and backend in separate app folders makes their responsibilities clear while allowing both to be started from the repository root. The API can be organized into MVC-style routes/controllers, services, and data-access modules as the workflow is implemented; separate microservices are unnecessary for this project’s scope.

## Prerequisites

- Node.js 20 or newer and npm
- Docker Desktop (or another Docker Compose implementation)

## Run locally

1. Copy `.env.example` to `.env`. Change `SEED_STAFF_PASSWORD` to a private local password of at least 12 characters.
2. Start PostgreSQL with `docker compose up -d db`.
3. Install dependencies from the repository root with `npm install`.
4. Create the database tables with `npm run db:migrate`.
5. Create the local staff account with `npm run db:seed`. By default, it uses `staff@example.com` and the password you set in `.env`.
6. Start the API and frontend with `npm run dev`.
7. Open <http://localhost:3000>. The API health endpoint is <http://localhost:4000/health>.

The API provides `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` for session-based sign-in. Inquiry routes under `/api/inquiries` require the HTTP-only session cookie. The API validates inquiry input and status changes, and uses the inquiry `updatedAt` value to reject stale updates with `409 Conflict`.

The local database credentials are for development only. Seed credentials are read from `.env`; do not commit that file or reuse these credentials outside local development.
