import { writeFileSync, createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { generateLocations } from "./generators/locations.js";
import { generateEmployees } from "./generators/employees.js";
import { generateProducts } from "./generators/products.js";
import { generatePayroll } from "./generators/payroll.js";
import { generateTimeEntries } from "./generators/time-entries.js";
import { generateSales } from "./generators/sales.js";
import { generateCashReconciliations } from "./generators/cash-reconciliation.js";
import { generateInventory } from "./generators/inventory.js";
import { generateContracts } from "./generators/contracts.js";
import { generateInvoices } from "./generators/invoices.js";
import { generateExpenses } from "./generators/expenses.js";
import { generatePurchaseOrders } from "./generators/purchase-orders.js";
import { generateAuditLogs } from "./generators/audit-log.js";
import { generateVendors } from "./generators/vendors.js";
import { logProgress } from "./utils.js";
import type { ErrorSummary } from "./types.js";

// ─── Output Directory ───

const OUTPUT_DIR = join(process.cwd(), "generated-data");

function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function writeJSON(filename: string, data: unknown) {
  const path = join(OUTPUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`  → Wrote ${path}`);
}

/** Stream large arrays as JSON lines (JSONL) to avoid string length limits */
function writeJSONL(filename: string, data: unknown[]) {
  const path = join(OUTPUT_DIR, filename);
  const stream = createWriteStream(path);
  for (const item of data) {
    stream.write(JSON.stringify(item) + "\n");
  }
  stream.end();
  console.log(`  → Wrote ${path} (${data.length.toLocaleString()} lines)`);
}

function writeCSV(filename: string, data: Record<string, unknown>[]) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const path = join(OUTPUT_DIR, filename);
  writeFileSync(path, csv);
  console.log(`  → Wrote ${path}`);
}

function computeErrorSummary(
  label: string,
  records: { hasError: boolean; errorType: string | null }[]
): ErrorSummary {
  const errorRecords = records.filter((r) => r.hasError);
  const errorsByType: Record<string, number> = {};
  for (const r of errorRecords) {
    if (r.errorType) {
      errorsByType[r.errorType] = (errorsByType[r.errorType] || 0) + 1;
    }
  }
  return {
    totalRecords: records.length,
    errorRecords: errorRecords.length,
    errorRate: records.length > 0 ? errorRecords.length / records.length : 0,
    errorsByType,
  };
}

// ─── Flatten helpers for CSV (extract nested items) ───

function flattenSalesForCSV(transactions: ReturnType<typeof generateSales>) {
  // Main transactions (without items array)
  const txns = transactions.map(({ items, ...rest }) => rest);
  // Line items with transaction reference
  const lineItems = transactions.flatMap((t) =>
    t.items.map((item) => ({ transactionId: t.id, ...item }))
  );
  return { txns, lineItems };
}

function flattenInvoicesForCSV(invoices: ReturnType<typeof generateInvoices>) {
  const invs = invoices.map(({ lineItems, ...rest }) => rest);
  const items = invoices.flatMap((inv) =>
    inv.lineItems.map((item) => ({ invoiceId: inv.id, ...item }))
  );
  return { invs, items };
}

function flattenExpensesForCSV(expenses: ReturnType<typeof generateExpenses>) {
  const reports = expenses.map(({ items, ...rest }) => rest);
  const items = expenses.flatMap((exp) =>
    exp.items.map((item) => ({ expenseReportId: exp.id, ...item }))
  );
  return { reports, items };
}

function flattenPOsForCSV(orders: ReturnType<typeof generatePurchaseOrders>) {
  const pos = orders.map(({ items, ...rest }) => rest);
  const items = orders.flatMap((po) =>
    po.items.map((item) => ({ purchaseOrderId: po.id, ...item }))
  );
  return { pos, items };
}

