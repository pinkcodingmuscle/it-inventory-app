# IT Inventory Application

Tracks IT inventory: stockable accessories and consumables (cables, docks, toner, peripherals, batteries), their quantities by location, checkouts/returns/adjustments, vendors, and purchase orders. Individually tracked assets (laptops, desktops), end users, and software licenses are intentionally out of scope; their lifecycle is managed in a separate system.

A React + TypeScript frontend backed by an Express API and a PostgreSQL database, following [docs/data-structure-proposal.md](docs/data-structure-proposal.md) for the domain model and [docs/database-persistence-proposal.md](docs/database-persistence-proposal.md) for the persistence architecture.

```text
React frontend (Vite)  --->  Express API (server/)  --->  PostgreSQL (Docker)
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)

## First-time setup

```bash
# 1. Start PostgreSQL
npm run db:up

# 2. Install and configure the API server
npm run server:install
# then create .env in the project root (see "Environment variables" below)

# 3. Create the schema and load development data
npm run db:migrate
npm run db:seed

# 4. Install frontend dependencies
npm install
```

## Environment variables

All configuration lives in a single `.env` at the project root, shared by the API server, the frontend and docker compose. It is gitignored; create it with:

```bash
# Server (API + database)
POSTGRES_PASSWORD=local_development_password
DATABASE_URL=postgresql://inventory_app:local_development_password@localhost:5432/it_inventory
PORT=4000
# Optional: pin CORS to a single origin (e.g. in production). If unset, any
# http://localhost:<port> origin is allowed, since Vite picks the next free
# port when 5173 is taken.
# CORS_ORIGIN=http://localhost:5173

# Frontend (Vite; only VITE_* vars are exposed to the browser)
# VITE_API_URL=http://localhost:4000/api
```

## Running the app

In two terminals:

```bash
npm run server:dev   # API on http://localhost:4000
npm run dev          # Frontend on http://localhost:5173 (or next free port)
```

The frontend reads `VITE_API_URL` (default `http://localhost:4000/api`); set it in the root `.env` if the API runs elsewhere.

## Everyday database commands

```bash
npm run db:up       # start Postgres (docker compose up -d postgres)
npm run db:down     # stop Postgres, keep data
npm run db:reset     # stop Postgres and DELETE the local volume
npm run db:migrate  # apply pending migrations
npm run db:seed     # reset to the repeatable development dataset
npm run db:import -- /absolute/path/to/inventory.xlsx --dry-run  # preview a real workbook
npm run db:import -- /absolute/path/to/inventory.xlsx --replace   # replace development data after validation and backup
```

The importer loads stock rows only; rows with an asset tag or serial number are skipped and counted as `skippedSerializedRows` in the summary. `--replace` replaces the inventory data (items, stock, history, vendors, locations, orders) but keeps users. `db:seed` resets everything, users included.

Migrations live in `server/migrations` and are generated from `server/src/db/schema.ts` via Drizzle Kit (`npm --prefix server run db:generate` after changing the schema).

## Project layout

- `src/` — React frontend. Pages render data from `src/lib/selectors.ts`, which reads a client-side cache (`src/data/store.ts`) populated by `DataProvider` (`src/context/DataContext.tsx`) from the API (`src/lib/api.ts`).
- `server/` — Express API, Drizzle ORM schema/migrations, and the transactional business logic for stock and purchase orders described in section 9 of the persistence proposal.
- `docker-compose.yml` — local PostgreSQL 16 with a named volume.

## Deployment (Netlify + Neon Postgres)

