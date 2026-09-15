import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assetEvents, assets } from "../db/schema.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";

export async function assignAsset(assetId: string, toUserId: string) {
  return db.transaction(async (tx) => {
    const [asset] = await tx.select().from(assets).where(eq(assets.id, assetId)).for("update");
    if (!asset) throw new NotFoundError("Asset not found");
    if (asset.status === "retired") throw new BadRequestError("Retired assets cannot be assigned.");

    const [updated] = await tx
      .update(assets)
      .set({ assignedUserId: toUserId, updatedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    await tx.insert(assetEvents).values({
      assetId,
      type: "assigned",
      fromUserId: asset.assignedUserId,
      toUserId,
      fromLocationId: asset.locationId,
      toLocationId: asset.locationId,
    });

    return updated;
  });
}

export async function moveAsset(assetId: string, toLocationId: string) {
  return db.transaction(async (tx) => {
    const [asset] = await tx.select().from(assets).where(eq(assets.id, assetId)).for("update");
    if (!asset) throw new NotFoundError("Asset not found");

    const [updated] = await tx
      .update(assets)
      .set({ locationId: toLocationId, updatedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    await tx.insert(assetEvents).values({
      assetId,
      type: "moved",
      fromLocationId: asset.locationId,
      toLocationId,
    });

    return updated;
  });
}

export async function retireAsset(assetId: string, notes?: string) {
  return db.transaction(async (tx) => {
    const [asset] = await tx.select().from(assets).where(eq(assets.id, assetId)).for("update");
    if (!asset) throw new NotFoundError("Asset not found");
    if (asset.status === "retired") throw new BadRequestError("Asset is already retired.");

    const [updated] = await tx
      .update(assets)
      .set({ status: "retired", assignedUserId: null, updatedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    await tx.insert(assetEvents).values({
      assetId,
      type: "retired",
      fromUserId: asset.assignedUserId,
      fromLocationId: asset.locationId,
      notes,
    });

    return updated;
  });
}
