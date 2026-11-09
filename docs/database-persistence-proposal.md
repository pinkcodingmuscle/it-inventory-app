# IT Inventory Application: Database Persistence Proposal

## 1. Purpose

This proposal defines the database persistence architecture for the IT Inventory Application using PostgreSQL and Docker.

The existing data-structure proposal defines the application's domain model. This document explains how that model will be stored, accessed, validated, and developed locally through a PostgreSQL database running in Docker.

The persistence layer should provide:

- Durable storage for inventory data
- Referential integrity between related records
- Transactional updates for inventory operations
- Auditable asset and stock history
- A consistent API boundary between React and PostgreSQL
- A reproducible local development environment
- A path toward production deployment

## 2. Technology and Architecture

### 2.1 Database

The application will use PostgreSQL because it supports strong relationships, foreign-key constraints, transactional inventory operations, audit history, and reporting queries.

### 2.2 Local Development

PostgreSQL will run through Docker Compose. A named Docker volume will preserve local database data when the container is stopped or recreated.

### 2.3 Application Architecture

The React frontend will not connect directly to PostgreSQL. The intended architecture is:

```text
React frontend
      |
      v
Backend API
      |
      v
PostgreSQL database
```

The backend API will handle authentication, authorization, input validation, database queries, transactions, business rules, and API response formatting.

## 3. Database Conventions

The database will use:

- `snake_case` table and column names
- UUID primary keys
- Foreign keys ending in `_id`
- UTC timestamps using `timestamptz`
- Database-level checks for important business rules
- Explicit join tables for many-to-many relationships
- Versioned migrations stored in source control

## 4. Relational Schema

The following tables map the domain entities from the data-structure proposal to PostgreSQL tables.

### 4.1 Departments

