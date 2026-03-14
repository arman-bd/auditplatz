import {
  genId,
  shouldInjectError,
  pickErrorType,
  randomInt,
  round2,
  pick,
  monthsBetween,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Location, Product, InventoryRecord } from "../types.js";

const INVENTORY_ERROR_TYPES = [
  "shrinkage_theft",           // Inventory missing — internal theft suspected
  "phantom_inventory",         // System shows stock but shelf is empty
  "receiving_error",           // Wrong quantity received vs what was logged
  "miscount",                  // Physical count doesn't match system
  "unauthorized_adjustment",   // Inventory adjusted without proper authorization
  "transfer_discrepancy",      // Transfer quantity mismatch between locations
];

export function generateInventory(
  locations: Location[],
  products: Product[]
): InventoryRecord[] {
  const records: InventoryRecord[] = [];
  const months = monthsBetween(DATA_START_DATE, DATA_END_DATE);
  const stores = locations.filter((l) => l.type === "retail_store");
  const activeProducts = products.filter((p) => p.isActive);

  // Track running balances per product per location
  const balances = new Map<string, number>();

  for (const month of months) {
    for (const store of stores) {
      if (new Date(month.start) < new Date(store.openDate)) continue;

      // Sample: process ~30% of products each month to keep data size manageable
      const sampledProducts = activeProducts.filter(() => Math.random() < 0.3);

      for (const product of sampledProducts) {
        const key = `${product.id}|${store.id}`;
        let balance = balances.get(key) ?? randomInt(10, 50); // Initial stock

        // ─── Receipt (restock) ───
        if (Math.random() < 0.4) {
          const qty = randomInt(10, 100);
          balance += qty;

          let hasError = false;
          let errorType: string | null = null;

          if (shouldInjectError()) {
            hasError = true;
            errorType = pickErrorType(INVENTORY_ERROR_TYPES);
            if (errorType === "receiving_error") {
              balance += randomInt(-10, -3); // Received less than logged
            }
          }

          records.push({
            id: genId(),
            productId: product.id,
            locationId: store.id,
            date: month.start,
            type: "receipt",
            quantityChange: qty,
            runningBalance: balance,
            reference: `PO restock`,
            hasError,
            errorType,
          });
        }

        // ─── Sales (outgoing) ───
        const salesQty = randomInt(1, Math.min(15, Math.max(1, balance)));
        balance -= salesQty;

        records.push({
          id: genId(),
          productId: product.id,
          locationId: store.id,
          date: month.end,
          type: "sale",
          quantityChange: -salesQty,
          runningBalance: Math.max(0, balance),
          reference: "Monthly sales",
          hasError: false,
          errorType: null,
        });

        // ─── Shrinkage / Theft ───
        if (shouldInjectError()) {
          const shrinkage = randomInt(1, 5);
          balance -= shrinkage;

          records.push({
            id: genId(),
            productId: product.id,
            locationId: store.id,
            date: month.end,
            type: "adjustment",
            quantityChange: -shrinkage,
            runningBalance: Math.max(0, balance),
            reference: "Inventory adjustment — unaccounted loss",
            hasError: true,
            errorType: pick(["shrinkage_theft", "phantom_inventory", "miscount"]),
          });
        }

        balances.set(key, Math.max(0, balance));
      }
    }
  }

  return records;
}
