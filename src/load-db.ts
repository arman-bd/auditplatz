/**
 * Fast DB loader — generates CSV files compatible with PostgreSQL COPY
 * and pipes them directly into the container via docker exec + psql.
 *
 * This is ~50-100x faster than row-by-row INSERT over the network.
 */

import { readFileSync, existsSync, createReadStream, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { createInterface } from "readline";
import { createWriteStream } from "fs";

const DATA_DIR = join(process.cwd(), "generated-data");
const COPY_DIR = join(DATA_DIR, "copy-staging");
const CONTAINER = "business-auditor-db";
const DB = "business_auditor";
const USER = "mh_admin";

function readJSON<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
}

function readJSONLStream(filename: string): AsyncIterable<string> {
  const rl = createInterface({
    input: createReadStream(join(DATA_DIR, filename), { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  return rl;
}

/** Escape a value for PostgreSQL COPY tab-delimited format */
function escapeForCopy(val: unknown): string {
  if (val === null || val === undefined) return "\\N";
  if (val === "") return "\\N";
  if (typeof val === "boolean") return val ? "t" : "f";
  if (typeof val === "object") return escapeForCopy(JSON.stringify(val));
  const str = String(val);
  // Escape backslashes, tabs, newlines
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/** Convert a JSON row to a tab-delimited line for COPY */
function rowToCopyLine(row: Record<string, unknown>, columns: string[]): string {
  return columns
    .map((col) => {
      const camelKey = col.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      const val = row[camelKey] !== undefined ? row[camelKey] : row[col];
      return escapeForCopy(val);
    })
    .join("\t");
}

/** Write a JSON array to a COPY-ready file */
function writeCopyFile(filename: string, data: any[], columns: string[]): string {
  const path = join(COPY_DIR, filename);
  const lines = data.map((row) => rowToCopyLine(row, columns));
  writeFileSync(path, lines.join("\n") + "\n");
  return path;
}

/** Stream a JSONL file to a COPY-ready file, also extracting child rows */
async function streamToCopyFile(
  jsonlFile: string,
  parentFile: string,
  parentColumns: string[],
  childConfig?: {
    file: string;
    columns: string[];
    extract: (row: any) => Record<string, unknown>[];
  }
): Promise<{ parentPath: string; parentCount: number; childPath?: string; childCount?: number }> {
  const parentPath = join(COPY_DIR, parentFile);
  const parentStream = createWriteStream(parentPath);
  let parentCount = 0;

  let childStream: ReturnType<typeof createWriteStream> | undefined;
  let childPath: string | undefined;
  let childCount = 0;

  if (childConfig) {
    childPath = join(COPY_DIR, childConfig.file);
    childStream = createWriteStream(childPath);
  }

  for await (const line of readJSONLStream(jsonlFile)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    parentStream.write(rowToCopyLine(row, parentColumns) + "\n");
    parentCount++;

    if (childConfig && childStream) {
      const children = childConfig.extract(row);
      for (const child of children) {
        childStream.write(rowToCopyLine(child, childConfig.columns) + "\n");
        childCount++;
      }
    }

    if (parentCount % 100000 === 0) {
      process.stdout.write(`\r  Preparing ${parentFile}: ${parentCount.toLocaleString()} rows...`);
    }
  }

  parentStream.end();
  childStream?.end();

  // Wait for streams to finish
  await new Promise<void>((resolve) => parentStream.on("finish", resolve));
  if (childStream) await new Promise<void>((resolve) => childStream!.on("finish", resolve));

  return { parentPath, parentCount, childPath, childCount };
}

/** Copy a file into the container and run COPY FROM */
function loadViaCopy(localPath: string, table: string, columns: string[], count: number) {
  const containerPath = `/tmp/${table}.tsv`;

  // Copy file into container
  execSync(`docker cp "${localPath}" ${CONTAINER}:${containerPath}`, { stdio: "pipe" });

  // Run COPY
  const colList = columns.join(", ");
  const sql = `\\COPY ${table} (${colList}) FROM '${containerPath}' WITH (FORMAT text, NULL '\\\\N')`;
  execSync(
    `docker exec ${CONTAINER} psql -U ${USER} -d ${DB} -c "${sql}"`,
    { stdio: "pipe" }
  );

  // Cleanup
  execSync(`docker exec ${CONTAINER} rm ${containerPath}`, { stdio: "pipe" });

  console.log(`  ✓ ${table}: ${count.toLocaleString()} rows`);
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  M&H Wearables — Fast DB Loader (COPY method)");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (!existsSync(join(DATA_DIR, "locations.json"))) {
    console.error("No generated data found. Run `npm run generate` first.");
    process.exit(1);
  }

  // Ensure staging dir
  execSync(`mkdir -p "${COPY_DIR}"`);

  const start = Date.now();

  // ─── Phase 1: Prepare COPY files ───
  console.log("Phase 1: Converting data to COPY format...\n");

  // Small JSON files
  const locationsCols = ["id", "code", "type", "name", "city", "address", "postal_code", "state", "open_date", "is_active"];
  const locations = readJSON<any[]>("locations.json");
  writeCopyFile("locations.tsv", locations, locationsCols);
  console.log(`  ✓ locations.tsv: ${locations.length} rows`);

  const employeesCols = [
    "id", "employee_number", "first_name", "last_name", "email", "phone",
    "date_of_birth", "hire_date", "termination_date", "location_id", "department",
    "job_title", "employment_type", "annual_salary", "bank_iban", "tax_id",
    "social_security_number", "manager_id", "is_active",
  ];
  const employees = readJSON<any[]>("employees.json");
  // Managers first, then rest
  const managers = employees.filter((e: any) => !e.managerId);
  const nonManagers = employees.filter((e: any) => e.managerId);
  writeCopyFile("employees_managers.tsv", managers, employeesCols);
  writeCopyFile("employees_rest.tsv", nonManagers, employeesCols);
  console.log(`  ✓ employees: ${employees.length} rows (${managers.length} managers + ${nonManagers.length} staff)`);

  const productsCols = ["id", "sku", "name", "category", "unit_price", "cost_price", "is_active"];
  const products = readJSON<any[]>("products.json");
  writeCopyFile("products.tsv", products, productsCols);
  console.log(`  ✓ products.tsv: ${products.length} rows`);

  const vendorsCols = ["id", "name", "country", "category", "contact_email", "contact_phone", "tax_id", "is_active"];
  const vendorsData = readJSON<any[]>("vendors.json");
  writeCopyFile("vendors.tsv", vendorsData, vendorsCols);
  console.log(`  ✓ vendors.tsv: ${vendorsData.length} rows`);

  const contractsCols = [
    "id", "contract_number", "type", "party_name", "party_id", "start_date",
    "end_date", "value", "currency", "status", "auto_renew", "terms", "has_error", "error_type",
  ];
  const contracts = readJSON<any[]>("contracts.json");
  writeCopyFile("contracts.tsv", contracts, contractsCols);
  console.log(`  ✓ contracts.tsv: ${contracts.length} rows`);

  // Large JSONL files — stream to COPY files
  const payrollCols = [
    "id", "employee_id", "period_start", "period_end", "pay_date", "base_pay",
    "overtime_hours", "overtime_pay", "bonus", "deductions", "tax_withheld",
    "social_security", "health_insurance", "gross_pay", "net_pay", "has_error", "error_type",
  ];
  const payrollResult = await streamToCopyFile("payroll.jsonl", "payroll.tsv", payrollCols);
  console.log(`\r  ✓ payroll.tsv: ${payrollResult.parentCount.toLocaleString()} rows          `);

  const timeCols = [
    "id", "employee_id", "date", "clock_in", "clock_out", "scheduled_hours",
    "actual_hours", "overtime_hours", "break_minutes", "status", "has_error", "error_type",
  ];
  const timeResult = await streamToCopyFile("time_entries.jsonl", "time_entries.tsv", timeCols);
  console.log(`\r  ✓ time_entries.tsv: ${timeResult.parentCount.toLocaleString()} rows          `);

  const salesCols = [
    "id", "transaction_number", "location_id", "employee_id", "date", "time",
    "subtotal", "tax_amount", "discount", "total", "payment_method", "has_error", "error_type",
  ];
  const salesItemsCols = ["transaction_id", "product_id", "product_name", "category", "sku", "quantity", "unit_price", "line_total"];
  const salesResult = await streamToCopyFile("sales_transactions.jsonl", "sales.tsv", salesCols, {
    file: "sales_items.tsv",
    columns: salesItemsCols,
    extract: (row: any) =>
      (row.items || []).map((item: any) => ({
        transactionId: row.id,
        productId: item.productId,
        productName: item.productName,
        category: item.category,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
  });
  console.log(`\r  ✓ sales.tsv: ${salesResult.parentCount.toLocaleString()} rows          `);
  console.log(`  ✓ sales_items.tsv: ${salesResult.childCount?.toLocaleString()} rows`);

  const cashCols = [
    "id", "location_id", "date", "register_number", "expected_cash", "actual_cash",
    "variance", "reconciled_by", "notes", "has_error", "error_type",
  ];
  const cashResult = await streamToCopyFile("cash_reconciliations.jsonl", "cash_recon.tsv", cashCols);
  console.log(`\r  ✓ cash_recon.tsv: ${cashResult.parentCount.toLocaleString()} rows          `);

  const invCols = [
    "id", "product_id", "location_id", "date", "type", "quantity_change",
    "running_balance", "reference", "has_error", "error_type",
  ];
  const invResult = await streamToCopyFile("inventory_records.jsonl", "inventory.tsv", invCols);
  console.log(`\r  ✓ inventory.tsv: ${invResult.parentCount.toLocaleString()} rows          `);

  const invoiceCols = [
    "id", "invoice_number", "type", "vendor_id", "customer_id", "issue_date",
    "due_date", "paid_date", "amount", "tax_amount", "total_amount", "status",
    "has_error", "error_type",
  ];
  const invoiceItemCols = ["invoice_id", "description", "quantity", "unit_price", "total"];
  const invoiceResult = await streamToCopyFile("invoices.jsonl", "invoices.tsv", invoiceCols, {
    file: "invoice_items.tsv",
    columns: invoiceItemCols,
    extract: (row: any) => (row.lineItems || []).map((item: any) => ({ invoiceId: row.id, ...item })),
  });
  console.log(`\r  ✓ invoices.tsv: ${invoiceResult.parentCount.toLocaleString()} rows          `);
  console.log(`  ✓ invoice_items.tsv: ${invoiceResult.childCount?.toLocaleString()} rows`);

  const expCols = [
    "id", "employee_id", "submitted_date", "approved_date", "approved_by",
    "status", "total_amount", "has_error", "error_type",
  ];
  const expItemCols = ["expense_report_id", "category", "description", "date", "amount", "receipt_attached"];
  const expResult = await streamToCopyFile("expense_reports.jsonl", "expenses.tsv", expCols, {
    file: "expense_items.tsv",
    columns: expItemCols,
    extract: (row: any) => (row.items || []).map((item: any) => ({ expenseReportId: row.id, ...item })),
  });
  console.log(`\r  ✓ expenses.tsv: ${expResult.parentCount.toLocaleString()} rows          `);
  console.log(`  ✓ expense_items.tsv: ${expResult.childCount?.toLocaleString()} rows`);

  const poCols = [
    "id", "po_number", "vendor_id", "location_id", "order_date", "expected_delivery",
    "actual_delivery", "status", "total_amount", "has_error", "error_type",
  ];
  const poItemCols = ["purchase_order_id", "product_id", "description", "quantity", "unit_cost", "total"];
  const poResult = await streamToCopyFile("purchase_orders.jsonl", "purchase_orders.tsv", poCols, {
    file: "po_items.tsv",
    columns: poItemCols,
    extract: (row: any) => (row.items || []).map((item: any) => ({ purchaseOrderId: row.id, ...item })),
  });
  console.log(`\r  ✓ purchase_orders.tsv: ${poResult.parentCount.toLocaleString()} rows          `);
  console.log(`  ✓ po_items.tsv: ${poResult.childCount?.toLocaleString()} rows`);

  const auditCols = [
    "id", "timestamp", "user_id", "action", "entity_type", "entity_id",
    "old_value", "new_value", "ip_address",
  ];
  const auditResult = await streamToCopyFile("audit_logs.jsonl", "audit_logs.tsv", auditCols);
  console.log(`\r  ✓ audit_logs.tsv: ${auditResult.parentCount.toLocaleString()} rows          `);

  const prepTime = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nPhase 1 done in ${prepTime}s\n`);

  // ─── Phase 2: COPY into Postgres ───
  console.log("Phase 2: Loading into PostgreSQL via COPY...\n");
  const copyStart = Date.now();

  // Order matters — FK dependencies
  loadViaCopy(join(COPY_DIR, "locations.tsv"), "locations", locationsCols, locations.length);
  loadViaCopy(join(COPY_DIR, "employees_managers.tsv"), "employees", employeesCols, managers.length);
  loadViaCopy(join(COPY_DIR, "employees_rest.tsv"), "employees", employeesCols, nonManagers.length);
  loadViaCopy(join(COPY_DIR, "products.tsv"), "products", productsCols, products.length);
  loadViaCopy(join(COPY_DIR, "vendors.tsv"), "vendors", vendorsCols, vendorsData.length);

  // These are independent — load them
  loadViaCopy(join(COPY_DIR, "payroll.tsv"), "payroll", payrollCols, payrollResult.parentCount);
  loadViaCopy(join(COPY_DIR, "time_entries.tsv"), "time_entries", timeCols, timeResult.parentCount);
  loadViaCopy(join(COPY_DIR, "sales.tsv"), "sales_transactions", salesCols, salesResult.parentCount);
  loadViaCopy(join(COPY_DIR, "sales_items.tsv"), "sales_items", salesItemsCols, salesResult.childCount!);
  loadViaCopy(join(COPY_DIR, "cash_recon.tsv"), "cash_reconciliations", cashCols, cashResult.parentCount);
  loadViaCopy(join(COPY_DIR, "inventory.tsv"), "inventory_records", invCols, invResult.parentCount);
  loadViaCopy(join(COPY_DIR, "contracts.tsv"), "contracts", contractsCols, contracts.length);
  loadViaCopy(join(COPY_DIR, "invoices.tsv"), "invoices", invoiceCols, invoiceResult.parentCount);
  loadViaCopy(join(COPY_DIR, "invoice_items.tsv"), "invoice_line_items", invoiceItemCols, invoiceResult.childCount!);
  loadViaCopy(join(COPY_DIR, "expenses.tsv"), "expense_reports", expCols, expResult.parentCount);
  loadViaCopy(join(COPY_DIR, "expense_items.tsv"), "expense_items", expItemCols, expResult.childCount!);
  loadViaCopy(join(COPY_DIR, "purchase_orders.tsv"), "purchase_orders", poCols, poResult.parentCount);
  loadViaCopy(join(COPY_DIR, "po_items.tsv"), "po_line_items", poItemCols, poResult.childCount!);
  loadViaCopy(join(COPY_DIR, "audit_logs.tsv"), "audit_logs", auditCols, auditResult.parentCount);

  const copyTime = ((Date.now() - copyStart) / 1000).toFixed(1);
  const totalTime = ((Date.now() - start) / 1000).toFixed(1);

  // Verify row counts
  console.log("\n─── Verification ───");
  const tables = [
    "locations", "employees", "products", "vendors", "payroll", "time_entries",
    "sales_transactions", "sales_items", "cash_reconciliations",
    "inventory_records", "contracts", "invoices", "invoice_line_items",
    "expense_reports", "expense_items", "purchase_orders", "po_line_items",
    "audit_logs",
  ];
  const countSql = tables.map((t) => `SELECT '${t}' AS t, COUNT(*) AS c FROM ${t}`).join(" UNION ALL ");
  const result = execSync(
    `docker exec ${CONTAINER} psql -U ${USER} -d ${DB} -t -A -F '|' -c "${countSql}"`,
    { encoding: "utf-8" }
  );
  for (const line of result.trim().split("\n")) {
    const [table, count] = line.split("|");
    console.log(`  ${table}: ${parseInt(count).toLocaleString()}`);
  }

  // Cleanup staging
  execSync(`rm -rf "${COPY_DIR}"`);

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  COPY phase: ${copyTime}s | Total: ${totalTime}s`);
  console.log(`═══════════════════════════════════════════════════════════`);
}

main().catch(console.error);
