import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { db } from "../db/client.js";
import { locations } from "../db/schema.js";
import { resetAndSeed, type Fixtures } from "./fixtures.js";

const app = createApp();
let ctx: Fixtures;

beforeEach(async () => {
  ctx = await resetAndSeed();
});

describe("stock checkout / return / adjust", () => {
  it("rejects checkout beyond the available quantity", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/checkout`)
      .set(ctx.auth.tech)
      .send({ quantity: 999 });
    expect(res.status).toBe(400);
  });

  it("allows checkout within the available quantity and records a transaction", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/checkout`)
      .set(ctx.auth.tech)
      .send({ quantity: 3 });
    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe("checkout");
    expect(res.body.transaction.quantity).toBe(3);
  });

  it("rejects returning more than is currently checked out", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/return`)
      .set(ctx.auth.tech)
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it("rejects an adjustment that would make quantity negative", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/adjust`)
      .set(ctx.auth.admin)
      .send({ quantity: -1 });
    expect(res.status).toBe(400);
  });

  it("blocks a read-only user from adjusting stock", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/adjust`)
      .set(ctx.auth.readOnly)
      .send({ quantity: 50 });
    expect(res.status).toBe(403);
  });

  it("rejects requests with an unknown session token", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/checkout`)
      .set("Authorization", "Bearer not-a-real-token")
      .send({ quantity: 1 });
    expect(res.status).toBe(401);
  });
});

describe("adding an item to stock", () => {
  it("creates a stock line and records the starting quantity as an adjustment", async () => {
    const [other] = await db.insert(locations).values({ name: "Second Room", type: "office" }).returning();
    const res = await request(app)
      .post("/api/stock")
      .set(ctx.auth.admin)
      .send({ catalogItemId: ctx.consumableCatalogItem.id, locationId: other.id, quantity: 4, reorderPoint: 2 });
    expect(res.status).toBe(201);
    expect(res.body.stockItem.quantity).toBe(4);
    expect(res.body.stockItem.reorderPoint).toBe(2);
    expect(res.body.transaction.type).toBe("adjustment");
    expect(res.body.transaction.quantity).toBe(4);
  });

  it("records no transaction when the starting quantity is zero", async () => {
    const [other] = await db.insert(locations).values({ name: "Empty Room", type: "office" }).returning();
    const res = await request(app)
      .post("/api/stock")
      .set(ctx.auth.admin)
      .send({ catalogItemId: ctx.consumableCatalogItem.id, locationId: other.id, quantity: 0 });
    expect(res.status).toBe(201);
    expect(res.body.transaction).toBeNull();
  });

  it("refuses a duplicate item/location pair", async () => {
    const res = await request(app)
      .post("/api/stock")
      .set(ctx.auth.admin)
      .send({ catalogItemId: ctx.consumableCatalogItem.id, locationId: ctx.location.id, quantity: 1 });
    expect(res.status).toBe(409);
  });

  it("blocks a technician from adding stock", async () => {
    const res = await request(app)
      .post("/api/stock")
      .set(ctx.auth.tech)
      .send({ catalogItemId: ctx.consumableCatalogItem.id, locationId: ctx.location.id, quantity: 1 });
    expect(res.status).toBe(403);
  });
});
