import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, customersTable, productsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { genId, now } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable)
      .where(eq(ordersTable.storeId, req.user!.storeId))
      .orderBy(desc(ordersTable.createdAt));

    // Attach items to each order
    const orderIds = orders.map(o => o.id);
    if (orderIds.length === 0) { res.json([]); return; }

    const allItems = await db.select().from(orderItemsTable)
      .where(eq(orderItemsTable.storeId, req.user!.storeId));

    const itemsByOrder = new Map<string, typeof allItems>();
    for (const item of allItems) {
      if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
      itemsByOrder.get(item.orderId)!.push(item);
    }

    res.json(orders.map(o => ({ ...o, items: itemsByOrder.get(o.id) ?? [] })));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/", async (req, res) => {
  try {
    const storeId = req.user!.storeId;
    const ts = now();

    const {
      items, subtotal, discountAmount, taxAmount, total,
      paymentMethod, cashReceived, change,
      customerId, customerName, status, note,
    } = req.body as {
      items: Array<{
        productId: string; productName: string; productNameAr?: string;
        sku?: string; quantity: number; unitPrice: number; purchasePrice?: number;
        discount?: number; lineTotal: number;
      }>;
      subtotal: number; discountAmount: number; taxAmount: number; total: number;
      paymentMethod: string; cashReceived?: number; change?: number;
      customerId?: string; customerName?: string; status?: string; note?: string;
    };

    // Generate order number
    const existingCount = (await db.select().from(ordersTable).where(eq(ordersTable.storeId, storeId))).length;
    const orderNumber = `#${String(existingCount + 1).padStart(4, "0")}`;
    const orderId = genId();

    await db.insert(ordersTable).values({
      id: orderId, storeId, orderNumber,
      customerId, customerName,
      cashier: req.user!.name,
      status: status ?? "completed",
      subtotal: Number(subtotal), discountAmount: Number(discountAmount ?? 0),
      taxAmount: Number(taxAmount ?? 0), total: Number(total),
      paymentMethod: paymentMethod ?? "cash",
      cashReceived: cashReceived !== undefined ? Number(cashReceived) : undefined,
      change: change !== undefined ? Number(change) : undefined,
      note,
      createdAt: ts,
    });

    // Insert items
    if (items?.length) {
      await db.insert(orderItemsTable).values(
        items.map(item => ({
          id: genId(), orderId, storeId,
          productId: item.productId,
          productName: item.productName,
          productNameAr: item.productNameAr,
          sku: item.sku ?? "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          purchasePrice: Number(item.purchasePrice ?? 0),
          discount: Number(item.discount ?? 0),
          lineTotal: Number(item.lineTotal),
        }))
      );

      // Deduct stock for each product
      for (const item of items) {
        const prod = await db.select().from(productsTable)
          .where(and(eq(productsTable.id, item.productId), eq(productsTable.storeId, storeId))).get();
        if (prod) {
          await db.update(productsTable)
            .set({ stock: Math.max(0, prod.stock - item.quantity), updatedAt: now() })
            .where(eq(productsTable.id, item.productId));
        }
      }
    }

    // Update customer stats if customerId provided
    if (customerId) {
      const customer = await db.select().from(customersTable)
        .where(and(eq(customersTable.id, customerId), eq(customersTable.storeId, storeId))).get();
      if (customer) {
        await db.update(customersTable).set({
          totalPurchases: customer.totalPurchases + Number(total),
          totalOrders: customer.totalOrders + 1,
          lastVisit: ts,
        }).where(eq(customersTable.id, customerId));
      }
    }

    const order = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).get();
    const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    res.status(201).json({ ...order, items: orderItems });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