// ═══════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  M&H Wearables GmbH — Synthetic Business Data Generator");
  console.log("═══════════════════════════════════════════════════════════");
  console.log();

  const startTime = Date.now();
  ensureOutputDir();

  // ─── Phase 1: Core Entities ───
  console.log("Phase 1: Generating core entities...");
  const locations = generateLocations();
  logProgress("locations", locations.length);

  const employees = generateEmployees(locations);
  logProgress("employees", employees.length);

  const products = generateProducts();
  logProgress("products", products.length);

  const vendors = generateVendors();
  logProgress("vendors", vendors.length);

  // ─── Phase 2: Transactional Data ───
  console.log("\nPhase 2: Generating payroll & time entries...");
  const payroll = generatePayroll(employees);
  logProgress("payroll records", payroll.length);

  const timeEntries = generateTimeEntries(employees);
  logProgress("time entries", timeEntries.length);

  console.log("\nPhase 3: Generating sales & cash reconciliation...");
  const sales = generateSales(locations, employees, products);
  logProgress("sales transactions", sales.length);

  const cashReconciliations = generateCashReconciliations(locations, employees, sales);
  logProgress("cash reconciliations", cashReconciliations.length);

  console.log("\nPhase 4: Generating inventory...");
  const inventory = generateInventory(locations, products);
  logProgress("inventory records", inventory.length);

  console.log("\nPhase 5: Generating contracts, invoices, expenses, POs...");
  const contracts = generateContracts(locations, employees, vendors);
  logProgress("contracts", contracts.length);

  const invoices = generateInvoices(vendors);
  logProgress("invoices", invoices.length);

  const expenses = generateExpenses(employees);
  logProgress("expense reports", expenses.length);

  const purchaseOrders = generatePurchaseOrders(locations, products, vendors);
  logProgress("purchase orders", purchaseOrders.length);

  console.log("\nPhase 6: Generating audit logs...");
  const auditLogs = generateAuditLogs(employees);
  logProgress("audit log entries", auditLogs.length);

  // ─── Error Summary ───
  console.log("\n─── Error Summary ───");
  const errorSummaries: Record<string, ErrorSummary> = {
    payroll: computeErrorSummary("payroll", payroll),
    timeEntries: computeErrorSummary("timeEntries", timeEntries),
    sales: computeErrorSummary("sales", sales),
    cashReconciliations: computeErrorSummary("cashReconciliations", cashReconciliations),
    inventory: computeErrorSummary("inventory", inventory),
    contracts: computeErrorSummary("contracts", contracts),
    invoices: computeErrorSummary("invoices", invoices),
    expenses: computeErrorSummary("expenses", expenses),
    purchaseOrders: computeErrorSummary("purchaseOrders", purchaseOrders),
  };

  for (const [domain, summary] of Object.entries(errorSummaries)) {
    console.log(
      `  ${domain}: ${summary.errorRecords}/${summary.totalRecords} errors (${(summary.errorRate * 100).toFixed(2)}%)`
    );
    if (Object.keys(summary.errorsByType).length > 0) {
      for (const [type, count] of Object.entries(summary.errorsByType)) {
        console.log(`    - ${type}: ${count}`);
      }
    }
  }

  // ─── Write Output Files ───
  console.log("\n─── Writing output files ───");

  // JSON for small datasets, JSONL for large ones
  writeJSON("locations.json", locations);
  writeJSON("employees.json", employees);
  writeJSON("products.json", products);
  writeJSON("vendors.json", vendors);
  writeJSON("contracts.json", contracts);
  writeJSON("error_summary.json", errorSummaries);

  // JSONL for large datasets (avoids string length limits)
  writeJSONL("payroll.jsonl", payroll);
  writeJSONL("time_entries.jsonl", timeEntries);
  writeJSONL("sales_transactions.jsonl", sales);
  writeJSONL("cash_reconciliations.jsonl", cashReconciliations);
  writeJSONL("inventory_records.jsonl", inventory);
  writeJSONL("invoices.jsonl", invoices);
  writeJSONL("expense_reports.jsonl", expenses);
  writeJSONL("purchase_orders.jsonl", purchaseOrders);
  writeJSONL("audit_logs.jsonl", auditLogs);

  // CSV (flattened for easy DB import)
  writeCSV("locations.csv", locations as any);
  writeCSV("employees.csv", employees as any);
  writeCSV("products.csv", products as any);
  writeCSV("payroll.csv", payroll as any);
  writeCSV("time_entries.csv", timeEntries as any);
  writeCSV("cash_reconciliations.csv", cashReconciliations as any);
  writeCSV("inventory_records.csv", inventory as any);
  writeCSV("contracts.csv", contracts as any);
  writeCSV("audit_logs.csv", auditLogs as any);

  // Flattened CSVs for tables with line items
  const { txns: salesTxns, lineItems: salesLineItems } = flattenSalesForCSV(sales);
  writeCSV("sales_transactions.csv", salesTxns as any);
  writeCSV("sales_items.csv", salesLineItems as any);

  const { invs, items: invItems } = flattenInvoicesForCSV(invoices);
  writeCSV("invoices.csv", invs as any);
  writeCSV("invoice_line_items.csv", invItems as any);

  const { reports, items: expItems } = flattenExpensesForCSV(expenses);
  writeCSV("expense_reports.csv", reports as any);
  writeCSV("expense_items.csv", expItems as any);

  const { pos, items: poItems } = flattenPOsForCSV(purchaseOrders);
  writeCSV("purchase_orders.csv", pos as any);
  writeCSV("po_line_items.csv", poItems as any);

  // ─── Done ───
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalRecords =
    locations.length +
    employees.length +
    products.length +
    payroll.length +
    timeEntries.length +
    sales.length +
    cashReconciliations.length +
    inventory.length +
    contracts.length +
    invoices.length +
    expenses.length +
    purchaseOrders.length +
    auditLogs.length;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  Done! Generated ${totalRecords.toLocaleString()} total records in ${elapsed}s`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch(console.error);
