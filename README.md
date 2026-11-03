# NoX Organizer

A self-hosted, single-user web app for organizing **projects**, **ideas**, and a
**dependency-aware work queue**. Keep track of what you're working on, what's blocked,
and what's next — with projects and ideas linked together by explicit dependencies.

## Features

- **Work queue** (`/queue`) — items ordered by status: *Ready*, *In progress*, and
  *Blocked* (with the things blocking each item surfaced). Reorder queued items with
  move up/down.
- **Projects** (`/projects`) — create, edit, and update the status of projects.
- **Ideas** (`/ideas`) — capture ideas; link them to projects (or leave them
  standalone). Promote an idea to a project.
- **Item detail** (`/items/[id]`) — full view of any project or idea, including
  descriptions, dependencies, and linked ideas.
- **Dependency-aware readiness** — an item is *Ready* only when all of its
  prerequisites are done; cycles are prevented when adding dependencies.
- **Status workflow** — `backlog → queued → in_progress → done` (plus `dropped`),
  with the transition rules enforced in one place.
- **Theming** — system / light / dark via `next-themes`.
- **Responsive** — desktop sidebar layout, mobile bottom navigation with a FAB.

## Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Partial Prerender)          |
| Language   | TypeScript                                          |
| Styling    | Tailwind CSS v4 + shadcn/ui                         |
| Theming    | next-themes                                         |
| Database   | SQLite (file) via Prisma 7 + better-sqlite3         |
| Forms      | react-hook-form + zod                               |
| Deployment | Docker + docker-compose                             |

## Getting started (local dev)

```bash
npm install
cp .env.example .env
npx prisma migrate deploy   # creates data/nox.db
npm run dev
```

Open <http://localhost:3000> — `/` redirects to the work queue at `/queue`.

The database lives at `data/nox.db` (gitignored). Reset it by deleting the file and
re-running `npx prisma migrate deploy`.

**Environment variables** (see `.env.example`):

| Variable       | Default             | Description                    |
| -------------- | ------------------- | ------------------------------ |
| `DATABASE_URL` | `file:./data/nox.db` | SQLite file location (relative to the app). |

## Scripts

| Script                    | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `npm run dev`             | Dev server (Turbopack) on :3000                        |
| `npm run build`           | Production build                                       |
| `npm run start`           | Serve the production build                             |
| `npm run lint`            | ESLint                                                 |
| `npx tsx scripts/test-domain.ts`   | Unit tests for the pure domain logic (transitions, cycle detection, ready/blocked, ordering) |
| `npx tsx scripts/e2e-smoke.ts`     | Playwright smoke test covering the acceptance criteria (needs the dev server running) |

## Docker

The container builds the Next.js app and runs migrations on start. Data is stored in
a named volume so it survives container rebuilds.

```bash
docker compose up -d --build
```

Then open <http://localhost:3000>.

- Database file: `/data/nox.db` inside the `nox-data` volume.
- To reset all data: `docker compose down -v && docker compose up -d`.

## Project layout

```
app/
  queue/          Work queue view
  projects/       Projects view
  ideas/          Ideas view
  items/[id]/     Item detail view
  layout.tsx      App shell: sidebar (desktop) / bottom nav (mobile)
components/       UI components (forms, dialogs, queue cards, etc.)
lib/
  domain/         Pure, tested domain logic (status rules, dependencies, queue)
  actions/        Server actions
  db/             Prisma client + queries
prisma/           Schema + migrations
scripts/          Domain tests, e2e smoke test, Docker entrypoint
```

## Design notes

- **Partial Prerender**: pages are a static shell plus streamed database data
  (Suspense boundaries), so navigation is instant and the DB is only touched for
  the dynamic parts.
- **Optimistic UI**: actions use `React.useOptimistic`; the server re-render
  reconciles, and failed actions revert.
- **Single source of truth**: status transition rules and dependency cycle
  detection live in `lib/domain/` and are unit-tested.
