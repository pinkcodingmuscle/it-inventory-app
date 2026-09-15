import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { inventoryTransactions, purchaseOrderLines, purchaseOrders, stockItems } from "../db/schema.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";

export interface ReceiveLine {
  lineId: string;
  quantity: number;
}

export async function receivePurchaseOrder(
  purchaseOrderId: string,
  locationId: string,
  lines: ReceiveLine[],
  performedByUserId: string
) {
  return db.transaction(async (tx) => {
    const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).for("update");
    if (!po) throw new NotFoundError("Purchase order not found");
    if (po.status === "cancelled") throw new BadRequestError("Cannot receive a cancelled purchase order.");

    const allLines = await tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, purchaseOrderId));
    const linesById = new Map(allLines.map((line) => [line.id, line]));

    for (const receipt of lines) {
      const line = linesById.get(receipt.lineId);
      if (!line) throw new BadRequestError(`Line ${receipt.lineId} does not belong to this purchase order.`);
      if (receipt.quantity <= 0) throw new BadRequestError("Received quantity must be greater than zero.");

      const newReceivedQuantity = line.receivedQuantity + receipt.quantity;
      if (newReceivedQuantity > line.quantity) {
        throw new BadRequestError(
          `Cannot receive ${receipt.quantity} more of line ${line.id}; only ${line.quantity - line.receivedQuantity} remain on order.`
        );
      }

      await tx
        .update(purchaseOrderLines)
        .set({ receivedQuantity: newReceivedQuantity })
        .where(eq(purchaseOrderLines.id, line.id));

      const [existingStock] = await tx
        .select()
        .from(stockItems)
        .where(and(eq(stockItems.catalogItemId, line.catalogItemId), eq(stockItems.locationId, locationId)))
        .for("update");

      if (existingStock) {
        await tx
          .update(stockItems)
          .set({ quantity: existingStock.quantity + receipt.quantity, updatedAt: new Date() })
          .where(eq(stockItems.id, existingStock.id));
      } else {
        await tx.insert(stockItems).values({
          catalogItemId: line.catalogItemId,
          locationId,
          quantity: receipt.quantity,
        });
      }

      await tx.insert(inventoryTransactions).values({
        catalogItemId: line.catalogItemId,
        locationId,
        type: "receipt",
        quantity: receipt.quantity,
        performedByUserId,
        relatedPurchaseOrderId: purchaseOrderId,
      });
    }

    const refreshedLines = await tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, purchaseOrderId));
    const fullyReceived = refreshedLines.every((line) => line.receivedQuantity >= line.quantity);

    const [updatedPo] = await tx
      .update(purchaseOrders)
      .set({ status: fullyReceived ? "received" : po.status, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, purchaseOrderId))
      .returning();

    return { purchaseOrder: updatedPo, lines: refreshedLines };
  });
}
