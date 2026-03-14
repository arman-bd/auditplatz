import { faker } from "@faker-js/faker/locale/de";
import {
  genId,
  shouldInjectError,
  pickErrorType,
  randomInt,
  randomFloat,
  round2,
  addDays,
  pick,
  monthsBetween,
  SequentialCounter,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Location, Product, PurchaseOrder, POLineItem } from "../types.js";
import type { VendorRecord } from "./vendors.js";

const counter = new SequentialCounter();

const PO_ERROR_TYPES = [
  "quantity_mismatch",        // Ordered vs delivered quantity differs
  "price_discrepancy",        // Unit cost differs from contract price
  "unauthorized_purchase",    // PO created without proper approval
  "duplicate_po",             // Same order placed twice
  "delivery_never_received",  // Marked as delivered but never received
  "wrong_location_delivery",  // Delivered to wrong store
];

export function generatePurchaseOrders(
  locations: Location[],
  products: Product[],
  vendors: VendorRecord[]
): PurchaseOrder[] {
  const orders: PurchaseOrder[] = [];
  const months = monthsBetween(DATA_START_DATE, DATA_END_DATE);

  for (const month of months) {
    // Each location places 1-4 POs per month
    for (const location of locations) {
      const locationOpenDate = new Date(location.openDate);
      if (new Date(month.start) < locationOpenDate) continue;

      const poCount = location.type === "headquarters" ? randomInt(3, 8) : randomInt(1, 3);

      for (let p = 0; p < poCount; p++) {
        const vendor = pick(vendors);
        const orderDate = faker.date
          .between({ from: month.start, to: month.end })
          .toISOString()
          .split("T")[0];
        const expectedDelivery = addDays(orderDate, randomInt(5, 30));

        const lineItemCount = randomInt(1, 6);
        const items: POLineItem[] = [];

        for (let i = 0; i < lineItemCount; i++) {
          const product = pick(products);
          const qty = randomInt(5, 200);
          const unitCost = round2(product.costPrice * randomFloat(0.9, 1.1));
          const total = round2(qty * unitCost);

          items.push({
            productId: product.id,
            description: product.name,
            quantity: qty,
            unitCost,
            total,
          });
        }

        const totalAmount = round2(items.reduce((s, i) => s + i.total, 0));

        // Determine delivery status
        const now = new Date();
        const expectedDate = new Date(expectedDelivery);
        let actualDelivery: string | null = null;
        let status: PurchaseOrder["status"] = "ordered";

        if (expectedDate < now) {
          const rand = Math.random();
          if (rand < 0.75) {
            actualDelivery = addDays(expectedDelivery, randomInt(-3, 7));
            status = "delivered";
          } else if (rand < 0.85) {
            actualDelivery = addDays(expectedDelivery, randomInt(0, 5));
            status = "partial";
          } else if (rand < 0.90) {
            status = "shipped";
          } else if (rand < 0.95) {
            status = "cancelled";
          }
        }

        let hasError = false;
        let errorType: string | null = null;

        if (shouldInjectError()) {
          hasError = true;
          errorType = pickErrorType(PO_ERROR_TYPES);

          switch (errorType) {
            case "quantity_mismatch":
              // Delivered qty differs from ordered
              if (items.length > 0) {
                items[0].quantity = Math.round(items[0].quantity * randomFloat(0.5, 0.8));
                items[0].total = round2(items[0].quantity * items[0].unitCost);
              }
              break;
            case "price_discrepancy":
              if (items.length > 0) {
                items[0].unitCost = round2(items[0].unitCost * randomFloat(1.15, 1.5));
                items[0].total = round2(items[0].quantity * items[0].unitCost);
              }
              break;
            case "delivery_never_received":
              status = "delivered";
              actualDelivery = addDays(expectedDelivery, randomInt(0, 5));
              // Marked delivered but products never appeared in inventory
              break;
            case "unauthorized_purchase":
            case "duplicate_po":
            case "wrong_location_delivery":
              break;
          }
        }

        const finalTotal = round2(items.reduce((s, i) => s + i.total, 0));

        orders.push({
          id: genId(),
          poNumber: counter.next("PO"),
          vendorId: vendor.id,
          locationId: location.id,
          orderDate,
          expectedDelivery,
          actualDelivery,
          status,
          items,
          totalAmount: finalTotal,
          hasError,
          errorType,
        });

        // Duplicate PO injection
        if (hasError && errorType === "duplicate_po") {
          orders.push({
            ...orders[orders.length - 1],
            id: genId(),
            poNumber: counter.next("PO"),
          });
        }
      }
    }
  }

  return orders;
}
