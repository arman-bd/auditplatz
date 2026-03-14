import {
  genId,
  monthsBetween,
  round2,
  shouldInjectError,
  pickErrorType,
  randomFloat,
  randomInt,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Employee, PayrollRecord } from "../types.js";

const PAYROLL_ERROR_TYPES = [
  "overpayment",           // Employee paid more than they should be
  "underpayment",          // Employee paid less
  "duplicate_payment",     // Same employee paid twice in one period
  "ghost_employee_paid",   // Terminated employee still receiving pay
  "overtime_miscalculation", // Overtime rate calculated incorrectly
  "wrong_tax_bracket",     // Tax withholding calculated wrong
  "bonus_not_approved",    // Bonus paid without proper approval
  "wrong_bank_account",    // Payment sent to wrong IBAN
];

export function generatePayroll(employees: Employee[]): PayrollRecord[] {
  const records: PayrollRecord[] = [];
  const months = monthsBetween(DATA_START_DATE, DATA_END_DATE);

  for (const employee of employees) {
    const empStartDate = new Date(employee.hireDate);
    const empEndDate = employee.terminationDate
      ? new Date(employee.terminationDate)
      : new Date(DATA_END_DATE);

    for (const month of months) {
      const monthStart = new Date(month.start);
      const monthEnd = new Date(month.end);

      // Skip months before hire or after termination
      if (monthStart < empStartDate || monthStart > empEndDate) continue;

      const monthlyBase = round2(employee.annualSalary / 12);
      const overtimeHours = employee.employmentType === "full_time"
        ? (Math.random() < 0.3 ? randomFloat(1, 20) : 0)
        : 0;
      const hourlyRate = round2(employee.annualSalary / 2080); // ~40hrs/week * 52 weeks
      const overtimePay = round2(overtimeHours * hourlyRate * 1.5);

      // Occasional bonus (~5% chance per month)
      const bonus = Math.random() < 0.05 ? round2(monthlyBase * randomFloat(0.05, 0.25)) : 0;

      // German tax/deduction rates (simplified)
      const grossPay = round2(monthlyBase + overtimePay + bonus);
      const taxRate = grossPay > 5000 ? 0.30 : grossPay > 3500 ? 0.25 : 0.20;
      const taxWithheld = round2(grossPay * taxRate);
      const socialSecurity = round2(grossPay * 0.093); // ~9.3% employee share
      const healthInsurance = round2(grossPay * 0.073); // ~7.3% employee share
      const deductions = round2(taxWithheld + socialSecurity + healthInsurance);
      const netPay = round2(grossPay - deductions);

      // ─── Error Injection ───
      let hasError = false;
      let errorType: string | null = null;
      let finalNetPay = netPay;
      let finalGrossPay = grossPay;
      let finalOvertimePay = overtimePay;
      let finalOvertimeHours = overtimeHours;
      let finalTaxWithheld = taxWithheld;
      let finalBonus = bonus;

      if (shouldInjectError()) {
        hasError = true;
        errorType = pickErrorType(PAYROLL_ERROR_TYPES);

        switch (errorType) {
          case "overpayment":
            finalGrossPay = round2(grossPay * randomFloat(1.05, 1.35));
            finalNetPay = round2(finalGrossPay - deductions);
            break;
          case "underpayment":
            finalGrossPay = round2(grossPay * randomFloat(0.70, 0.92));
            finalNetPay = round2(finalGrossPay - deductions);
            break;
          case "overtime_miscalculation":
            // Overtime paid at regular rate instead of 1.5x, or at 2x
            finalOvertimePay = round2(overtimeHours * hourlyRate * (Math.random() > 0.5 ? 1.0 : 2.0));
            finalGrossPay = round2(monthlyBase + finalOvertimePay + bonus);
            finalNetPay = round2(finalGrossPay - deductions);
            break;
          case "wrong_tax_bracket":
            finalTaxWithheld = round2(grossPay * (taxRate + randomFloat(-0.08, 0.08)));
            finalNetPay = round2(grossPay - finalTaxWithheld - socialSecurity - healthInsurance);
            break;
          case "bonus_not_approved":
            finalBonus = round2(monthlyBase * randomFloat(0.10, 0.30));
            finalGrossPay = round2(monthlyBase + overtimePay + finalBonus);
            finalNetPay = round2(finalGrossPay - deductions);
            break;
          case "ghost_employee_paid":
            // This is handled at the employee level — ghost employees
            // still get payroll records generated after termination
            break;
          case "duplicate_payment":
          case "wrong_bank_account":
            // These don't change amounts, just flagged as errors
            break;
        }
      }

      // Ghost employee check: if employee is terminated but we're past termination date
      if (
        employee.terminationDate &&
        monthStart > new Date(employee.terminationDate) &&
        !hasError
      ) {
        // This shouldn't happen normally — it's caught above.
        // But ghost employees bypass the filter on purpose.
        continue;
      }

      const payDate = new Date(monthEnd);
      payDate.setDate(Math.min(payDate.getDate() + 5, 28)); // Pay ~5 days after month end

      records.push({
        id: genId(),
        employeeId: employee.id,
        periodStart: month.start,
        periodEnd: month.end,
        payDate: payDate.toISOString().split("T")[0],
        basePay: monthlyBase,
        overtimeHours: finalOvertimeHours,
        overtimePay: finalOvertimePay,
        bonus: finalBonus,
        deductions: round2(finalTaxWithheld + socialSecurity + healthInsurance),
        taxWithheld: finalTaxWithheld,
        socialSecurity,
        healthInsurance,
        grossPay: finalGrossPay,
        netPay: finalNetPay,
        hasError,
        errorType,
      });
    }

    // ─── Duplicate payment injection ───
    // For some employees, duplicate an existing record
    if (shouldInjectError(0.003)) {
      const empRecords = records.filter((r) => r.employeeId === employee.id);
      if (empRecords.length > 0) {
        const original = empRecords[randomInt(0, empRecords.length - 1)];
        records.push({
          ...original,
          id: genId(),
          hasError: true,
          errorType: "duplicate_payment",
        });
      }
    }
  }

  return records;
}
