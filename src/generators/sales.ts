import {
  genId,
  dateRange,
  formatDate,
  formatTime,
  isWeekend,
  shouldInjectError,
  pickErrorType,
  randomInt,
  randomFloat,
  round2,
  pick,
  pickN,
  SequentialCounter,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Employee, Location, Product, SalesTransaction, SalesItem } from "../types.js";

const counter = new SequentialCounter();

const SALES_ERROR_TYPES = [
  "unauthorized_discount",    // Discount applied without manager approval
  "price_override",           // Price manually changed below cost
  "void_without_approval",    // Transaction voided suspiciously
  "split_transaction",        // Large sale split to avoid reporting threshold
  "refund_without_return",    // Refund issued but no product returned
  "employee_self_sale",       // Employee sold to themselves at discount
];

const PAYMENT_METHODS: SalesTransaction["paymentMethod"][] = ["cash", "card", "card", "card", "mobile_pay"];

export function generateSales(
  locations: Location[],
  employees: Employee[],
  products: Product[]
): SalesTransaction[] {
  const transactions: SalesTransaction[] = [];
  const stores = locations.filter((l) => l.type === "retail_store");
  const activeProducts = products.filter((p) => p.isActive);
  const allDates = dateRange(DATA_START_DATE, DATA_END_DATE);

  for (const store of stores) {
    const storeEmployees = employees.filter(
      (e) => e.locationId === store.id && e.isActive
    );
    if (storeEmployees.length === 0) continue;

    const storeOpenDate = new Date(store.openDate);

    for (const date of allDates) {
      if (date < storeOpenDate) continue;

      // Daily transaction volume: 8-25 on weekdays, 15-40 on weekends
      const txCount = isWeekend(date)
        ? randomInt(15, 40)
        : randomInt(8, 25);

      for (let t = 0; t < txCount; t++) {
        const employee = pick(storeEmployees);
        const itemCount = randomInt(1, 4);
        const selectedProducts = pickN(activeProducts, itemCount);

        const items: SalesItem[] = selectedProducts.map((p) => {
          const qty = randomInt(1, 3);
          return {
            productId: p.id,
            productName: p.name,
            category: p.category,
            sku: p.sku,
            quantity: qty,
            unitPrice: p.unitPrice,
            lineTotal: round2(p.unitPrice * qty),
          };
        });

        const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
        const taxRate = 0.19; // German VAT
        const taxAmount = round2(subtotal * taxRate);
        let discount = 0;
        const paymentMethod = pick(PAYMENT_METHODS);
        const hour = randomInt(9, 20);
        const minute = randomInt(0, 59);

        // ─── Error Injection ───
        let hasError = false;
        let errorType: string | null = null;

        if (shouldInjectError()) {
          hasError = true;
          errorType = pickErrorType(SALES_ERROR_TYPES);

          switch (errorType) {
            case "unauthorized_discount":
              discount = round2(subtotal * randomFloat(0.15, 0.40));
              break;
            case "price_override":
              // First item sold below cost
              if (items.length > 0) {
                const product = activeProducts.find((p) => p.id === items[0].productId);
                if (product) {
                  items[0].unitPrice = round2(product.costPrice * randomFloat(0.3, 0.8));
                  items[0].lineTotal = round2(items[0].unitPrice * items[0].quantity);
                }
              }
              break;
            case "split_transaction":
              // Artificially low amount (part of a split)
              if (items.length > 1) {
                items.splice(1); // Keep only first item
              }
              break;
            case "refund_without_return":
              // Negative total (refund)
              items.forEach((item) => {
                item.quantity = -item.quantity;
                item.lineTotal = -Math.abs(item.lineTotal);
              });
              break;
            case "employee_self_sale":
              discount = round2(subtotal * 0.50); // 50% employee discount (unauthorized)
              break;
            case "void_without_approval":
              // Transaction exists but total is 0
              items.forEach((item) => {
                item.lineTotal = 0;
              });
              break;
          }
        }

        const recalcSubtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
        const total = round2(recalcSubtotal + taxAmount - discount);

        transactions.push({
          id: genId(),
          transactionNumber: counter.next("TXN"),
          locationId: store.id,
          employeeId: employee.id,
          date: formatDate(date),
          time: formatTime(hour, minute),
          items,
          subtotal: recalcSubtotal,
          taxAmount,
          discount,
          total,
          paymentMethod,
          hasError,
          errorType,
        });
      }
    }
  }

  return transactions;
}