```sql
CREATE TABLE departments (
    id uuid PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.2 Users

```sql
CREATE TABLE users (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL,
    department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.3 Locations

```sql
CREATE TABLE locations (
    id uuid PRIMARY KEY,
    name text NOT NULL UNIQUE,
    type text NOT NULL
        CHECK (type IN ('office', 'storage', 'meeting_room', 'remote')),
    manager_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.4 Vendors

```sql
CREATE TABLE vendors (
    id uuid PRIMARY KEY,
    name text NOT NULL UNIQUE,
    category text NOT NULL
        CHECK (category IN ('hardware', 'software', 'accessories', 'other')),
    contact_name text,
    email text,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.5 Catalog Items

`catalog_items` stores product or model definitions. It does not represent individual physical devices.

```sql
CREATE TABLE catalog_items (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    type text NOT NULL
        CHECK (type IN ('asset', 'consumable', 'accessory', 'software')),
    manufacturer text,
    model text,
    vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
    reorder_point integer CHECK (reorder_point >= 0),
    lifecycle_months integer CHECK (lifecycle_months > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.6 Purchase Orders

Purchase orders are created before assets and stock records because assets may reference the order that produced them.

```sql
CREATE TABLE purchase_orders (
    id uuid PRIMARY KEY,
    purchase_order_number text NOT NULL UNIQUE,
    vendor_id uuid NOT NULL REFERENCES vendors(id),
    order_date date NOT NULL,
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'received', 'cancelled')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_lines (
    id uuid PRIMARY KEY,
    purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    catalog_item_id uuid NOT NULL REFERENCES catalog_items(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
    received_quantity integer NOT NULL DEFAULT 0
        CHECK (received_quantity >= 0 AND received_quantity <= quantity)
);
```

The purchase order total should be calculated from its line items:

```sql
SELECT COALESCE(SUM(quantity * unit_price), 0)
FROM purchase_order_lines
WHERE purchase_order_id = $1;
```

### 4.7 Serialized Assets

Each asset row represents one physical, serialized device.

```sql
CREATE TABLE assets (
    id uuid PRIMARY KEY,
    catalog_item_id uuid NOT NULL REFERENCES catalog_items(id),
    asset_tag text NOT NULL UNIQUE,
    serial_number text NOT NULL UNIQUE,
    status text NOT NULL
        CHECK (status IN ('active', 'in_storage', 'under_repair', 'retired')),
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
    purchase_date date,
    warranty_end_date date,
    location_id uuid NOT NULL REFERENCES locations(id),
    assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

Asset names, assigned user names, and location names should be resolved through joins rather than duplicated in the `assets` table.

### 4.8 Bulk Stock

`stock_items` stores the current quantity of a bulk catalog item at each location.

```sql
CREATE TABLE stock_items (
    id uuid PRIMARY KEY,
    catalog_item_id uuid NOT NULL REFERENCES catalog_items(id),
    location_id uuid NOT NULL REFERENCES locations(id),
    quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reorder_point integer CHECK (reorder_point >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (catalog_item_id, location_id)
);
```

### 4.9 Inventory Transactions

Inventory transactions provide an append-only audit trail for stock changes.

```sql
CREATE TABLE inventory_transactions (
    id uuid PRIMARY KEY,
    catalog_item_id uuid NOT NULL REFERENCES catalog_items(id),
    location_id uuid NOT NULL REFERENCES locations(id),
    type text NOT NULL
        CHECK (type IN (
            'purchase', 'receipt', 'checkout', 'return', 'adjustment', 'disposal'
        )),
    quantity integer NOT NULL CHECK (quantity > 0),
    performed_by_user_id uuid NOT NULL REFERENCES users(id),
    related_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
    related_purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    notes text
);
```

### 4.10 Software Licenses and Assignments

```sql
CREATE TABLE software_licenses (
    id uuid PRIMARY KEY,
    catalog_item_id uuid NOT NULL REFERENCES catalog_items(id),
    license_type text NOT NULL
        CHECK (license_type IN ('subscription', 'perpetual', 'volume')),
    total_seats integer NOT NULL CHECK (total_seats >= 0),
    renewal_date date,
    vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE software_assignments (
    id uuid PRIMARY KEY,
    software_license_id uuid NOT NULL REFERENCES software_licenses(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CHECK (user_id IS NOT NULL OR asset_id IS NOT NULL)
);
```

Used software seats are calculated by counting assignments where `revoked_at IS NULL`.

### 4.11 Asset Lifecycle Events

```sql
CREATE TABLE asset_events (
    id uuid PRIMARY KEY,
    asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    type text NOT NULL
        CHECK (type IN (
            'purchased', 'assigned', 'returned', 'moved',
            'repair_started', 'repair_completed', 'retired'
        )),
    from_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    from_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
    to_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    notes text
);
```

Asset events should be append-only. Corrections should be represented by new events instead of deleting historical records.

## 5. Indexes

Indexes should support common page queries and foreign-key lookups.

```sql
CREATE INDEX assets_catalog_item_id_idx ON assets(catalog_item_id);
CREATE INDEX assets_location_id_idx ON assets(location_id);
CREATE INDEX assets_assigned_user_id_idx ON assets(assigned_user_id);
CREATE INDEX assets_status_idx ON assets(status);
CREATE INDEX stock_items_location_id_idx ON stock_items(location_id);
CREATE INDEX inventory_transactions_catalog_location_idx
    ON inventory_transactions(catalog_item_id, location_id);
CREATE INDEX inventory_transactions_created_at_idx
    ON inventory_transactions(created_at);
CREATE INDEX asset_events_asset_id_created_at_idx
    ON asset_events(asset_id, created_at);
CREATE INDEX software_assignments_active_idx
    ON software_assignments(software_license_id)
    WHERE revoked_at IS NULL;
```

## 6. Docker Compose Configuration

PostgreSQL will be defined in a root-level `docker-compose.yml` file.

```yaml
services:
  postgres:
    image: postgres:16
    container_name: it-inventory-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: it_inventory
      POSTGRES_USER: inventory_app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U inventory_app -d it_inventory"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

Database credentials must be supplied through a local `.env` file and must not be committed to source control.

```env
POSTGRES_PASSWORD=local_development_password
DATABASE_URL=postgresql://inventory_app:local_development_password@localhost:5432/it_inventory
```

Production should use managed secrets or a secure secret manager instead of committed environment files.

## 7. Migrations and Seed Data

All database changes must be managed through versioned migrations. The project should choose one migration tool based on the backend framework, such as Prisma Migrate, Drizzle Kit, Knex, TypeORM, or `node-pg-migrate`.

The first migrations should be organized as follows:

1. Create UUID support and shared database extensions.
2. Create departments, users, locations, and vendors.
3. Create catalog items.
4. Create purchase orders and purchase order lines.
5. Create assets and stock items.
6. Create inventory transactions.
7. Create software licenses and assignments.
8. Create asset events.
9. Add indexes and additional constraints.
10. Insert development seed data.

Migrations and seed scripts must be repeatable on a clean database. SQL migrations should remain reviewable in source control.

## 8. API Persistence Boundary

The React application should communicate with resource-oriented backend endpoints rather than querying PostgreSQL directly.

Example endpoints:

```text
GET    /api/assets
GET    /api/assets/:id
POST   /api/assets
PATCH  /api/assets/:id
POST   /api/assets/:id/assign
POST   /api/assets/:id/move
POST   /api/assets/:id/retire

GET    /api/stock
POST   /api/stock/:id/checkout
POST   /api/stock/:id/return
POST   /api/stock/:id/adjust

GET    /api/purchase-orders
POST   /api/purchase-orders
POST   /api/purchase-orders/:id/receive

GET    /api/software-licenses
POST   /api/software-licenses/:id/assign
POST   /api/software-assignments/:id/revoke
```

The API may return related display data while keeping the database normalized internally.

```json
{
  "id": "asset-id",
  "assetTag": "LT-001",
  "catalogItem": {
    "id": "catalog-item-id",
    "name": "Dell Latitude 5530"
  },
  "location": {
    "id": "location-id",
    "name": "Main Office"
  },
  "assignedUser": {
    "id": "user-id",
    "name": "Jordan Lee"
  },
  "status": "active"
}
```

## 9. Transactions and Business Rules

The backend must use database transactions for operations that modify multiple records.

Transactional operations include:

- Receiving a purchase order
- Checking out or returning stock
- Adjusting inventory
- Assigning, moving, repairing, or retiring an asset
- Assigning or revoking software

For a stock checkout, the transaction should:

1. Lock the relevant `stock_items` row.
2. Validate that the resulting quantity is not negative.
3. Update `stock_items.quantity`.
4. Insert the corresponding `inventory_transactions` record.
5. Commit both changes together.

Business rules include:

- Asset tags and serial numbers must be unique.
- Stock quantities cannot become negative.
- Received quantities cannot exceed ordered quantities.
- Retired assets cannot be assigned.
- Software assignments cannot exceed available seats.
- Every asset must have a valid location.
- Inventory transactions and asset events are retained as audit history.
- Only authorized users may perform inventory adjustments or retire assets.

## 10. Authentication and Authorization

Authentication should be handled by the backend API or an identity provider. Authorization must be enforced by the backend; hiding controls in React is not sufficient protection.

Minimum application roles:

```text
Administrator
  Full access, including settings and destructive operations

Inventory Manager
  Assets, stock, purchases, vendors, and reports

Technician
  Asset assignments, movements, repairs, and returns

Read-only User
  View-only access to approved inventory data
```

## 11. Deletion, Archival, and Audit Policy

The application should avoid hard-deleting records referenced by historical data.

Recommended behavior:

- Mark users and vendors inactive instead of deleting them.
- Archive catalog items that are no longer used.
- Retire assets instead of deleting them.
- Keep inventory transactions and asset events append-only.
- Cancel purchase orders instead of deleting processed orders.
- Do not delete locations while assets or stock remain assigned to them.

## 12. Backup and Recovery

Production PostgreSQL must include:

- Automated daily backups
- Point-in-time recovery where supported
- Encrypted backups
- A documented retention policy
- Periodic restore testing
- Monitoring for storage, connections, and failed backups

Docker volumes are appropriate for local development but are not a complete production backup strategy.

## 13. Testing Strategy

### Unit tests

Test stock status, lifecycle dates, purchase order totals, and software seat calculations independently of the database.

### Integration tests

Test foreign-key constraints, asset assignment, stock checkout and return, purchase order receiving, inventory transaction creation, and software seat limits against PostgreSQL.

### API tests

Test request validation, authentication, authorization, error responses, and transaction rollback behavior.

### Database isolation

Use an isolated test database or disposable PostgreSQL container. Failed multi-step operations must leave no partial updates.

## 14. Development Workflow

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Run migrations:

```bash
npm run db:migrate
```

Load development records:

```bash
npm run db:seed
```

Stop the database while preserving its named volume:

```bash
docker compose down
```

Reset local database data only when explicitly needed:

```bash
docker compose down -v
```

The reset command deletes local database data and must never be used against production systems.

## 15. Implementation Plan

### Phase 1: Select backend and migration tools

1. Choose the backend framework.
2. Choose an ORM or migration library.
3. Add PostgreSQL and Docker Compose configuration.
4. Add environment variable handling.

### Phase 2: Create the database schema

1. Create versioned migrations.
2. Add core tables, constraints, and indexes.
3. Add development seed data.
4. Verify migrations on a clean database.

### Phase 3: Implement the API

1. Add database connection management.
2. Implement read endpoints.
3. Implement validated mutations.
4. Add transaction boundaries.
5. Add authentication and authorization.

### Phase 4: Connect the React application

1. Replace page-local arrays with API requests.
2. Add loading, error, and empty states.
3. Refresh data after mutations.
4. Remove duplicated display data from page components.
5. Add optimistic updates only where rollback behavior is defined.

### Phase 5: Prepare production deployment

1. Use a managed PostgreSQL service.
2. Configure secure environment variables.
3. Enable backups and monitoring.
4. Run migrations during deployment.
5. Restrict database network access.
6. Test restore and rollback procedures.

## 16. Acceptance Criteria

The persistence implementation is complete when:

- PostgreSQL runs locally through Docker Compose.
- The database can be recreated from migrations without manual schema changes.
- Development data can be loaded through a repeatable seed process.
- All major domain entities have relational tables.
- Foreign keys and uniqueness constraints prevent invalid relationships.
- Inventory changes create auditable transaction records.
- Multi-record operations use database transactions.
- The React application accesses data through a backend API.
- Database credentials are not stored in source control.
- Authentication and authorization are enforced by the backend.
- Automated tests cover inventory, purchasing, assignment, and lifecycle operations.
- Production backup and migration procedures are documented.

## 17. Conclusion

The PostgreSQL persistence layer will provide durable, relational storage for the normalized IT inventory domain model.

Docker will make local development reproducible, while migrations will make schema changes traceable and repeatable. A backend API will protect the database and centralize validation, authorization, and transaction handling.

This proposal complements the existing data-structure proposal: the original defines the domain model, while this document defines the database schema, Docker environment, API boundary, and persistence workflow.
