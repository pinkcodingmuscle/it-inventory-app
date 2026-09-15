import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetAndSeed, type Fixtures } from "./fixtures.js";

const app = createApp();
let ctx: Fixtures;

beforeEach(async () => {
  ctx = await resetAndSeed();
});

describe("purchase order receiving", () => {
  it("rejects receiving more than was ordered", async () => {
    const res = await request(app)
      .post(`/api/purchase-orders/${ctx.po.id}/receive`)
      .set("x-user-id", ctx.admin.id)
      .send({ locationId: ctx.location.id, lines: [{ lineId: ctx.poLine.id, quantity: 999 }] });
    expect(res.status).toBe(400);
  });

  it("receives a line, increases stock, and marks the order received once complete", async () => {
    const res = await request(app)
      .post(`/api/purchase-orders/${ctx.po.id}/receive`)
      .set("x-user-id", ctx.admin.id)
      .send({ locationId: ctx.location.id, lines: [{ lineId: ctx.poLine.id, quantity: 20 }] });
    expect(res.status).toBe(200);
    expect(res.body.purchaseOrder.status).toBe("received");

    const stock = await request(app).get("/api/stock").set("x-user-id", ctx.admin.id);
    const updated = stock.body.find((s: { catalogItemId: string; locationId: string }) =>
      s.catalogItemId === ctx.consumableCatalogItem.id && s.locationId === ctx.location.id
    );
    expect(updated.quantity).toBe(30); // 10 existing + 20 received
  });

  it("leaves the order open on a partial receipt", async () => {
    const res = await request(app)
      .post(`/api/purchase-orders/${ctx.po.id}/receive`)
      .set("x-user-id", ctx.admin.id)
      .send({ locationId: ctx.location.id, lines: [{ lineId: ctx.poLine.id, quantity: 5 }] });
    expect(res.status).toBe(200);
    expect(res.body.purchaseOrder.status).toBe("open");
  });
});
