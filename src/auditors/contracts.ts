import { db, schema } from "../../db/index.js";
import { eq, lt, and, isNull, sql } from "drizzle-orm";
import type { AuditFinding } from "../../types.js";

export async function auditContracts(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const auditEnd = "2025-12-31";

  // 1. Active employees without employment contracts
  const empsWithoutContracts = await db.execute(sql`
    SELECT e.id, e.first_name, e.last_name, e.job_title, e.department, e.hire_date
    FROM employees e
    WHERE e.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.party_id = e.id AND c.type = 'employee'
      )
  `);

  for (const emp of empsWithoutContracts) {
    findings.push({
      type: "missing_contract",
      severity: "high",
      category: "Contracts",
      entityId: String(emp.id),
      description: `Active employee ${emp.first_name} ${emp.last_name} (${emp.job_title}, ${emp.department}) has no employment contract on file.`,
      evidence: { employeeId: emp.id, jobTitle: emp.job_title, department: emp.department, hireDate: emp.hire_date },
      recommendation: "Immediately draft and execute an employment contract. Review HR onboarding process.",
    });
  }

  // 2. Expired contracts for active employees
  const expiredEmpContracts = await db.execute(sql`
    SELECT c.id as contract_id, c.contract_number, c.end_date, c.value,
           e.id as emp_id, e.first_name, e.last_name, e.job_title
    FROM contracts c
    JOIN employees e ON c.party_id = e.id
    WHERE c.type = 'employee'
      AND c.end_date < ${auditEnd}
      AND e.is_active = true
  `);

  for (const row of expiredEmpContracts) {
    findings.push({
      type: "expired_employment_contract",
      severity: "high",
      category: "Contracts",
      entityId: String(row.contract_id),
      description: `Employment contract ${row.contract_number} for ${row.first_name} ${row.last_name} (${row.job_title}) expired on ${row.end_date} but employee is still active.`,
      evidence: { contractId: row.contract_id, contractNumber: row.contract_number, employeeId: row.emp_id, endDate: row.end_date },
      recommendation: "Renew contract immediately. Verify employment terms and salary alignment.",
    });
  }

  // 3. Expired vendor contracts
  const expiredVendorContracts = await db.execute(sql`
    SELECT c.id, c.contract_number, c.party_name, c.end_date, c.value
    FROM contracts c
    WHERE c.type = 'vendor'
      AND c.end_date < ${auditEnd}
      AND c.status != 'terminated'
  `);

  for (const row of expiredVendorContracts) {
    findings.push({
      type: "expired_vendor_contract",
      severity: "medium",
      category: "Contracts",
      entityId: String(row.id),
      description: `Vendor contract ${row.contract_number} with "${row.party_name}" expired on ${row.end_date} without renewal.`,
      evidence: { contractId: row.id, contractNumber: row.contract_number, partyName: row.party_name, endDate: row.end_date, value: row.value },
      recommendation: "Review vendor relationship. Renegotiate or formally terminate.",
    });
  }

  // 4. Expired leases
  const expiredLeases = await db.execute(sql`
    SELECT c.id, c.contract_number, c.party_name, c.end_date, c.value,
           l.city
    FROM contracts c
    LEFT JOIN locations l ON c.party_id = l.id
    WHERE c.type = 'lease'
      AND c.end_date < ${auditEnd}
  `);

  for (const row of expiredLeases) {
    findings.push({
      type: "expired_lease",
      severity: "high",
      category: "Contracts",
      entityId: String(row.id),
      description: `Store lease ${row.contract_number} for ${row.city || "unknown"} expired on ${row.end_date}. Operating without valid lease.`,
      evidence: { contractId: row.id, location: row.city, endDate: row.end_date, value: row.value },
      recommendation: "Urgent: renegotiate lease immediately. Eviction risk.",
    });
  }

  // 5. Contract value vs salary mismatch
  const salaryMismatches = await db.execute(sql`
    SELECT c.id as contract_id, c.contract_number, c.value as contract_value,
           e.id as emp_id, e.first_name, e.last_name, e.annual_salary
    FROM contracts c
    JOIN employees e ON c.party_id = e.id
    WHERE c.type = 'employee'
      AND ABS(CAST(c.value AS NUMERIC) - CAST(e.annual_salary AS NUMERIC)) > 1000
  `);

  for (const row of salaryMismatches) {
    const diff = Math.abs(Number(row.contract_value) - Number(row.annual_salary));
    findings.push({
      type: "contract_salary_mismatch",
      severity: "medium",
      category: "Contracts",
      entityId: String(row.contract_id),
      description: `Contract value (€${Number(row.contract_value).toLocaleString()}) differs from salary (€${Number(row.annual_salary).toLocaleString()}) for ${row.first_name} ${row.last_name} by €${diff.toLocaleString()}.`,
      evidence: { contractId: row.contract_id, contractValue: row.contract_value, salary: row.annual_salary, difference: diff },
      recommendation: "Reconcile contract terms with payroll records.",
    });
  }

  return findings;
}
