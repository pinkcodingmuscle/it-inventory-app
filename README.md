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

# 4. Give yourself a sign-in (seeded users have no passwords)
npm run user:set-password -- e.mukuye@kayaku.com   # or any email, plus --name "Full Name" to create a new admin

# 5. Install frontend dependencies
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
npm run user:set-password -- you@example.com [--name "Full Name"] [--role "IT Administrator"]  # set a password / create a user
```

The importer loads stock rows only; rows with an asset tag or serial number are skipped and counted as `skippedSerializedRows` in the summary. `--replace` replaces the inventory data (items, stock, history, vendors, locations, orders) but keeps users, so sign-ins survive a re-import. `db:seed` resets everything, users included.

Migrations live in `server/migrations` and are generated from `server/src/db/schema.ts` via Drizzle Kit (`npm --prefix server run db:generate` after changing the schema).

## Project layout

- `src/` — React frontend. Pages render data from `src/lib/selectors.ts`, which reads a client-side cache (`src/data/store.ts`) populated by `DataProvider` (`src/context/DataContext.tsx`) from the API (`src/lib/api.ts`).
- `server/` — Express API, Drizzle ORM schema/migrations, and the transactional business logic for stock and purchase orders described in section 9 of the persistence proposal.
- `docker-compose.yml` — local PostgreSQL 16 with a named volume.

## Deployment (Render API + Neon Postgres)

Production uses [Neon](https://neon.tech) serverless Postgres (free tier) for the database and a Render Web Service for the API (`render.yaml`). Local development still uses Docker Postgres; nothing changes there.

1. **Create the database.** Sign up at neon.tech and create a project, in the same region as the Render service: currently AWS US East 1 (N. Virginia) for Neon and `virginia` for Render. Each request makes several sequential queries, so a cross-country API↔database link adds hundreds of milliseconds. On the project dashboard, click **Connect** and copy the connection string. Use the **direct** string (pooling toggle off): the API keeps its own small connection pool, so Neon's pooler isn't needed.
2. **Make the URL verify TLS.** Replace the `sslmode=require` at the end of the copied URL with `sslmode=verify-full`. (node-postgres treats `require` as `verify-full` anyway and prints a security warning about it.)
   ```text
   postgresql://USER:PASSWORD@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=verify-full
   ```
3. **Point Render at it.** In the Render dashboard, set the service's `DATABASE_URL` to that string. Also set `CORS_ORIGIN` to the frontend's URL, and `NODE_ENV=production`. On the next deploy, the `preDeployCommand` (`npm run db:migrate`) creates the schema in Neon.
4. **Load data** (pick one, run from your machine):
   ```bash
   # Fresh development dataset
   DATABASE_URL='<neon url>' npm run db:seed
   # Real workbook
   DATABASE_URL='<neon url>' npm run db:import -- /absolute/path/to/inventory.xlsx --replace
   # Or copy an existing database (e.g. a previous Render Postgres)
   pg_dump --no-owner --no-acl -Fc '<old url>' -f inventory.dump
   pg_restore --no-owner --no-acl -d '<neon url>' inventory.dump
   ```
   An exported `DATABASE_URL` overrides the one in `.env`.
5. **Create the first sign-in.** Nobody can sign in until someone has a password. Create yourself as an administrator (you'll be asked for the password twice; it isn't echoed):
   ```bash
   DATABASE_URL='<neon url>' npm run user:set-password -- you@example.com --name "Your Name"
   ```
   Then add everyone else from **Settings → Users** in the app.
6. **Frontend.** Build it with `VITE_API_URL=https://<render-service>.onrender.com/api` (set it in Netlify's environment variables).

Notes:
- If `DATABASE_URL` points anywhere other than localhost and has no `sslmode`, the API requires TLS anyway (`server/src/db/client.ts`).
- Neon's free compute suspends after a few minutes idle; the first query afterwards takes roughly a second while it wakes. `/api/health` deliberately doesn't touch the database, so Render's health checks don't keep it awake and use up the free compute hours.
- Neon's free tier keeps only a short restore history. For business data, take regular `pg_dump` backups as well.
- Tests never use the Neon URL unless you point them at it: they read `TEST_DATABASE_URL` first, then fall back to a local test database.

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

## Sign-in and permissions

Everyone signs in with an email and password (`POST /api/auth/login`). New staff can request an account from the sign-in page's **Create account** tab (`POST /api/auth/signup`): the account starts as *pending* with view-only access and can't sign in until an administrator approves it, choosing its role, in **Settings → Users** (the bell shows administrators how many requests are waiting). Declining deletes the request. Sign-ups are limited to 20 per IP address per hour (`SIGNUPS_PER_HOUR` to change). The very first administrator still has to be created with `npm run user:set-password`, so a stranger can't sign up and approve themselves. Passwords are stored as scrypt hashes; the browser holds a random session token (7 days), and only its SHA-256 hash is stored in the `sessions` table. Every API route except `/api/auth/login` and `/api/health` requires a session. After 10 failed sign-ins for one email or IP address within 15 minutes, further attempts are refused until the window passes.

The `users` table holds the IT staff who operate the system (for permissions and the transaction audit trail), not tracked end users. Each user's job-title `role` maps onto a permission tier (`server/src/middleware/auth.ts`):

| Role contains | Tier | Can |
| --- | --- | --- |
| "Administrator" | administrator | everything, including **Settings → Users** (add users, change roles, deactivate, reset passwords) |
| "Manager" | inventory manager | add/edit/delete items, vendors, locations and purchase orders; recount stock; change settings |
| "Support", "Technician" or "Engineer" | technician | view everything; check stock out and back in |
| anything else (e.g. "Viewer") | read only | view everything |

The UI hides actions a user can't perform, and the API enforces the same rules. Forgotten passwords are reset by an administrator in Settings, or with `npm run user:set-password` from a machine with database access.

## Tests

```bash
npm --prefix server test   # API tests (vitest + supertest) against a local test database
npm run test:e2e           # browser tests (Playwright); see e2e/README.md for setup
```
