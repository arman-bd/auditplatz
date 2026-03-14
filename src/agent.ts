import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import type { AuditFinding, AuditReport } from "../types.js";
import { auditContracts } from "./auditors/contracts.js";
import { auditPayroll } from "./auditors/payroll.js";
import { auditFinancials } from "./auditors/financial.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

// ── AI Provider ──

const featherless = createOpenAICompatible({
  name: "featherless",
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY!,
});

const MODEL_ID = process.env.AUDIT_MODEL || "moonshotai/Kimi-K2.5";
const model = featherless.chatModel(MODEL_ID);

// ── Run Audits ──

export async function runAudit(): Promise<AuditReport> {
  console.log("\n🔍 Running rule-based auditors...\n");

  const [contractFindings, payrollFindings, financialFindings] = await Promise.all([
    auditContracts(),
    auditPayroll(),
    auditFinancials(),
  ]);

  console.log(`  Contracts: ${contractFindings.length} findings`);
  console.log(`  Payroll:   ${payrollFindings.length} findings`);
  console.log(`  Financial: ${financialFindings.length} findings`);

  const allFindings = [...contractFindings, ...payrollFindings, ...financialFindings];

  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const f of allFindings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  }

  return {
    companyName: "M&H Wearables GmbH",
    auditPeriod: { start: "2025-01-01", end: "2025-12-31" },
    generatedAt: new Date().toISOString(),
    findings: allFindings,
    summary: { totalFindings: allFindings.length, bySeverity, byCategory },
  };
}

// ── Database Investigation (10 parallel queries) ──

