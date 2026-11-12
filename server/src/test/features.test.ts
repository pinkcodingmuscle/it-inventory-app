import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { db } from "../db/client.js";
import { inventoryTransactions, users } from "../db/schema.js";
import { DEPARTMENT_USER_EMAIL } from "../middleware/auth.js";
import { resetAndSeed, type Fixtures } from "./fixtures.js";

const app = createApp();
let ctx: Fixtures;

beforeEach(async () => {
  ctx = await resetAndSeed();
});

describe("open access (no sign-in)", () => {
  it("serves data without any credentials", async () => {
    const res = await request(app).get("/api/stock");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("records changes as the shared IT Department user, created once", async () => {
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).send({ quantity: 1 });
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).send({ quantity: 1 });
    const dept = await db.select().from(users).where(eq(users.email, DEPARTMENT_USER_EMAIL));
    expect(dept).toHaveLength(1);
    expect(dept[0].name).toBe("IT Department");
    const txns = await db.select().from(inventoryTransactions);
    expect(txns.every((t) => t.performedByUserId === dept[0].id)).toBe(true);
  });

  it("no longer has sign-in or user-management endpoints", async () => {
    expect((await request(app).post("/api/auth/login").send({ email: "a@b.c", password: "x" })).status).toBe(404);
    expect((await request(app).post("/api/users").send({ name: "X", email: "x@y.z", role: "Viewer" })).status).toBe(404);
    const list = await request(app).get("/api/users");
    expect(list.status).toBe(200);
  });

  it("keeps the health check", async () => {
    expect((await request(app).get("/api/health")).status).toBe(200);
  });
});

describe("shared settings", () => {
  it("returns defaults before anything is saved, then the saved values", async () => {
    const before = await request(app).get("/api/settings");
    expect(before.body.saved).toBe(false);
    expect(before.body.settings.currency).toBe("USD");

    const settings = { ...before.body.settings, currency: "CAD", supportEmail: "help@test.local", lowStockThreshold: 3 };
    expect((await request(app).put("/api/settings").send(settings)).status).toBe(200);

    const after = await request(app).get("/api/settings");
    expect(after.body).toMatchObject({ saved: true, settings: { currency: "CAD", supportEmail: "help@test.local", lowStockThreshold: 3 } });
  });

  it("validates settings", async () => {
    const { body } = await request(app).get("/api/settings");
    expect((await request(app).put("/api/settings").send({ ...body.settings, supportEmail: "nope" })).status).toBe(400);
  });
});

describe("editing and deleting records", () => {
  it("updates a catalog item, including clearing its price", async () => {
    const res = await request(app)
      .patch(`/api/catalog-items/${ctx.consumableCatalogItem.id}`)
      .send({ name: "Renamed Cable", unitPrice: null });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Renamed Cable", unitPrice: null });
  });

  it("refuses to delete a catalog item that is in stock", async () => {
    expect((await request(app).delete(`/api/catalog-items/${ctx.consumableCatalogItem.id}`)).status).toBe(409);
  });

  it("deletes a vendor with no purchase orders, but not one with orders", async () => {
    expect((await request(app).delete(`/api/vendors/${ctx.vendor.id}`)).status).toBe(409);
    const other = await request(app).post("/api/vendors").send({ name: "Spare Vendor", category: "other" });
    expect((await request(app).delete(`/api/vendors/${other.body.id}`)).status).toBe(204);
  });

  it("sets and clears a stock line's own reorder point", async () => {
    const set = await request(app).patch(`/api/stock/${ctx.stockItem.id}`).send({ reorderPoint: 7 });
    expect(set.body.reorderPoint).toBe(7);
    const cleared = await request(app).patch(`/api/stock/${ctx.stockItem.id}`).send({ reorderPoint: null });
    expect(cleared.body.reorderPoint).toBeNull();
  });

  it("removes a stock line only once its quantity is 0", async () => {
    expect((await request(app).delete(`/api/stock/${ctx.stockItem.id}`)).status).toBe(409);
    await request(app).post(`/api/stock/${ctx.stockItem.id}/adjust`).send({ quantity: 0 });
    expect((await request(app).delete(`/api/stock/${ctx.stockItem.id}`)).status).toBe(204);
  });
});

describe("stock availability and history", () => {
  it("reports checked-out units per stock line", async () => {
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).send({ quantity: 4 });
    await request(app).post(`/api/stock/${ctx.stockItem.id}/return`).send({ quantity: 1 });
    const res = await request(app).get("/api/stock");
    expect(res.body.find((s: { id: string }) => s.id === ctx.stockItem.id).checkedOut).toBe(3);
  });

  it("filters transactions by item, location and date, newest first", async () => {
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).send({ quantity: 1 });
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).send({ quantity: 2 });
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get("/api/inventory-transactions")
      .query({ catalogItemId: ctx.consumableCatalogItem.id, locationId: ctx.location.id, from: today, to: today });
    expect(res.body.map((t: { quantity: number }) => t.quantity)).toEqual([2, 1]);
    const none = await request(app).get("/api/inventory-transactions").query({ to: "2000-01-01" });
    expect(none.body).toEqual([]);
  });
});
