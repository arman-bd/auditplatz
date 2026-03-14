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
import type { Invoice, InvoiceLineItem } from "../types.js";
import type { VendorRecord } from "./vendors.js";

const counter = new SequentialCounter();

const INVOICE_ERROR_TYPES = [
  "duplicate_invoice",        // Same invoice submitted twice
  "amount_mismatch",          // Invoice amount doesn't match PO
  "missing_approval",         // Invoice paid without approval
  "late_payment",             // Payment significantly past due date
  "wrong_vendor_payment",     // Payment sent to wrong vendor
  "tax_calculation_error",    // VAT calculated incorrectly
  "overbilled",               // Vendor charged more than agreed
];

const EXPENSE_DESCRIPTIONS = [
  "Electronic components - Q{q} delivery",
  "Watch band materials - bulk order",
  "Display units - monthly supply",
  "Packaging materials",
  "Office supplies",
  "IT infrastructure services",
  "Marketing campaign materials",
  "Logistics and shipping",
  "Quality testing services",
  "Facility maintenance",
];

export function generateInvoices(vendors: VendorRecord[]): Invoice[] {
  const invoices: Invoice[] = [];
  const months = monthsBetween(DATA_START_DATE, DATA_END_DATE);

  // ─── Incoming Invoices (from vendors) ───
  for (const vendor of vendors) {
    for (const month of months) {
      // Each vendor sends 1-3 invoices per month
      const invoiceCount = randomInt(1, 3);

      for (let i = 0; i < invoiceCount; i++) {
        const issueDate = faker.date
          .between({ from: month.start, to: month.end })
          .toISOString()
          .split("T")[0];
        const dueDate = addDays(issueDate, 30);

        const lineItemCount = randomInt(1, 5);
        const lineItems: InvoiceLineItem[] = [];

        for (let j = 0; j < lineItemCount; j++) {
          const qty = randomFloat(1, 100);
          const unitPrice = randomFloat(10, 5000);
          const total = round2(qty * unitPrice);
          const desc = pick(EXPENSE_DESCRIPTIONS).replace(
            "{q}",
            String(Math.ceil((new Date(issueDate).getMonth() + 1) / 3))
          );

          lineItems.push({ description: desc, quantity: qty, unitPrice, total });
        }

        const amount = round2(lineItems.reduce((s, li) => s + li.total, 0));
        let taxAmount = round2(amount * 0.19);
        const totalAmount = round2(amount + taxAmount);

        // Determine payment status
        const now = new Date();
        const dueDateObj = new Date(dueDate);
        let paidDate: string | null = null;
        let status: Invoice["status"] = "unpaid";

        if (dueDateObj < now) {
          if (Math.random() < 0.85) {
            const payDelay = randomInt(-5, 15);
            paidDate = addDays(dueDate, payDelay);
            status = "paid";
          } else if (Math.random() < 0.5) {
            status = "overdue";
          }
        }

        let hasError = false;
        let errorType: string | null = null;

        if (shouldInjectError()) {
          hasError = true;
          errorType = pickErrorType(INVOICE_ERROR_TYPES);

          switch (errorType) {
            case "tax_calculation_error":
              taxAmount = round2(amount * randomFloat(0.10, 0.25)); // Wrong VAT rate
              break;
            case "overbilled":
              lineItems[0].total = round2(lineItems[0].total * randomFloat(1.1, 1.5));
              break;
            case "late_payment":
              if (status === "paid" && paidDate) {
                paidDate = addDays(dueDate, randomInt(30, 90));
              }
              break;
            case "missing_approval":
              status = "paid";
              paidDate = paidDate || addDays(issueDate, randomInt(1, 5));
              break;
            case "duplicate_invoice":
            case "amount_mismatch":
            case "wrong_vendor_payment":
              break;
          }
        }

        invoices.push({
          id: genId(),
          invoiceNumber: counter.next("INV"),
          type: "incoming",
          vendorId: vendor.id,
          customerId: null,
          issueDate,
          dueDate,
          paidDate,
          amount,
          taxAmount,
          totalAmount: round2(amount + taxAmount),
          status,
          lineItems,
          hasError,
          errorType,
        });

        // Duplicate invoice injection
        if (hasError && errorType === "duplicate_invoice") {
          invoices.push({
            ...invoices[invoices.length - 1],
            id: genId(),
            invoiceNumber: counter.next("INV"),
          });
        }
      }
    }
  }

  // ─── Outgoing Invoices (to customers - B2B) ───
  const b2bCustomers = [
    "SportHaus München GmbH",
    "TechLife Berlin AG",
    "FitnessWorld Hamburg",
    "Digital Retail Partners",
    "Gesundheit Plus Versicherung",
  ];

  for (const customer of b2bCustomers) {
    for (const month of months) {
      if (Math.random() < 0.4) continue; // Not every month

      const issueDate = faker.date
        .between({ from: month.start, to: month.end })
        .toISOString()
        .split("T")[0];
      const dueDate = addDays(issueDate, 30);
      const amount = round2(randomFloat(2000, 50000));
      const taxAmount = round2(amount * 0.19);

      const now = new Date();
      const dueDateObj = new Date(dueDate);
      let paidDate: string | null = null;
      let status: Invoice["status"] = "unpaid";

      if (dueDateObj < now && Math.random() < 0.9) {
        paidDate = addDays(dueDate, randomInt(-10, 10));
        status = "paid";
      } else if (dueDateObj < now) {
        status = "overdue";
      }

      let hasError = false;
      let errorType: string | null = null;
      if (shouldInjectError()) {
        hasError = true;
        errorType = pickErrorType(INVOICE_ERROR_TYPES);
      }

      invoices.push({
        id: genId(),
        invoiceNumber: counter.next("OUT"),
        type: "outgoing",
        vendorId: null,
        customerId: genId(),
        issueDate,
        dueDate,
        paidDate,
        amount,
        taxAmount,
        totalAmount: round2(amount + taxAmount),
        status,
        lineItems: [
          {
            description: `Bulk order - wearable devices for ${customer}`,
            quantity: randomInt(10, 200),
            unitPrice: randomFloat(50, 400),
            total: amount,
          },
        ],
        hasError,
        errorType,
      });
    }
  }

  return invoices;
}
