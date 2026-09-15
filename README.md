# IT Inventory Application

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
cp server/.env.example server/.env

# 3. Create the schema and load development data
npm run db:migrate
npm run db:seed

# 4. Install frontend dependencies
npm install
```

## Running the app

In two terminals:

```bash
npm run server:dev   # API on http://localhost:4000
npm run dev          # Frontend on http://localhost:5173 (or next free port)
```

The frontend reads `VITE_API_URL` (default `http://localhost:4000/api`); set it in a `.env.local` file if the API runs elsewhere.

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

Migrations live in `server/migrations` and are generated from `server/src/db/schema.ts` via Drizzle Kit (`npm --prefix server run db:generate` after changing the schema).

## Project layout

- `src/` — React frontend. Pages render data from `src/lib/selectors.ts`, which reads a client-side cache (`src/data/store.ts`) populated by `DataProvider` (`src/context/DataContext.tsx`) from the API (`src/lib/api.ts`).
- `server/` — Express API, Drizzle ORM schema/migrations, and the transactional business logic for stock, purchase orders, assets, and software licensing described in section 9 of the persistence proposal.
- `docker-compose.yml` — local PostgreSQL 16 with a named volume.

## Authorization stub

There is no login flow yet. Requests identify the acting user via an `x-user-id` header (or fall back to a seeded administrator), and that user's job-title `role` is mapped onto one of four permission tiers (administrator / inventory manager / technician / read-only) from section 10 of the persistence proposal. See `server/src/middleware/auth.ts` — this is a development placeholder, not real authentication, and should be replaced before this ever handles production data.

## Tests

```bash
npm --prefix server test
```
