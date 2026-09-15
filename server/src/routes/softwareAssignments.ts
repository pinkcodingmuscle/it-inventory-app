import { Router } from "express";
import { db } from "../db/client.js";
import { softwareAssignments } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requirePermission } from "../middleware/auth.js";
import { revokeSoftwareAssignment } from "../services/software.js";

export const softwareAssignmentsRouter = Router();

softwareAssignmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(softwareAssignments);
    res.json(rows);
  })
);

softwareAssignmentsRouter.post(
  "/:id/revoke",
  requirePermission("administrator", "inventory_manager", "technician"),
  asyncHandler(async (req, res) => {
    const row = await revokeSoftwareAssignment(req.params.id);
    res.json(row);
  })
);
