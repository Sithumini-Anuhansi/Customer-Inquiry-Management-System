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

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d db`.
3. Install dependencies from the repository root with `npm install`.
4. Start the API and frontend with `npm run dev`.
5. Open <http://localhost:3000>. The API health endpoint is <http://localhost:4000/health>.

The local database credentials are for development only. Seeded staff accounts will be documented here when authentication and the seed script are implemented.
