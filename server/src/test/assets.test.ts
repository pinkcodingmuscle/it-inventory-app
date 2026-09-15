import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetAndSeed, type Fixtures } from "./fixtures.js";

const app = createApp();
let ctx: Fixtures;

beforeEach(async () => {
  ctx = await resetAndSeed();
});

describe("asset assign / move / retire", () => {
  it("assigns an active asset to a user", async () => {
    const res = await request(app)
      .post(`/api/assets/${ctx.asset.id}/assign`)
      .set("x-user-id", ctx.tech.id)
      .send({ toUserId: ctx.tech.id });
    expect(res.status).toBe(200);
    expect(res.body.assignedUserId).toBe(ctx.tech.id);
  });

  it("retires an asset and then refuses to assign it", async () => {
    const retire = await request(app)
      .post(`/api/assets/${ctx.asset.id}/retire`)
      .set("x-user-id", ctx.admin.id)
      .send({});
    expect(retire.status).toBe(200);
    expect(retire.body.status).toBe("retired");

    const assign = await request(app)
      .post(`/api/assets/${ctx.asset.id}/assign`)
      .set("x-user-id", ctx.tech.id)
      .send({ toUserId: ctx.tech.id });
    expect(assign.status).toBe(400);
  });

  it("blocks a technician from retiring an asset", async () => {
    const res = await request(app)
      .post(`/api/assets/${ctx.asset.id}/retire`)
      .set("x-user-id", ctx.tech.id)
      .send({});
    expect(res.status).toBe(403);
  });

  it("moves an asset to a new location", async () => {
    const [otherLocation] = await request(app)
      .post("/api/locations")
      .set("x-user-id", ctx.admin.id)
      .send({ name: "Second Location", type: "storage" })
      .then((r) => [r.body]);

    const res = await request(app)
      .post(`/api/assets/${ctx.asset.id}/move`)
      .set("x-user-id", ctx.tech.id)
      .send({ toLocationId: otherLocation.id });
    expect(res.status).toBe(200);
    expect(res.body.locationId).toBe(otherLocation.id);
  });
});
