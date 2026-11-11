# Browser tests

`app.spec.ts` signs in and drives the app in Chromium: adding, checking out, editing and removing stock; vendors and locations; purchase orders (create, receive, cancel); shared settings; user accounts; permissions for a technician and a read-only user; reports; and the phone layout.

The tests **create, edit and delete records**, so run them against a throwaway copy of the database, never Neon production.

## One-time setup

```bash
npx playwright install chromium     # browser binary, if you don't have it yet
```

## Running

1. Make a throwaway database. You can copy your local one, or seed an empty one:
   ```bash
   docker exec it-inventory-postgres psql -U inventory_app -d postgres \
     -c "DROP DATABASE IF EXISTS it_inventory_e2e" -c "CREATE DATABASE it_inventory_e2e TEMPLATE it_inventory"
   export DATABASE_URL=postgresql://inventory_app:local_development_password@localhost:5432/it_inventory_e2e
   npm run db:migrate
   ```
   The tests need at least one stock line in it, and a location to add items to.
2. Create the two test users:
   ```bash
   NEW_PASSWORD=e2e-admin-password npm run user:set-password -- admin@e2e.local --name "E2E Admin"
   NEW_PASSWORD=e2e-tech-password  npm run user:set-password -- tech@e2e.local --name "E2E Tech" --role "Tech Support"
   ```
3. Start the API against it (same shell, so it picks up `DATABASE_URL`), and the frontend in another terminal:
   ```bash
   npm run server:dev
   npm run dev
   ```
4. Run the tests:
   ```bash
   E2E_ADMIN_EMAIL=admin@e2e.local E2E_ADMIN_PASSWORD=e2e-admin-password \
   E2E_TECH_EMAIL=tech@e2e.local  E2E_TECH_PASSWORD=e2e-tech-password \
   npm run test:e2e
   ```

`E2E_BASE_URL` overrides the frontend address (default `http://localhost:5173`). If you run the test frontend on another port, start the API with a matching `CORS_ORIGIN` (e.g. `CORS_ORIGIN=http://localhost:5199`); otherwise every sign-in fails. The API keeps the sign-up limit (20 per hour per IP) in memory, so restart it if you rerun the suite many times in an hour. Each run uses unique names, so the database can be reused between runs. Records the tests create and don't delete (vendors, items, purchase orders, deactivated users) build up over time, so recreate the database now and then.
