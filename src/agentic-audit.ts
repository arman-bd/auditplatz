import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

// ── AI Provider ──

const featherless = createOpenAICompatible({
  name: "featherless",
  baseURL: "https://api.featherless.ai/v1",
  apiKey:
    process.env.FEATHERLESS_API_KEY ||
    "***REDACTED_API_KEY***",
});

const MODEL_ID = process.env.AUDIT_MODEL || "google/gemma-3-27b-it";
const model = featherless.chatModel(MODEL_ID);

// ── Pre-built Summary Queries ──

interface QueryDef {
  name: string;
  label: string;
  keywords: string[];
  query: string;
}

const QUERIES: QueryDef[] = [
  {
    name: "company_overview",
    label: "Company Overview",
    keywords: ["overview", "company", "summary", "full", "all", "general", "complete", "total"],
    query: `SELECT
      (SELECT COUNT(*) FROM employees WHERE is_active = true)::int as active_employees,
      (SELECT COUNT(*) FROM employees WHERE is_active = false)::int as terminated_employees,
      (SELECT COUNT(*) FROM locations WHERE type = 'retail_store')::int as stores,
      (SELECT SUM(gross_pay::numeric) FROM payroll)::numeric as total_payroll,
      (SELECT SUM(total::numeric) FROM sales_transactions)::numeric as total_revenue,
      (SELECT COUNT(*) FROM contracts WHERE status = 'expired')::int as expired_contracts`,
  },
  {
    name: "ghost_employees",
    label: "Ghost Employees",
    keywords: ["ghost", "terminated", "still paid", "after termination", "dead"],
    query: `SELECT e.first_name || ' ' || e.last_name as employee, e.job_title, e.termination_date,
      COUNT(p.id)::int as payments_after_termination,
      SUM(p.net_pay::numeric)::numeric as total_paid_after
    FROM payroll p JOIN employees e ON p.employee_id = e.id
    WHERE e.termination_date IS NOT NULL AND p.period_start > e.termination_date
    GROUP BY e.first_name, e.last_name, e.job_title, e.termination_date
    ORDER BY total_paid_after DESC`,
  },
  {
    name: "payroll_error_summary",
    label: "Payroll Errors",
    keywords: ["payroll", "salary", "pay", "overpayment", "underpayment", "duplicate", "error"],
    query: `SELECT error_type, COUNT(*)::int as count, SUM(net_pay::numeric)::numeric as total_amount
    FROM payroll WHERE has_error = true GROUP BY error_type ORDER BY count DESC`,
  },
  {
    name: "overtime_violations",
    label: "Overtime Violations",
    keywords: ["overtime", "arbzg", "labor law", "hours", "excessive", "working time"],
    query: `SELECT e.first_name || ' ' || e.last_name as employee, e.job_title, l.city,
      COUNT(*)::int as months_with_ot,
      SUM(p.overtime_hours::numeric)::numeric as total_ot_hours,
      MAX(p.overtime_hours::numeric)::numeric as max_monthly_ot,
      SUM(p.overtime_pay::numeric)::numeric as total_ot_pay
    FROM payroll p JOIN employees e ON p.employee_id = e.id JOIN locations l ON e.location_id = l.id
    WHERE p.overtime_hours::numeric > 0
    GROUP BY e.first_name, e.last_name, e.job_title, l.city
    HAVING MAX(p.overtime_hours::numeric) > 48
    ORDER BY max_monthly_ot DESC LIMIT 10`,
  },
  {
    name: "cash_shortage_summary",
    label: "Cash Shortages by Location",
    keywords: ["cash", "shortage", "theft", "register", "reconciliation", "store", "variance"],
    query: `SELECT l.city, l.name as store,
      COUNT(*) FILTER (WHERE cr.variance::numeric < -20)::int as shortage_days,
      SUM(CASE WHEN cr.variance::numeric < 0 THEN cr.variance::numeric ELSE 0 END)::numeric as total_loss,
      MIN(cr.variance::numeric)::numeric as worst_single_day,
      AVG(cr.variance::numeric)::numeric as avg_variance
    FROM cash_reconciliations cr JOIN locations l ON cr.location_id = l.id
    GROUP BY l.city, l.name
    HAVING COUNT(*) FILTER (WHERE cr.variance::numeric < -20) > 0
    ORDER BY total_loss ASC`,
  },
  {
    name: "contract_issues",
    label: "Contract Issues",
    keywords: ["contract", "expired", "missing", "lease", "vendor", "mismatch"],
    query: `SELECT
      type, status, COUNT(*)::int as count,
      SUM(value::numeric)::numeric as total_value
    FROM contracts
    GROUP BY type, status ORDER BY count DESC`,
  },
  {
    name: "missing_employee_contracts",
    label: "Employees Without Contracts",
    keywords: ["contract", "missing", "employee"],
    query: `SELECT e.first_name || ' ' || e.last_name as employee, e.job_title, e.department, e.hire_date
    FROM employees e
    WHERE e.is_active = true
      AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.party_id = e.id AND c.type = 'employee')
    ORDER BY e.hire_date LIMIT 15`,
  },
  {
    name: "expense_anomalies",
    label: "Expense Report Anomalies",
    keywords: ["expense", "fraud", "self-approved", "reimbursement", "anomaly"],
    query: `SELECT error_type, COUNT(*)::int as count,
      SUM(total_amount::numeric)::numeric as total_amount
    FROM expense_reports WHERE has_error = true
    GROUP BY error_type ORDER BY total_amount DESC`,
  },
  {
    name: "overdue_invoices",
    label: "Overdue Invoices",
    keywords: ["invoice", "overdue", "unpaid", "receivable", "payable"],
    query: `SELECT status, COUNT(*)::int as count,
      SUM(total_amount::numeric)::numeric as total
    FROM invoices GROUP BY status ORDER BY count DESC`,
  },
  {
    name: "sales_error_summary",
    label: "Sales Errors",
    keywords: ["sales", "transaction", "discount", "revenue", "pos"],
    query: `SELECT error_type, l.city, COUNT(*)::int as count,
      SUM(st.total::numeric)::numeric as total_value
    FROM sales_transactions st JOIN locations l ON st.location_id = l.id
    WHERE st.has_error = true
    GROUP BY error_type, l.city ORDER BY count DESC LIMIT 15`,
  },
  {
    name: "error_overview",
    label: "All Flagged Records",
    keywords: ["error", "flag", "issue", "problem", "anomaly", "all", "full"],
    query: `SELECT 'payroll' as source, COUNT(*)::int as flagged, SUM(net_pay::numeric)::numeric as total FROM payroll WHERE has_error = true
    UNION ALL SELECT 'sales', COUNT(*)::int, SUM(total::numeric)::numeric FROM sales_transactions WHERE has_error = true
    UNION ALL SELECT 'expenses', COUNT(*)::int, SUM(total_amount::numeric)::numeric FROM expense_reports WHERE has_error = true
    UNION ALL SELECT 'invoices', COUNT(*)::int, SUM(total_amount::numeric)::numeric FROM invoices WHERE has_error = true
    UNION ALL SELECT 'contracts', COUNT(*)::int, SUM(value::numeric)::numeric FROM contracts WHERE has_error = true`,
  },
];

