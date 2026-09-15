import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
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
      .set("x-user-id", ctx.tech.id)
      .send({ quantity: 999 });
    expect(res.status).toBe(400);
  });

  it("allows checkout within the available quantity and records a transaction", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/checkout`)
      .set("x-user-id", ctx.tech.id)
      .send({ quantity: 3 });
    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe("checkout");
    expect(res.body.transaction.quantity).toBe(3);
  });

  it("rejects returning more than is currently checked out", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/return`)
      .set("x-user-id", ctx.tech.id)
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it("rejects an adjustment that would make quantity negative", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/adjust`)
      .set("x-user-id", ctx.admin.id)
      .send({ quantity: -1 });
    expect(res.status).toBe(400);
  });

  it("blocks a read-only user from adjusting stock", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/adjust`)
      .set("x-user-id", ctx.readOnly.id)
      .send({ quantity: 50 });
    expect(res.status).toBe(403);
  });

  it("rejects requests from an unknown actor", async () => {
    const res = await request(app)
      .post(`/api/stock/${ctx.stockItem.id}/checkout`)
      .set("x-user-id", "00000000-0000-0000-0000-000000000000")
      .send({ quantity: 1 });
    expect(res.status).toBe(401);
  });
});