Production is one [Netlify](https://www.netlify.com) site plus a [Neon](https://neon.tech) database, both on free tiers:

- **Netlify** serves the React frontend and runs the Express API as a serverless function (`netlify/functions/api.ts` → `server/src/netlify.ts`). `netlify.toml` sends `/api/*` to the function, so the app and API share one address: no CORS setup, and the frontend calls `/api` directly.
- **Neon** holds the data. Local development still uses Docker Postgres; nothing changes there.

1. **Create the database.** Sign up at neon.tech and create a project in AWS US East 1 (N. Virginia), close to Netlify's default function region (US East, Ohio). On the project dashboard, click **Connect**, turn **Connection pooling on**, and copy the connection string. Serverless functions start many short-lived instances, and the pooler stops them running out of database connections.
2. **Make the URL verify TLS.** Replace the `sslmode=require` at the end of the copied URL with `sslmode=verify-full`. (node-postgres treats `require` as `verify-full` anyway and prints a security warning about it.)
   ```text
   postgresql://USER:PASSWORD@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=verify-full
   ```
3. **Create the Netlify site.** In Netlify, choose **Add new project → Import an existing project**, and pick this GitHub repository. The build settings come from `netlify.toml`, so leave them as they are.
4. **Set the database URL.** In **Site configuration → Environment variables**, add `DATABASE_URL` with the string from step 2. Give it to both **Builds** and **Functions** (the default "All scopes"). Then trigger a deploy. Each build:
   1. installs the API's dependencies
   2. applies pending database migrations (`npm run db:migrate`)
   3. builds the frontend

   Don't set `VITE_API_URL` on Netlify; production uses `/api` automatically.
5. **Load data** (pick one, run from your machine):
   ```bash
   # Fresh development dataset
   DATABASE_URL='<neon url>' npm run db:seed
   # Real workbook
   DATABASE_URL='<neon url>' npm run db:import -- /absolute/path/to/inventory.xlsx --replace
   # Or copy an existing database
   pg_dump --no-owner --no-acl -Fc '<old url>' -f inventory.dump
   pg_restore --no-owner --no-acl -d '<neon url>' inventory.dump
   ```
   An exported `DATABASE_URL` overrides the one in `.env`.

Every push to the branch Netlify builds from (usually `main`) deploys automatically, migrations included. Netlify also builds a preview for each pull request; preview builds run migrations against the same `DATABASE_URL`, so either give previews their own Neon branch (Environment variables → *Deploy contexts*) or review migrations before opening a PR.

Notes:
- If `DATABASE_URL` points anywhere other than localhost and has no `sslmode`, the API requires TLS anyway (`server/src/db/client.ts`).
- **First requests are slow:** after a quiet period, the first request can take a few seconds while Netlify starts the function and Neon wakes its compute (it suspends after a few minutes idle). Later requests are fast.
- **Database connections:** each function instance keeps a small pool of 3 connections (`PG_POOL_MAX` to change).
- **Backups:** Neon's free tier keeps only a short restore history. For business data, take regular `pg_dump` backups as well.
- **Tests:** they never use the Neon URL unless you point them at it. They read `TEST_DATABASE_URL` first, then fall back to a local test database.

## Trying risky changes on a Neon branch

Before anything that rewrites production data (a `--replace` import, a hand-written migration, bulk edits), try it on a [Neon branch](https://neon.com/docs/introduction/branching): an instant copy of the database that you can throw away.

```bash
neon branches create --name try-import            # copy of production, made in seconds
neon connection-string try-import                 # its URL (keep it out of chat/commits)
DATABASE_URL='<branch url>' npm run db:import -- /absolute/path/to/inventory.xlsx --replace
# ...check the result, e.g. run the API against the branch...
neon branches delete try-import                   # discard it
```

If it went well, repeat the command against production.

## Access (no sign-in)

There is no sign-in: the app is used by a two-person IT department, so it opens straight to the Dashboard and everyone can do everything. Every change is recorded in the item history as the shared **"IT Department"** user (created automatically the first time the API runs). Stock imported from the workbook shows as **"Data Importer"**.

**Anyone who has the site's address can view, change and delete the inventory.** Netlify addresses are public, so keep the link private. If that ever becomes a concern, the options are:
- Netlify's site-wide password protection (a paid Netlify feature)
- adding a sign-in back (it existed in commit `a816ef0`)

## Tests

```bash
npm --prefix server test   # API tests (vitest + supertest) against a local test database
npm run test:e2e           # browser tests (Playwright); see e2e/README.md for setup
```