// ── Query Selection ──

function selectQueries(prompt: string): QueryDef[] {
  const lower = prompt.toLowerCase();

  // Full audit = everything
  if (/\b(full audit|all audits|complete|everything|comprehensive)\b/i.test(prompt)) {
    return QUERIES;
  }

  const scored = QUERIES.map((q) => {
    const score = q.keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
    return { q, score };
  });

  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  if (matched.length > 0) {
    const selected = matched.map((m) => m.q);
    // Always add overview for context if not already present
    if (!selected.find((s) => s.name === "company_overview")) {
      selected.unshift(QUERIES[0]);
    }
    return selected;
  }

  // Fallback: overview + error summary
  return [QUERIES[0], QUERIES.find((q) => q.name === "error_overview")!];
}

// ── Types ──

export interface AgenticAuditMessage {
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  timestamp: string;
}

// ── Main Runner ──

export async function runAgenticAudit(
  userPrompt: string,
  onStep?: (message: AgenticAuditMessage) => void
): Promise<{ report: string; steps: AgenticAuditMessage[] }> {
  const steps: AgenticAuditMessage[] = [];
  const emit = (msg: AgenticAuditMessage) => {
    steps.push(msg);
    onStep?.(msg);
  };

  emit({ role: "user", content: userPrompt, timestamp: new Date().toISOString() });

  // ── Phase 1: Select relevant queries (instant, keyword-based) ──

  const selected = selectQueries(userPrompt);

  emit({
    role: "assistant",
    content: `Running ${selected.length} investigation queries: ${selected.map((s) => s.label).join(", ")}`,
    timestamp: new Date().toISOString(),
  });

  // ── Phase 2: Execute SQL queries in parallel ──

  const queryResults: Record<string, any> = {};

  await Promise.all(
    selected.map(async (qdef) => {
      emit({ role: "tool_call", content: qdef.query, toolName: qdef.name, timestamp: new Date().toISOString() });

      try {
        const result = await db.execute(sql.raw(qdef.query));
        const data = result.slice(0, 15);
        queryResults[qdef.name] = data;
        emit({
          role: "tool_result",
          content: JSON.stringify(data, null, 2),
          toolName: qdef.name,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        queryResults[qdef.name] = { error: err.message };
        emit({ role: "tool_result", content: `Error: ${err.message}`, toolName: qdef.name, timestamp: new Date().toISOString() });
      }
    })
  );

  // ── Phase 3: AI analyzes summary data and writes report ──

  emit({ role: "assistant", content: "Generating audit report...", timestamp: new Date().toISOString() });

  const dataSummary = Object.entries(queryResults)
    .map(([name, data]) => {
      const label = selected.find((q) => q.name === name)?.label || name;
      if (data?.error) return `### ${label}\nError: ${data.error}`;
      return `### ${label}\n${JSON.stringify(data, null, 2)}`;
    })
    .join("\n\n");

  const stream = streamText({
    model,
    maxTokens: 2048,
    system: `You are an expert forensic auditor for M&H Wearables GmbH (German retail). Write a concise audit report using markdown. Cite specific numbers, names, and euro amounts. Structure: Summary, Key Findings (with severity), Recommendations.`,
    messages: [
      {
        role: "user",
        content: `Question: "${userPrompt}"\n\nData:\n\n${dataSummary}\n\nWrite the audit report.`,
      },
    ],
  });

  let reportText = "";
  for await (const chunk of stream.textStream) {
    reportText += chunk;
  }

  emit({ role: "assistant", content: reportText, timestamp: new Date().toISOString() });

  return { report: reportText, steps };
}