async function investigateDatabase() {
  const [
    dbOverview, payrollErrors, cashPatterns, contractGaps,
    revenueByLocation, expenseFlags, invoiceIssues, salesErrors,
    topEarners, terminatedStillPaid,
  ] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM employees WHERE is_active = true)::int as active_employees,
        (SELECT COUNT(*) FROM employees WHERE is_active = false)::int as terminated_employees,
        (SELECT COUNT(*) FROM locations WHERE type = 'retail_store')::int as stores,
        (SELECT SUM(gross_pay::numeric) FROM payroll)::numeric as total_payroll,
        (SELECT SUM(total::numeric) FROM sales_transactions)::numeric as total_revenue,
        (SELECT COUNT(*) FROM contracts WHERE status = 'expired')::int as expired_contracts
    `),
    db.execute(sql`
      SELECT p.error_type, COUNT(*)::int as count,
             SUM(p.net_pay::numeric)::numeric as total_amount,
             STRING_AGG(DISTINCT e.first_name || ' ' || e.last_name, ', ') as affected_employees
      FROM payroll p JOIN employees e ON p.employee_id = e.id
      WHERE p.has_error = true GROUP BY p.error_type ORDER BY count DESC
    `),
    db.execute(sql`
      SELECT l.city,
        COUNT(*) FILTER (WHERE cr.variance::numeric < -20)::int as shortage_days,
        SUM(CASE WHEN cr.variance::numeric < 0 THEN cr.variance::numeric ELSE 0 END)::numeric as total_loss,
        MIN(cr.variance::numeric)::numeric as worst_day
      FROM cash_reconciliations cr JOIN locations l ON cr.location_id = l.id
      GROUP BY l.city HAVING COUNT(*) FILTER (WHERE cr.variance::numeric < -20) > 0
      ORDER BY total_loss ASC
    `),
    db.execute(sql`
      SELECT e.first_name, e.last_name, e.job_title, e.department, e.hire_date, l.city
      FROM employees e JOIN locations l ON e.location_id = l.id
      WHERE e.is_active = true
        AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.party_id = e.id AND c.type = 'employee')
    `),
    db.execute(sql`
      SELECT l.city, COUNT(st.id)::int as transactions,
        SUM(st.total::numeric)::numeric as revenue,
        AVG(st.total::numeric)::numeric as avg_ticket,
        SUM(st.discount::numeric)::numeric as total_discounts
      FROM sales_transactions st JOIN locations l ON st.location_id = l.id
      GROUP BY l.city ORDER BY revenue DESC
    `),
    db.execute(sql`
      SELECT er.error_type, COUNT(*)::int as count,
             SUM(er.total_amount::numeric)::numeric as total,
             STRING_AGG(DISTINCT e.first_name || ' ' || e.last_name, ', ') as employees
      FROM expense_reports er JOIN employees e ON er.employee_id = e.id
      WHERE er.has_error = true GROUP BY er.error_type
    `),
    db.execute(sql`
      SELECT i.status, COUNT(*)::int as count, SUM(i.total_amount::numeric)::numeric as total
      FROM invoices i GROUP BY i.status ORDER BY count DESC
    `),
    db.execute(sql`
      SELECT st.error_type, COUNT(*)::int as count, l.city, SUM(st.total::numeric)::numeric as total_value
      FROM sales_transactions st JOIN locations l ON st.location_id = l.id
      WHERE st.has_error = true GROUP BY st.error_type, l.city ORDER BY count DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT e.first_name, e.last_name, e.job_title, l.city,
             SUM(p.overtime_hours::numeric)::numeric as total_ot_hours,
             SUM(p.overtime_pay::numeric)::numeric as total_ot_pay,
             MAX(p.overtime_hours::numeric)::numeric as max_monthly_ot
      FROM payroll p JOIN employees e ON p.employee_id = e.id JOIN locations l ON e.location_id = l.id
      WHERE p.overtime_hours::numeric > 0
      GROUP BY e.first_name, e.last_name, e.job_title, l.city
      ORDER BY total_ot_hours DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT e.first_name, e.last_name, e.termination_date, e.job_title,
             COUNT(p.id)::int as payments_after,
             SUM(p.net_pay::numeric)::numeric as total_paid_after
      FROM payroll p JOIN employees e ON p.employee_id = e.id
      WHERE e.termination_date IS NOT NULL AND p.period_start > e.termination_date
      GROUP BY e.first_name, e.last_name, e.termination_date, e.job_title
    `),
  ]);

  return {
    overview: dbOverview[0],
    payrollErrors, cashPatterns, contractGaps, revenueByLocation,
    expenseFlags, invoiceIssues, salesErrors, topEarners, terminatedStillPaid,
  };
}

// ── Build Data Summary ──

function fmt(n: unknown): string {
  return Number(n).toLocaleString("en", { maximumFractionDigits: 0 });
}

function fmtEur(n: unknown): string {
  return `€${fmt(n)}`;
}

async function buildDataSummary(report: AuditReport): Promise<string> {
  console.log("  📊 Building data summary...");
  const inv = await investigateDatabase();
  const o = inv.overview as any;
  console.log("  ✓ Summary built\n");

  const byType: Record<string, number> = {};
  for (const f of report.findings) byType[f.type] = (byType[f.type] || 0) + 1;
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const line = (arr: any[], mapFn: (item: any) => string) =>
    arr.length ? arr.map(mapFn).join("\n    ") : "None detected";

  return `
# DATA SUMMARY — M&H Wearables GmbH (FY 2025)

## Company Overview
- Active employees: ${o.active_employees} | Terminated: ${o.terminated_employees}
- Retail stores: ${o.stores} | Total locations: ${Number(o.stores) + 1}
- Total revenue: ${fmtEur(o.total_revenue)}
- Total payroll: ${fmtEur(o.total_payroll)}
- Payroll-to-revenue ratio: ${(Number(o.total_payroll) / Number(o.total_revenue) * 100).toFixed(1)}%
- Expired contracts: ${o.expired_contracts}

