# IT Inventory Application: Excel Import Proposal

## 1. Purpose

The inventory workbook does not need to be manually reorganized before import. The application will accept the existing flat spreadsheet layout and transform each row into the normalized PostgreSQL records defined in the database persistence proposal.

The import tool is intended for a controlled migration from prototype data to real inventory data.

## 2. Import Strategy

The first version supports a workbook with one inventory sheet. Column names may vary because the importer recognizes aliases such as `Item Name`, `Product`, or `Description` for the catalog item name.

Rows are classified automatically:

- A row with an asset tag or serial number becomes a serialized `assets` record.
- A row without serialized identifiers becomes a bulk `stock_items` record.
- A `Type` or `Item Type` column can override automatic classification with `asset`, `consumable`, or `accessory`.

Related entities are created or matched by normalized name or email:

- Users are matched by email, then by name.
- Locations are matched by name.
- Vendors are matched by name.
- Catalog items are matched by item name and category.
- Departments are created when supplied by the workbook.

## 3. Recognized Columns

| Application field | Recognized examples | Required |
| --- | --- | --- |
| Item name | `Item Name`, `Product`, `Description`, `Model` | Yes |
| Source identifier | `AssetID`, `Source ID`, `Inventory ID` | No; preserved in notes |
| Category | `Category`, `Type`, `Asset Type` | Yes |
| Item type | `Item Type`, `Catalog Type`, `Record Type` | No |
| Asset tag | `Asset Tag`, `Asset ID`, `Tag`, `Inventory Number` | Required for serialized assets |
| Serial number | `Serial Number`, `Serial`, `S/N` | Required for serialized assets |
| Quantity | `Quantity`, `Qty`, `Count`, `On Hand` | Required for bulk rows; defaults to 1 for assets |
| Assigned user | `Assigned To`, `Assigned User`, `User`, `Employee` | No |
| User email | `User Email`, `Assigned Email`, `Email` | No |
| Department | `Department`, `Dept` | No |
| Location | `Location`, `Site`, `Office`, `Storage Location` | Yes |
| Vendor | `Vendor`, `Supplier`, `Manufacturer` | No |
| Status | `Status`, `Asset Status`, `Condition` | No |
| Purchase date | `Purchase Date`, `Purchased`, `Acquired` | No |
| Warranty end date | `Warranty End`, `Warranty Expiration` | No |
| Reorder point | `Reorder Point`, `Min Stock`, `Minimum` | No |
| Notes | `Notes`, `Comments`, `Description` | No |

The actual workbook should be reviewed before import. Ambiguous columns should be mapped explicitly rather than silently guessed.

## 4. Safety Requirements

The import command must:

1. Require a workbook path.
2. Validate every row before changing PostgreSQL.
3. Report row-level errors with the original row number.
4. Support a dry run.
5. Require an explicit `--replace` flag before deleting prototype data.
6. Recommend a PostgreSQL backup before replacement.
7. Perform replacement and insertion in one database transaction.
8. Roll back all changes if any insert fails.
9. Never run the development seed command after importing real data.

The importer will clear domain records in dependency order only when `--replace` is provided. It will not drop tables or delete the Docker volume.

## 5. Commands

From the repository root:

```bash
npm run db:up
npm run db:migrate
npm run db:import -- /absolute/path/to/inventory.xlsx --dry-run
```

After reviewing the dry-run report and creating a backup:

```bash
npm run db:import -- /absolute/path/to/inventory.xlsx --replace
```

The import defaults to the first worksheet. A specific worksheet can be selected with:

```bash
npm run db:import -- /absolute/path/to/inventory.xlsx --sheet "Inventory" --dry-run
```

## 6. Data Decisions

The importer uses these defaults when the workbook omits optional values:

- Asset status: `in_storage`
- Bulk item type: `consumable`
- Location type: `office`
- User role: `Imported User`
- Vendor category: `other`
- Asset quantity: `1`
- Missing reorder point: null

Rows missing an item name or location are rejected. Serialized rows missing an asset tag or serial number are rejected. Quantities must be whole numbers greater than or equal to zero.

## 7. Limitations and Follow-up

The first version imports assets and bulk stock. Purchase orders, software licenses, historical transactions, and lifecycle events require additional source columns and should be added only after the workbook’s real semantics are confirmed.

The import creates receipt transactions for positive bulk quantities. It does not invent historical checkout, assignment, repair, or disposal events.

## 8. Acceptance Criteria

The import is complete when:

- A real workbook can be previewed without changing the database.
- All validation errors identify their source row and field.
- A successful replacement removes prototype records and inserts real records atomically.
- Related users, locations, vendors, and catalog items are normalized into their tables.
- Serialized and bulk rows are stored in their correct tables.
- The frontend displays the imported data through the existing API.
- A failed import leaves the previous database unchanged.
