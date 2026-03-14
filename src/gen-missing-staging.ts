import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "generated-data");
const COPY_DIR = join(DATA_DIR, "copy-staging");

function escapeForCopy(val: unknown): string {
  if (val === null || val === undefined || val === "") return "\\N";
  if (typeof val === "boolean") return val ? "t" : "f";
  if (typeof val === "object") return escapeForCopy(JSON.stringify(val));
  return String(val).replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

function rowLine(row: any, cols: string[]): string {
  return cols.map((col) => {
    const ck = col.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    return escapeForCopy(row[ck] !== undefined ? row[ck] : row[col]);
  }).join("\t");
}

async function convert(
  jsonl: string, parentFile: string, pCols: string[],
  childFile: string | null, cCols: string[] | null,
  extractFn: ((row: any) => any[]) | null
) {
  const rl = createInterface({ input: createReadStream(join(DATA_DIR, jsonl), { encoding: "utf-8" }), crlfDelay: Infinity });
  const ps = createWriteStream(join(COPY_DIR, parentFile));
  const cs = childFile ? createWriteStream(join(COPY_DIR, childFile)) : null;
  let pc = 0, cc = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    ps.write(rowLine(row, pCols) + "\n");
    pc++;
    if (cs && extractFn && cCols) {
      for (const child of extractFn(row)) {
        cs.write(rowLine(child, cCols) + "\n");
        cc++;
      }
    }
  }
  ps.end(); cs?.end();
  await new Promise<void>((r) => ps.on("finish", r));
  if (cs) await new Promise<void>((r) => cs!.on("finish", r));
  console.log(`${parentFile}: ${pc} rows`);
  if (childFile) console.log(`${childFile}: ${cc} rows`);
}

async function main() {
  await convert("purchase_orders.jsonl", "purchase_orders.tsv",
    ["id", "po_number", "vendor_id", "location_id", "order_date", "expected_delivery", "actual_delivery", "status", "total_amount", "has_error", "error_type"],
    "po_items.tsv",
    ["purchase_order_id", "product_id", "description", "quantity", "unit_cost", "total"],
    (row: any) => (row.items || []).map((i: any) => ({ purchaseOrderId: row.id, ...i }))
  );

  await convert("audit_logs.jsonl", "audit_logs.tsv",
    ["id", "timestamp", "user_id", "action", "entity_type", "entity_id", "old_value", "new_value", "ip_address"],
    null, null, null
  );
}

main();
