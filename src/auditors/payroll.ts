import { db } from "../../db/index.js";
import { sql } from "drizzle-orm";
import type { AuditFinding } from "../../types.js";

export async function auditPayroll(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // 1. Ghost employee payments (paid after termination)
  const ghostPayments = await db.execute(sql`
    SELECT p.id as payroll_id, p.period_start, p.net_pay, p.base_pay,
           e.id as emp_id, e.first_name, e.last_name, e.termination_date, e.job_title
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    WHERE e.termination_date IS NOT NULL
      AND p.period_start > e.termination_date
  `);

  for (const row of ghostPayments) {
    findings.push({
      type: "ghost_employee_payment",
      severity: "critical",
      category: "Payroll",
      entityId: String(row.payroll_id),
      description: `Payment of €${Number(row.net_pay).toFixed(2)} to terminated employee ${row.first_name} ${row.last_name} for period ${row.period_start}. Terminated on ${row.termination_date}.`,
      evidence: { payrollId: row.payroll_id, employeeId: row.emp_id, period: row.period_start, terminationDate: row.termination_date, netPay: row.net_pay },
      recommendation: "Investigate unauthorized payment. Initiate recovery. Review payroll termination procedures.",
    });
  }

  // 2. Overpayment — base pay exceeds monthly salary (annual/12)
  const overpayments = await db.execute(sql`
    SELECT p.id as payroll_id, p.period_start, p.base_pay,
           e.id as emp_id, e.first_name, e.last_name, e.annual_salary,
           CAST(p.base_pay AS NUMERIC) - (CAST(e.annual_salary AS NUMERIC) / 12) as excess
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    WHERE CAST(p.base_pay AS NUMERIC) > (CAST(e.annual_salary AS NUMERIC) / 12) + 100
  `);

  for (const row of overpayments) {
    const monthly = (Number(row.annual_salary) / 12).toFixed(2);
    findings.push({
      type: "payroll_overpayment",
      severity: "high",
      category: "Payroll",
      entityId: String(row.payroll_id),
      description: `Overpayment of €${Number(row.excess).toFixed(2)} to ${row.first_name} ${row.last_name} in ${row.period_start}. Paid €${Number(row.base_pay).toFixed(2)} vs expected €${monthly}/month.`,
      evidence: { payrollId: row.payroll_id, employeeId: row.emp_id, basePay: row.base_pay, expectedMonthly: monthly, excess: row.excess },
      recommendation: "Verify if salary adjustment was authorized. If not, recover overpayment.",
    });
  }

  // 3. Underpayment
  const underpayments = await db.execute(sql`
    SELECT p.id as payroll_id, p.period_start, p.base_pay,
           e.id as emp_id, e.first_name, e.last_name, e.annual_salary,
           (CAST(e.annual_salary AS NUMERIC) / 12) - CAST(p.base_pay AS NUMERIC) as deficit
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    WHERE e.is_active = true
      AND CAST(p.base_pay AS NUMERIC) < (CAST(e.annual_salary AS NUMERIC) / 12) - 100
  `);

  for (const row of underpayments) {
    findings.push({
      type: "payroll_underpayment",
      severity: "medium",
      category: "Payroll",
      entityId: String(row.payroll_id),
      description: `Underpayment of €${Number(row.deficit).toFixed(2)} to ${row.first_name} ${row.last_name} in ${row.period_start}. Paid €${Number(row.base_pay).toFixed(2)} vs expected €${(Number(row.annual_salary) / 12).toFixed(2)}/month.`,
      evidence: { payrollId: row.payroll_id, employeeId: row.emp_id, basePay: row.base_pay, deficit: row.deficit },
      recommendation: "Issue back-pay immediately. Review payroll calculation.",
    });
  }

  // 4. Excessive overtime (>48h/month)
  const excessiveOT = await db.execute(sql`
    SELECT p.id as payroll_id, p.period_start, p.overtime_hours, p.overtime_pay,
           e.id as emp_id, e.first_name, e.last_name
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    WHERE CAST(p.overtime_hours AS NUMERIC) > 48
  `);

  for (const row of excessiveOT) {
    findings.push({
      type: "excessive_overtime",
      severity: "high",
      category: "Payroll",
      entityId: String(row.payroll_id),
      description: `Excessive overtime of ${row.overtime_hours}h for ${row.first_name} ${row.last_name} in ${row.period_start}. Exceeds German labor law (ArbZG) limits.`,
      evidence: { payrollId: row.payroll_id, employeeId: row.emp_id, overtimeHours: row.overtime_hours, overtimePay: row.overtime_pay },
      recommendation: "Investigate workload. Ensure ArbZG compliance. Consider additional headcount.",
    });
  }

  // 5. Overtime rate mismatches
  const otMismatches = await db.execute(sql`
    SELECT p.id as payroll_id, p.period_start, p.overtime_hours, p.overtime_pay,
           e.id as emp_id, e.first_name, e.last_name, e.annual_salary,
           (CAST(p.overtime_hours AS NUMERIC) * (CAST(e.annual_salary AS NUMERIC) / 12 / 160) * 1.5) as expected_ot_pay
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    WHERE CAST(p.overtime_hours AS NUMERIC) > 0
      AND ABS(
        CAST(p.overtime_pay AS NUMERIC) -
        (CAST(p.overtime_hours AS NUMERIC) * (CAST(e.annual_salary AS NUMERIC) / 12 / 160) * 1.5)
      ) > 50
  `);

  for (const row of otMismatches) {
    findings.push({
      type: "overtime_rate_mismatch",
      severity: "medium",
      category: "Payroll",
      entityId: String(row.payroll_id),
      description: `Overtime pay mismatch for ${row.first_name} ${row.last_name} in ${row.period_start}: ${row.overtime_hours}h should be €${Number(row.expected_ot_pay).toFixed(2)} but paid €${Number(row.overtime_pay).toFixed(2)}.`,
      evidence: { payrollId: row.payroll_id, overtimeHours: row.overtime_hours, expectedPay: row.expected_ot_pay, actualPay: row.overtime_pay },
      recommendation: "Correct overtime calculation. Verify time tracking accuracy.",
    });
  }

  // 6. Duplicate payroll (same employee, same period)
  const duplicates = await db.execute(sql`
    SELECT p.employee_id, p.period_start, COUNT(*) as cnt,
           SUM(CAST(p.net_pay AS NUMERIC)) as total_paid,
           e.first_name, e.last_name
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    GROUP BY p.employee_id, p.period_start, e.first_name, e.last_name
    HAVING COUNT(*) > 1
  `);

  for (const row of duplicates) {
    findings.push({
      type: "duplicate_payroll",
      severity: "critical",
      category: "Payroll",
      entityId: String(row.employee_id),
      description: `Duplicate payroll: ${row.cnt} entries for ${row.first_name} ${row.last_name} in ${row.period_start}, totaling €${Number(row.total_paid).toFixed(2)}.`,
      evidence: { employeeId: row.employee_id, period: row.period_start, count: row.cnt, totalPaid: row.total_paid },
      recommendation: "Remove duplicates. Recover overpayment. Audit payroll submission controls.",
    });
  }

  return findings;
}
