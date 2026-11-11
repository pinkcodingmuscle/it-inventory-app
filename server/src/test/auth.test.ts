import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../lib/passwords.js";
import { MAX_SIGNUPS, resetLoginThrottle } from "../routes/auth.js";
import { resetAndSeed, type Fixtures } from "./fixtures.js";

const app = createApp();
let ctx: Fixtures;

beforeEach(async () => {
  ctx = await resetAndSeed();
  resetLoginThrottle();
  await db.update(users).set({ passwordHash: await hashPassword("correct horse") }).where(eq(users.id, ctx.admin.id));
});

describe("authentication", () => {
  it("rejects API requests without a session", async () => {
    const res = await request(app).get("/api/stock");
    expect(res.status).toBe(401);
  });

  it("keeps the health check public", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });

  it("signs in with the right password (email is case-insensitive) and the token works", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "ADMIN@test.local", password: "correct horse" });
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ email: "admin@test.local", permission: "administrator" });

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(ctx.admin.id);
  });

  it("rejects a wrong password and users with no password", async () => {
    const wrong = await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "nope" });
    expect(wrong.status).toBe(401);
    const noPassword = await request(app).post("/api/auth/login").send({ email: "tech@test.local", password: "anything" });
    expect(noPassword.status).toBe(401);
  });

  it("locks out an email after repeated failures", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "nope" });
    }
    const res = await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "correct horse" });
    expect(res.status).toBe(429);
  });

  it("logs out by invalidating the token", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "correct horse" });
    const header = { Authorization: `Bearer ${login.body.token}` };
    expect((await request(app).post("/api/auth/logout").set(header)).status).toBe(204);
    expect((await request(app).get("/api/auth/me").set(header)).status).toBe(401);
  });

  it("blocks inactive users even with a session", async () => {
    await db.update(users).set({ status: "inactive" }).where(eq(users.id, ctx.tech.id));
    const res = await request(app).get("/api/stock").set(ctx.auth.tech);
    expect(res.status).toBe(401);
  });

  it("changes a password only with the current one", async () => {
    const bad = await request(app)
      .post("/api/auth/change-password")
      .set(ctx.auth.admin)
      .send({ currentPassword: "wrong", newPassword: "a new password" });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post("/api/auth/change-password")
      .set(ctx.auth.admin)
      .send({ currentPassword: "correct horse", newPassword: "a new password" });
    expect(ok.status).toBe(200);
    // Old sessions are signed out; the new token works.
    expect((await request(app).get("/api/auth/me").set(ctx.auth.admin)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${ok.body.token}`)).status).toBe(200);
  });
});

describe("user management", () => {
  it("never returns password hashes", async () => {
    const res = await request(app).get("/api/users").set(ctx.auth.admin);
    expect(res.status).toBe(200);
    const admin = res.body.find((u: { id: string }) => u.id === ctx.admin.id);
    expect(admin.passwordHash).toBeUndefined();
    expect(admin.hasPassword).toBe(true);
  });

  it("lets an administrator create a user with a password who can then sign in", async () => {
    const created = await request(app)
      .post("/api/users")
      .set(ctx.auth.admin)
      .send({ name: "New Manager", email: "new@test.local", role: "Inventory Manager", password: "longenough" });
    expect(created.status).toBe(201);
    const login = await request(app).post("/api/auth/login").send({ email: "new@test.local", password: "longenough" });
    expect(login.body.user.permission).toBe("inventory_manager");
  });

  it("resets another user's password and signs them out", async () => {
    const res = await request(app).post(`/api/users/${ctx.tech.id}/password`).set(ctx.auth.admin).send({ password: "tech password" });
    expect(res.status).toBe(200);
    expect((await request(app).get("/api/auth/me").set(ctx.auth.tech)).status).toBe(401);
  });

  it("stops non-administrators managing users", async () => {
    const res = await request(app).post(`/api/users/${ctx.admin.id}/password`).set(ctx.auth.tech).send({ password: "hijacked!!" });
    expect(res.status).toBe(403);
  });

  it("won't let an administrator deactivate themselves", async () => {
    const res = await request(app).patch(`/api/users/${ctx.admin.id}`).set(ctx.auth.admin).send({ status: "inactive" });
    expect(res.status).toBe(400);
  });
});

describe("shared settings", () => {
  it("returns defaults before anything is saved, then the saved values to everyone", async () => {
    const before = await request(app).get("/api/settings").set(ctx.auth.readOnly);
    expect(before.body.saved).toBe(false);
    expect(before.body.settings.currency).toBe("USD");

    const settings = { ...before.body.settings, currency: "CAD", supportEmail: "help@test.local", lowStockThreshold: 3 };
    const put = await request(app).put("/api/settings").set(ctx.auth.admin).send(settings);
    expect(put.status).toBe(200);

    const after = await request(app).get("/api/settings").set(ctx.auth.tech);
    expect(after.body).toMatchObject({ saved: true, settings: { currency: "CAD", supportEmail: "help@test.local", lowStockThreshold: 3 } });
  });

  it("validates settings and restricts who can change them", async () => {
    const { body } = await request(app).get("/api/settings").set(ctx.auth.admin);
    expect((await request(app).put("/api/settings").set(ctx.auth.admin).send({ ...body.settings, supportEmail: "nope" })).status).toBe(400);
    expect((await request(app).put("/api/settings").set(ctx.auth.tech).send(body.settings)).status).toBe(403);
  });
});

describe("editing and deleting records", () => {
  it("updates a catalog item, including clearing its price", async () => {
    const res = await request(app)
      .patch(`/api/catalog-items/${ctx.consumableCatalogItem.id}`)
      .set(ctx.auth.admin)
      .send({ name: "Renamed Cable", unitPrice: null });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Renamed Cable", unitPrice: null });
  });

  it("refuses to delete a catalog item that is in stock", async () => {
    const res = await request(app).delete(`/api/catalog-items/${ctx.consumableCatalogItem.id}`).set(ctx.auth.admin);
    expect(res.status).toBe(409);
  });

  it("deletes a vendor with no purchase orders, but not one with orders", async () => {
    expect((await request(app).delete(`/api/vendors/${ctx.vendor.id}`).set(ctx.auth.admin)).status).toBe(409);
    const other = await request(app).post("/api/vendors").set(ctx.auth.admin).send({ name: "Spare Vendor", category: "other" });
    expect((await request(app).delete(`/api/vendors/${other.body.id}`).set(ctx.auth.admin)).status).toBe(204);
  });

  it("sets and clears a stock line's own reorder point", async () => {
    const set = await request(app).patch(`/api/stock/${ctx.stockItem.id}`).set(ctx.auth.admin).send({ reorderPoint: 7 });
    expect(set.body.reorderPoint).toBe(7);
    const cleared = await request(app).patch(`/api/stock/${ctx.stockItem.id}`).set(ctx.auth.admin).send({ reorderPoint: null });
    expect(cleared.body.reorderPoint).toBeNull();
  });

  it("removes a stock line only once its quantity is 0", async () => {
    expect((await request(app).delete(`/api/stock/${ctx.stockItem.id}`).set(ctx.auth.admin)).status).toBe(409);
    await request(app).post(`/api/stock/${ctx.stockItem.id}/adjust`).set(ctx.auth.admin).send({ quantity: 0 });
    expect((await request(app).delete(`/api/stock/${ctx.stockItem.id}`).set(ctx.auth.admin)).status).toBe(204);
  });
});

describe("stock availability and history", () => {
  it("reports checked-out units per stock line", async () => {
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).set(ctx.auth.tech).send({ quantity: 4 });
    await request(app).post(`/api/stock/${ctx.stockItem.id}/return`).set(ctx.auth.tech).send({ quantity: 1 });
    const res = await request(app).get("/api/stock").set(ctx.auth.readOnly);
    expect(res.body.find((s: { id: string }) => s.id === ctx.stockItem.id).checkedOut).toBe(3);
  });

  it("filters transactions by item, location and date, newest first", async () => {
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).set(ctx.auth.tech).send({ quantity: 1 });
    await request(app).post(`/api/stock/${ctx.stockItem.id}/checkout`).set(ctx.auth.tech).send({ quantity: 2 });
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get("/api/inventory-transactions")
      .query({ catalogItemId: ctx.consumableCatalogItem.id, locationId: ctx.location.id, from: today, to: today })
      .set(ctx.auth.readOnly);
    expect(res.body.map((t: { quantity: number }) => t.quantity)).toEqual([2, 1]);

    const none = await request(app).get("/api/inventory-transactions").query({ to: "2000-01-01" }).set(ctx.auth.readOnly);
    expect(none.body).toEqual([]);
  });
});

describe("sign-up with administrator approval", () => {
  const signup = (body: object) => request(app).post("/api/auth/signup").send(body);
  const newcomer = { name: "New Person", email: "New.Person@test.local", password: "a good password" };

  it("creates a pending account that can't sign in until approved", async () => {
    expect((await signup(newcomer)).status).toBe(201);
    const blocked = await request(app).post("/api/auth/login").send({ email: newcomer.email, password: newcomer.password });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toMatch(/waiting for an administrator/);
    // A wrong password still gets the generic message, so pending status isn't revealed.
    const wrong = await request(app).post("/api/auth/login").send({ email: newcomer.email, password: "wrong password" });
    expect(wrong.status).toBe(401);

    const list = await request(app).get("/api/users").set(ctx.auth.admin);
    const pending = list.body.find((u: { email: string }) => u.email === newcomer.email);
    expect(pending).toMatchObject({ status: "pending", role: "Viewer", hasPassword: true });

    const approve = await request(app)
      .patch(`/api/users/${pending.id}`)
      .set(ctx.auth.admin)
      .send({ status: "active", role: "Tech Support" });
    expect(approve.status).toBe(200);
    const login = await request(app).post("/api/auth/login").send({ email: "new.person@test.local", password: newcomer.password });
    expect(login.status).toBe(200);
    expect(login.body.user.permission).toBe("technician");
  });

  it("refuses duplicate emails (any case), short passwords and bad emails", async () => {
    expect((await signup({ ...newcomer, email: "ADMIN@test.local" })).status).toBe(409);
    expect((await signup({ ...newcomer, password: "short" })).status).toBe(400);
    expect((await signup({ ...newcomer, email: "not-an-email" })).status).toBe(400);
  });

  it("lets an administrator decline (delete) a request, but not delete real users", async () => {
    await signup(newcomer);
    const list = await request(app).get("/api/users").set(ctx.auth.admin);
    const pending = list.body.find((u: { email: string }) => u.email === newcomer.email);
    expect((await request(app).delete(`/api/users/${pending.id}`).set(ctx.auth.tech)).status).toBe(403);
    expect((await request(app).delete(`/api/users/${pending.id}`).set(ctx.auth.admin)).status).toBe(204);
    expect((await request(app).delete(`/api/users/${ctx.tech.id}`).set(ctx.auth.admin)).status).toBe(409);
    // Declined people can apply again.
    expect((await signup(newcomer)).status).toBe(201);
  });

  it("explains a deactivated account after a correct password", async () => {
    await db.update(users).set({ status: "inactive" }).where(eq(users.id, ctx.admin.id));
    const res = await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "correct horse" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/deactivated/);
  });

  it("limits sign-ups per network", async () => {
    for (let i = 0; i < MAX_SIGNUPS; i++) await signup({ ...newcomer, email: `person${i}@test.local` });
    expect((await signup({ ...newcomer, email: "one-more@test.local" })).status).toBe(429);
  });
});
