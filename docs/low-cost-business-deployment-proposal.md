# IT Inventory Application: Low-Cost Business Deployment Proposal

## 1. Recommendation

Deploy the application using:

```text
Netlify       React/Vite frontend
Render        Express/Node.js API
Render        Managed PostgreSQL database
```

This is the recommended low-cost deployment for the current application because it matches the existing architecture without requiring a rewrite.

- The frontend is already a Vite application and can remain on Netlify.
- The backend is already an Express server and can run as a Render Web Service.
- The database is already PostgreSQL and is accessed through Drizzle ORM.
- The API and database can be managed within the same provider and region.
- The real inventory workbook can be imported into the hosted PostgreSQL database.

## 2. Estimated Cost

The expected starting configuration is:

| Service | Plan | Estimated cost |
| --- | --- | --- |
| Netlify frontend | Free static hosting | $0/month |
| Render API | Starter Web Service | Approximately $7/month |
| Render PostgreSQL | Basic-256mb | Approximately $6/month |
| **Estimated total** |  | **Approximately $13/month** |

Actual charges may vary based on bandwidth, storage, and provider pricing changes. The provider's current pricing page should be checked before deployment.

This configuration is intended for a small internal business application, early production use, or a low-traffic inventory system. It should be upgraded as usage, availability, backup, or compliance requirements increase.

## 3. Why Not Use Free Database Hosting for Business Data

Free services are useful for development and demonstrations, but they have limitations that make them inappropriate as the primary business database:

- Free database instances may expire, pause, or restart.
- Free services may not include managed backups or point-in-time recovery.
- Free API services may sleep after periods of inactivity.
- Cold starts can make the application appear unavailable to users.
- Storage and connection limits may be too restrictive as inventory grows.

The paid database plan is the most important part of this recommendation because the inventory records are business data.

## 4. Deployment Architecture

```text
User browser
     |
     v
Netlify React frontend
     |
     | HTTPS API requests
     v
Render Express API
     |
     | private or secured PostgreSQL connection
     v
Render PostgreSQL
```

The browser must never connect directly to PostgreSQL. Database credentials must remain on the backend.

## 5. Render API Configuration

Create a Render Web Service connected to the repository.

Recommended settings:

```text
Root Directory: server
Build Command: npm install && npm run build
Start Command: npm start
Plan: Starter
```

The current server already reads the hosting provider's assigned port:

```ts
const port = Number(process.env.PORT ?? 4000);
```

Configure these Render environment variables:

```env
DATABASE_URL=your-render-postgresql-connection-string
CORS_ORIGIN=https://your-netlify-site.netlify.app
NODE_ENV=production
```

Do not commit the production `DATABASE_URL` or any other secret to GitHub.

The backend should expose a health endpoint at:

```text
GET /api/health
```

The deployment should be considered healthy only when this endpoint returns:

```json
{"status":"ok"}
```

## 6. Render PostgreSQL Configuration

Create a managed PostgreSQL database and use its internal connection string when the API and database share a Render region. Use the provider's secure connection string rather than copying local Docker credentials into production.

After creating the database:

1. Apply the database migrations.
2. Create a production backup or confirm the provider's backup configuration.
3. Import the validated inventory workbook.
4. Verify record counts through the API.
5. Do not run the development seed command against production.

Example migration command with a production connection string:

```bash
DATABASE_URL="your-production-database-url" npm run db:migrate
```

Example workbook import:

```bash
DATABASE_URL="your-production-database-url" \
npm run db:import -- "../src/data/IT Inventory Workbook.xlsx" --replace
```

The workbook must remain local and must not be committed to the repository.

## 7. Netlify Configuration

In Netlify, configure the frontend environment variable:

```env
VITE_API_URL=https://your-api-name.onrender.com/api
```

The variable must be configured for the deployment environment that is being built. Vite embeds `VITE_*` variables at build time, so changing this variable requires a new Netlify deploy.

The Netlify site should also include a single-page application redirect so browser routes resolve correctly:

```text
/*    /index.html    200
```

This can be added through a `public/_redirects` file or Netlify configuration.

## 8. CORS

The backend must allow the exact production frontend origin:

```env
CORS_ORIGIN=https://your-netlify-site.netlify.app
```

Do not use `*` for a business application that performs authenticated mutations. The origin should be updated if a custom domain replaces the Netlify subdomain.

## 9. Authentication and Authorization

The current `x-user-id` mechanism is a development authorization stub. It is not sufficient for a business application because users can potentially impersonate another database user by changing the header.

Before production use, replace it with one of the following:

- A managed identity provider using OAuth or OpenID Connect
- Secure HTTP-only session cookies
- A backend-verified JWT issued by an identity provider

The backend must enforce authorization for asset changes, inventory adjustments, purchasing, retirement, and settings. Frontend button visibility is not a security boundary.

## 10. Data Protection

The production deployment must include:

- Automated database backups
- A documented restore procedure
- Restricted database credentials
- HTTPS for all public requests
- Environment-variable secret storage
- Error monitoring
- Database and API health monitoring
- A process for rotating credentials
- Separate development and production databases

The Excel workbook contains operational inventory information and should be treated as confidential. It is explicitly excluded from Git through `.gitignore`.

## 11. Deployment Workflow

### Initial deployment

1. Push application source code without the real workbook or production secrets.
2. Create the Render PostgreSQL database.
3. Deploy the Render API.
4. Set `DATABASE_URL`, `CORS_ORIGIN`, and `NODE_ENV` in Render.
5. Run migrations.
6. Back up the hosted database.
7. Import the workbook with `--replace`.
8. Verify API record counts.
9. Set `VITE_API_URL` in Netlify.
10. Redeploy the frontend.
11. Test the dashboard, inventory, and consumables pages.

### Later deployments

1. Merge reviewed code changes.
2. Deploy the API.
3. Apply pending migrations before using new API behavior.
4. Deploy the frontend.
5. Verify `/api/health` and key data endpoints.
6. Review logs and error monitoring.

## 12. Cost-Control Measures

- Use one production API service and one production database initially.
- Keep staging on local Docker until it is needed.
- Set provider spending alerts or limits.
- Monitor database storage and API bandwidth.
- Avoid storing uploaded files on the API filesystem.
- Keep database backups according to business requirements, not indefinitely by default.
- Upgrade resources only when measured usage requires it.

## 13. Acceptance Criteria

The deployment is ready for small-business use when:

- The Netlify frontend loads without API errors.
- The frontend uses the deployed API URL rather than `localhost`.
- The Render API health endpoint returns HTTP 200.
- The API connects to hosted PostgreSQL.
- Migrations run successfully against the production database.
- The imported workbook data is visible through the frontend.
- CORS permits the Netlify origin and rejects unrelated origins.
- Production credentials are stored only in provider environment variables.
- Backups and restoration have been tested.
- Real authentication replaces the development `x-user-id` stub.

## 14. Conclusion

Netlify plus Render API plus Render PostgreSQL is the most economical deployment that fits the current codebase and provides a reasonable foundation for a small business application.

The approximately $13/month starting configuration is preferable to a completely free setup because it avoids relying on an expiring or sleeping production database. The application should still treat authentication, backups, monitoring, and restore testing as required production work rather than optional enhancements.
