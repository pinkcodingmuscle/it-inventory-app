import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { softwareAssignments, softwareLicenses } from "../db/schema.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";

export async function assignSoftware(licenseId: string, userId?: string, assetId?: string) {
  if (!userId && !assetId) throw new BadRequestError("Provide a userId or an assetId to assign the license to.");

  return db.transaction(async (tx) => {
    const [license] = await tx
      .select()
      .from(softwareLicenses)
      .where(eq(softwareLicenses.id, licenseId))
      .for("update");
    if (!license) throw new NotFoundError("Software license not found");

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(softwareAssignments)
      .where(and(eq(softwareAssignments.softwareLicenseId, licenseId), isNull(softwareAssignments.revokedAt)));

    if (count >= license.totalSeats) {
      throw new BadRequestError("All seats for this license are already assigned.");
    }

    const [assignment] = await tx
      .insert(softwareAssignments)
      .values({ softwareLicenseId: licenseId, userId, assetId })
      .returning();

    return assignment;
  });
}

export async function revokeSoftwareAssignment(assignmentId: string) {
  const [existing] = await db
    .select()
    .from(softwareAssignments)
    .where(eq(softwareAssignments.id, assignmentId))
    .limit(1);
  if (!existing) throw new NotFoundError("Software assignment not found");
  if (existing.revokedAt) throw new BadRequestError("This assignment has already been revoked.");

  const [row] = await db
    .update(softwareAssignments)
    .set({ revokedAt: new Date() })
    .where(eq(softwareAssignments.id, assignmentId))
    .returning();
  return row;
}
