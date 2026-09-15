import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetAndSeed, type Fixtures } from "./fixtures.js";

const app = createApp();
let ctx: Fixtures;

beforeEach(async () => {
  ctx = await resetAndSeed();
});

describe("software license assignment", () => {
  it("assigns a seat and then rejects once the license is full", async () => {
    const first = await request(app)
      .post(`/api/software-licenses/${ctx.license.id}/assign`)
      .set("x-user-id", ctx.admin.id)
      .send({ userId: ctx.admin.id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/software-licenses/${ctx.license.id}/assign`)
      .set("x-user-id", ctx.admin.id)
      .send({ userId: ctx.tech.id });
    expect(second.status).toBe(400);
  });

  it("frees a seat after revoking an assignment", async () => {
    const assign = await request(app)
      .post(`/api/software-licenses/${ctx.license.id}/assign`)
      .set("x-user-id", ctx.admin.id)
      .send({ userId: ctx.admin.id });

    const revoke = await request(app)
      .post(`/api/software-assignments/${assign.body.id}/revoke`)
      .set("x-user-id", ctx.admin.id);
    expect(revoke.status).toBe(200);

    const reassign = await request(app)
      .post(`/api/software-licenses/${ctx.license.id}/assign`)
      .set("x-user-id", ctx.admin.id)
      .send({ userId: ctx.tech.id });
    expect(reassign.status).toBe(201);
  });
});
