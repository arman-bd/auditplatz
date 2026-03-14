import { readFileSync, existsSync } from "fs";
import { join } from "path";
import postgres from "postgres";

const DATA_DIR = join(process.cwd(), "..", "data");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://mh_admin:***REDACTED_PASSWORD***@localhost:5433/business_auditor";

const sql = postgres(connectionString, { max: 5, idle_timeout: 20 });

// ── Types ──

export interface AuditFinding {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  entityId: string;
  description: string;
  evidence: Record<string, unknown>;
  recommendation: string;
}

export interface AuditResult {
  audit: string;
  ranAt: string;
  findings: AuditFinding[];
  summary: { total: number; bySeverity: Record<string, number> };
}

export interface AuditReport {
  companyName: string;
  auditPeriod: { start: string; end: string };
  generatedAt: string;
  findings: AuditFinding[];
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

// ── Per-audit results ──

export function getAuditResult(type: "contracts" | "payroll" | "financial"): AuditResult | null {
  const path = join(DATA_DIR, `audit-${type}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function getAllAuditResults(): { contracts: AuditResult | null; payroll: AuditResult | null; financial: AuditResult | null } {
  return {
    contracts: getAuditResult("contracts"),
    payroll: getAuditResult("payroll"),
    financial: getAuditResult("financial"),
  };
}

export function getCombinedFindings(): AuditFinding[] {
  const results = getAllAuditResults();
  const all: AuditFinding[] = [];
  if (results.contracts) all.push(...results.contracts.findings);
  if (results.payroll) all.push(...results.payroll.findings);
  if (results.financial) all.push(...results.financial.findings);
  return all;
}

export function getAIReport(): string | null {
  const path = join(DATA_DIR, "audit-report.md");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

// ── Database queries ──

export async function getDBStats() {
  const result = await sql`
    SELECT
      (SELECT COUNT(*) FROM employees)::int as employee_count,
      (SELECT COUNT(*) FROM employees WHERE is_active = true)::int as active_employees,
      (SELECT COUNT(*) FROM employees WHERE is_active = false)::int as terminated_employees,
      (SELECT COUNT(*) FROM locations)::int as location_count,
      (SELECT COUNT(*) FROM locations WHERE type = 'retail_store')::int as store_count,
      (SELECT COUNT(*) FROM contracts)::int as contract_count,
      (SELECT COUNT(*) FROM payroll)::int as payroll_count,
      (SELECT COUNT(*) FROM sales_transactions)::int as sales_count,
      (SELECT COUNT(*) FROM cash_reconciliations)::int as cash_report_count,
      (SELECT COUNT(*) FROM invoices)::int as invoice_count,
      (SELECT COUNT(*) FROM expense_reports)::int as expense_count,
      (SELECT COUNT(*) FROM products)::int as product_count,
      (SELECT COUNT(*) FROM vendors)::int as vendor_count,
      (SELECT COALESCE(SUM(total::numeric), 0) FROM sales_transactions)::numeric as total_revenue,
      (SELECT COALESCE(SUM(gross_pay::numeric), 0) FROM payroll)::numeric as total_payroll
  `;
  return result[0];
}

export async function getLocationBreakdown() {
  return sql`
    SELECT l.id, l.city, l.type, l.name, l.code,
      (SELECT COUNT(*) FROM employees e WHERE e.location_id = l.id AND e.is_active = true)::int as employee_count,
      (SELECT COALESCE(SUM(total::numeric), 0) FROM sales_transactions st WHERE st.location_id = l.id)::numeric as total_revenue,
      (SELECT COUNT(*) FROM cash_reconciliations cr WHERE cr.location_id = l.id AND cr.variance::numeric < -10)::int as cash_shortage_days,
      (SELECT COUNT(*) FROM sales_transactions st WHERE st.location_id = l.id AND st.has_error = true)::int as sales_errors
    FROM locations l
    ORDER BY l.type DESC, l.city
  `;
}

export async function getDepartmentBreakdown() {
  return sql`
    SELECT department, COUNT(*)::int as count,
           COUNT(*) FILTER (WHERE is_active = true)::int as active,
           AVG(annual_salary::numeric)::numeric as avg_salary
    FROM employees
    GROUP BY department
    ORDER BY count DESC
  `;
}

export async function getRecentPayroll() {
  return sql`
    SELECT period_start,
      COUNT(*)::int as records,
      SUM(gross_pay::numeric)::numeric as total_gross,
      SUM(net_pay::numeric)::numeric as total_net,
      COUNT(*) FILTER (WHERE has_error = true)::int as errors
    FROM payroll
    GROUP BY period_start
    ORDER BY period_start DESC
    LIMIT 12
  `;
}

export async function hasData(): Promise<boolean> {
  try {
    const result = await sql`SELECT COUNT(*)::int as c FROM locations`;
    return result[0].c > 0;
  } catch {
    return false;
  }
}
