import { db } from "../../db/index.js";
import { sql } from "drizzle-orm";
import type { AuditFinding } from "../../types.js";

export async function auditFinancials(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // 1. Cash discrepancies (variance > €10)
  const cashIssues = await db.execute(sql`
    SELECT cr.id, cr.date, cr.expected_cash, cr.actual_cash, cr.variance, cr.notes,
           l.city, l.name as loc_name
    FROM cash_reconciliations cr
    JOIN locations l ON cr.location_id = l.id
    WHERE ABS(CAST(cr.variance AS NUMERIC)) > 10
    ORDER BY ABS(CAST(cr.variance AS NUMERIC)) DESC
  `);

  for (const row of cashIssues) {
    const variance = Number(row.variance);
    const severity = Math.abs(variance) > 200 ? "high" : Math.abs(variance) > 50 ? "medium" : "low";
    findings.push({
      type: variance < 0 ? "cash_shortage" : "cash_surplus",
      severity,
      category: "Financial",
      entityId: String(row.id),
      description: `Cash ${variance < 0 ? "shortage" : "surplus"} of €${Math.abs(variance).toFixed(2)} at ${row.city} store on ${row.date}. Expected: €${Number(row.expected_cash).toFixed(2)}, Counted: €${Number(row.actual_cash).toFixed(2)}.`,
      evidence: { reportId: row.id, location: row.city, date: row.date, expected: row.expected_cash, actual: row.actual_cash, variance: row.variance },
      recommendation: variance < 0
        ? "Investigate missing funds. Review CCTV. Audit cash handling procedures."
        : "Investigate source of excess cash. May indicate unrecorded transactions.",
    });
  }

  // 2. Locations with recurring cash shortages (3+ days)
  const recurringShortages = await db.execute(sql`
    SELECT cr.location_id, l.city, COUNT(*) as shortage_count,
           SUM(CAST(cr.variance AS NUMERIC)) as total_loss
    FROM cash_reconciliations cr
    JOIN locations l ON cr.location_id = l.id
    WHERE CAST(cr.variance AS NUMERIC) < -20
    GROUP BY cr.location_id, l.city
    HAVING COUNT(*) >= 3
  `);

  for (const row of recurringShortages) {
    findings.push({
      type: "recurring_cash_shortage",
      severity: "critical",
      category: "Financial",
      entityId: String(row.location_id),
      description: `${row.city} store has ${row.shortage_count} days with significant cash shortages, totaling €${Math.abs(Number(row.total_loss)).toFixed(2)} lost. Pattern suggests systematic issue.`,
      evidence: { locationId: row.location_id, city: row.city, shortageCount: row.shortage_count, totalLoss: row.total_loss },
      recommendation: "Conduct targeted investigation. Consider personnel changes, enhanced cash controls, or forensic audit.",
    });
  }

  // 3. Overdue invoices
  const overdueInvoices = await db.execute(sql`
    SELECT i.id, i.invoice_number, i.total_amount, i.due_date, i.status,
           v.name as vendor_name
    FROM invoices i
    LEFT JOIN vendors v ON i.vendor_id = v.id
    WHERE i.status = 'overdue'
    ORDER BY CAST(i.total_amount AS NUMERIC) DESC
  `);

  for (const row of overdueInvoices) {
    findings.push({
      type: "overdue_invoice",
      severity: Number(row.total_amount) > 10000 ? "high" : "medium",
      category: "Financial",
      entityId: String(row.id),
      description: `Invoice ${row.invoice_number} for €${Number(row.total_amount).toFixed(2)} from ${row.vendor_name || "unknown"} is overdue since ${row.due_date}.`,
      evidence: { invoiceId: row.id, invoiceNumber: row.invoice_number, amount: row.total_amount, dueDate: row.due_date, vendor: row.vendor_name },
      recommendation: "Process payment immediately to avoid late fees and vendor relationship damage.",
    });
  }

  // 4. Invoices with errors
  const errorInvoices = await db.execute(sql`
    SELECT i.id, i.invoice_number, i.total_amount, i.error_type,
           v.name as vendor_name
    FROM invoices i
    LEFT JOIN vendors v ON i.vendor_id = v.id
    WHERE i.has_error = true
  `);

  for (const row of errorInvoices) {
    findings.push({
      type: String(row.error_type),
      severity: row.error_type === "duplicate_invoice" ? "high" : "medium",
      category: "Financial",
      entityId: String(row.id),
      description: `Invoice ${row.invoice_number} (€${Number(row.total_amount).toFixed(2)}) from ${row.vendor_name || "unknown"} flagged: ${String(row.error_type).replace(/_/g, " ")}.`,
      evidence: { invoiceId: row.id, invoiceNumber: row.invoice_number, amount: row.total_amount, errorType: row.error_type },
      recommendation: "Investigate and resolve invoice discrepancy. Verify with vendor.",
    });
  }

  // 5. Sales transaction errors
  const salesErrors = await db.execute(sql`
    SELECT st.id, st.transaction_number, st.total, st.date, st.error_type,
           l.city
    FROM sales_transactions st
    JOIN locations l ON st.location_id = l.id
    WHERE st.has_error = true
  `);

  for (const row of salesErrors) {
    findings.push({
      type: String(row.error_type),
      severity: "medium",
      category: "Financial",
      entityId: String(row.id),
      description: `Sales transaction ${row.transaction_number} (€${Number(row.total).toFixed(2)}) at ${row.city} on ${row.date}: ${String(row.error_type).replace(/_/g, " ")}.`,
      evidence: { transactionId: row.id, transactionNumber: row.transaction_number, amount: row.total, date: row.date, location: row.city },
      recommendation: "Review transaction. Verify authorization and documentation.",
    });
  }

  // 6. Expense report anomalies
  const expenseErrors = await db.execute(sql`
    SELECT er.id, er.total_amount, er.error_type, er.submitted_date,
           e.first_name, e.last_name
    FROM expense_reports er
    JOIN employees e ON er.employee_id = e.id
    WHERE er.has_error = true
  `);

  for (const row of expenseErrors) {
    findings.push({
      type: String(row.error_type),
      severity: row.error_type === "self_approved" ? "high" : "medium",
      category: "Financial",
      entityId: String(row.id),
      description: `Expense report by ${row.first_name} ${row.last_name} (€${Number(row.total_amount).toFixed(2)}, submitted ${row.submitted_date}): ${String(row.error_type).replace(/_/g, " ")}.`,
      evidence: { reportId: row.id, employee: `${row.first_name} ${row.last_name}`, amount: row.total_amount, errorType: row.error_type },
      recommendation: "Review expense report. Verify receipts and approval chain.",
    });
  }

  // 7. High-value sales with large discounts (>15%)
  const suspiciousDiscounts = await db.execute(sql`
    SELECT st.id, st.transaction_number, st.subtotal, st.discount, st.total, st.date,
           l.city, e.first_name, e.last_name,
           ROUND(CAST(st.discount AS NUMERIC) / NULLIF(CAST(st.subtotal AS NUMERIC), 0) * 100, 1) as discount_pct
    FROM sales_transactions st
    JOIN locations l ON st.location_id = l.id
    JOIN employees e ON st.employee_id = e.id
    WHERE CAST(st.discount AS NUMERIC) > 0
      AND CAST(st.subtotal AS NUMERIC) > 200
      AND (CAST(st.discount AS NUMERIC) / NULLIF(CAST(st.subtotal AS NUMERIC), 0)) > 0.15
    ORDER BY CAST(st.discount AS NUMERIC) DESC
    LIMIT 50
  `);

  for (const row of suspiciousDiscounts) {
    findings.push({
      type: "excessive_discount",
      severity: "medium",
      category: "Financial",
      entityId: String(row.id),
      description: `${row.discount_pct}% discount (€${Number(row.discount).toFixed(2)}) on €${Number(row.subtotal).toFixed(2)} sale by ${row.first_name} ${row.last_name} at ${row.city} on ${row.date}.`,
      evidence: { transactionId: row.id, subtotal: row.subtotal, discount: row.discount, discountPct: row.discount_pct, employee: `${row.first_name} ${row.last_name}` },
      recommendation: "Verify discount authorization. Review discount policy compliance.",
    });
  }

  return findings;
}