## Audit Findings Summary
- Total: ${report.summary.totalFindings}
- Critical: ${report.summary.bySeverity["critical"] || 0} | High: ${report.summary.bySeverity["high"] || 0} | Medium: ${report.summary.bySeverity["medium"] || 0} | Low: ${report.summary.bySeverity["low"] || 0}
- By category: ${Object.entries(report.summary.byCategory || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}

## Top Finding Types
${topTypes.map(([type, count]) => `    ${type}: ${count}`).join("\n")}

## Payroll Issues
    ${line(inv.payrollErrors as any[], (p) =>
      `${p.error_type}: ${p.count} cases, ${fmtEur(p.total_amount)} (${p.affected_employees?.split(", ").length || 0} employees)`
    )}

## Ghost Employees
    ${line(inv.terminatedStillPaid as any[], (e) =>
      `${e.first_name} ${e.last_name} (${e.job_title}): terminated ${e.termination_date}, ${e.payments_after} payments, ${fmtEur(e.total_paid_after)}`
    )}

## Top Overtime Violators
    ${line((inv.topEarners as any[]).slice(0, 5), (e) =>
      `${e.first_name} ${e.last_name} (${e.job_title}, ${e.city}): ${fmt(e.total_ot_hours)}h, max ${fmt(e.max_monthly_ot)}h/month, ${fmtEur(e.total_ot_pay)}`
    )}

## Employees Without Contracts
    ${(inv.contractGaps as any[]).length
      ? (inv.contractGaps as any[]).map((e: any) => `${e.first_name} ${e.last_name} (${e.job_title}, ${e.department})`).join(", ")
      : "All employees have contracts"}

## Cash Shortages by Store
    ${line(inv.cashPatterns as any[], (c) =>
      `${c.city}: ${c.shortage_days} days, ${fmtEur(Math.abs(Number(c.total_loss)))} lost, worst ${fmtEur(Math.abs(Number(c.worst_day)))}`
    )}

## Revenue by Location
    ${line(inv.revenueByLocation as any[], (r) =>
      `${r.city}: ${fmtEur(r.revenue)} (${fmt(r.transactions)} txns, avg ${fmtEur(r.avg_ticket)})`
    )}

## Sales Errors
    ${line((inv.salesErrors as any[]).slice(0, 10), (s) =>
      `${s.error_type} at ${s.city}: ${s.count} cases, ${fmtEur(s.total_value)}`
    )}

## Expense Anomalies
    ${line(inv.expenseFlags as any[], (e) =>
      `${e.error_type}: ${e.count} cases, ${fmtEur(e.total)} (${e.employees})`
    )}

## Invoice Status
    ${line(inv.invoiceIssues as any[], (i) =>
      `${i.status}: ${i.count} invoices, ${fmtEur(i.total)}`
    )}`.trim();
}

// ── AI Report Generation ──

export async function analyzeWithAI(report: AuditReport): Promise<string> {
  console.log(`\n🤖 Generating AI report (${MODEL_ID})...\n`);

  const dataSummary = await buildDataSummary(report);

  const topFindings = report.findings
    .sort((a, b) => severityScore(b.severity) - severityScore(a.severity))
    .slice(0, 15)
    .map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.type}: ${f.description.slice(0, 150)}`)
    .join("\n");

  console.log("  Streaming report from AI...\n");

  const stream = streamText({
    model,
    maxTokens: 4096,
    messages: [
      {
        role: "system",
        content: "You are an expert forensic auditor specializing in German corporate compliance, financial controls, and labor law (ArbZG, Nachweisgesetz, GDPR, SchwarzArbG). Produce professional, evidence-based executive audit reports.",
      },
      {
        role: "user",
        content: `Generate an executive audit report for M&H Wearables GmbH.

${dataSummary}

## Top 15 Findings
${topFindings}

---

Sections: Executive Summary, Critical Issues, Pattern Analysis, Risk Assessment Matrix, Remediation Roadmap (immediate/short/long-term), German Compliance. Use real data.`,
      },
    ],
  });

  let text = "";
  process.stdout.write("  ");
  for await (const chunk of stream.textStream) {
    text += chunk;
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  console.log("  ✅ Done\n");

  return text;
}

function severityScore(s: string): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s] || 0;
}
