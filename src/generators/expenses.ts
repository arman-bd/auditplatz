import { faker } from "@faker-js/faker/locale/de";
import {
  genId,
  shouldInjectError,
  pickErrorType,
  randomInt,
  randomFloat,
  round2,
  addDays,
  pick,
  monthsBetween,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Employee, ExpenseReport, ExpenseItem } from "../types.js";

const EXPENSE_ERROR_TYPES = [
  "duplicate_expense",         // Same expense submitted twice
  "inflated_amount",           // Amount significantly higher than receipt
  "missing_receipt",           // No receipt attached for large expense
  "personal_expense",          // Personal expense submitted as business
  "exceeded_policy_limit",     // Expense exceeds company policy limit
  "self_approved",             // Employee approved their own expense
  "backdated_expense",         // Expense dated far in the past
];

const EXPENSE_CATEGORIES = [
  { category: "Travel", minAmount: 50, maxAmount: 1500 },
  { category: "Meals & Entertainment", minAmount: 15, maxAmount: 200 },
  { category: "Office Supplies", minAmount: 10, maxAmount: 300 },
  { category: "Transportation", minAmount: 20, maxAmount: 500 },
  { category: "Accommodation", minAmount: 80, maxAmount: 250 },
  { category: "Training & Conferences", minAmount: 100, maxAmount: 2000 },
  { category: "Client Gifts", minAmount: 20, maxAmount: 150 },
  { category: "Equipment", minAmount: 50, maxAmount: 1000 },
  { category: "Telecommunications", minAmount: 15, maxAmount: 100 },
  { category: "Parking & Tolls", minAmount: 5, maxAmount: 50 },
];

export function generateExpenses(employees: Employee[]): ExpenseReport[] {
  const reports: ExpenseReport[] = [];
  const months = monthsBetween(DATA_START_DATE, DATA_END_DATE);

  // Only HQ and management employees typically file expenses
  const expenseEligible = employees.filter(
    (e) =>
      e.isActive &&
      (e.department !== "Retail" ||
        e.jobTitle === "Store Manager" ||
        e.jobTitle === "Assistant Manager")
  );

  for (const employee of expenseEligible) {
    const empStart = new Date(employee.hireDate);

    for (const month of months) {
      if (new Date(month.start) < empStart) continue;
      // ~30% chance of submitting an expense report each month
      if (Math.random() > 0.3) continue;

      const itemCount = randomInt(1, 6);
      const items: ExpenseItem[] = [];

      for (let i = 0; i < itemCount; i++) {
        const cat = pick(EXPENSE_CATEGORIES);
        const amount = round2(randomFloat(cat.minAmount, cat.maxAmount));

        items.push({
          category: cat.category,
          description: faker.commerce.productDescription().slice(0, 100),
          date: faker.date
            .between({ from: month.start, to: month.end })
            .toISOString()
            .split("T")[0],
          amount,
          receiptAttached: Math.random() > 0.05,
        });
      }

      const totalAmount = round2(items.reduce((s, i) => s + i.amount, 0));
      const submittedDate = addDays(month.end, randomInt(1, 10));

      let approvedDate: string | null = addDays(submittedDate, randomInt(1, 14));
      let approvedBy: string | null = employee.managerId;
      let status: ExpenseReport["status"] = "approved";

      if (Math.random() < 0.1) {
        status = "rejected";
        approvedDate = addDays(submittedDate, randomInt(1, 7));
      } else if (Math.random() < 0.15) {
        status = "submitted";
        approvedDate = null;
        approvedBy = null;
      } else if (Math.random() < 0.7) {
        status = "paid";
      }

      let hasError = false;
      let errorType: string | null = null;

      if (shouldInjectError()) {
        hasError = true;
        errorType = pickErrorType(EXPENSE_ERROR_TYPES);

        switch (errorType) {
          case "inflated_amount":
            items[0].amount = round2(items[0].amount * randomFloat(2, 5));
            break;
          case "missing_receipt":
            items.forEach((item) => {
              if (item.amount > 50) item.receiptAttached = false;
            });
            break;
          case "personal_expense":
            items.push({
              category: "Personal",
              description: pick([
                "Personal gym membership",
                "Family dinner",
                "Personal electronics",
                "Vacation flight upgrade",
              ]),
              date: faker.date
                .between({ from: month.start, to: month.end })
                .toISOString()
                .split("T")[0],
              amount: round2(randomFloat(50, 500)),
              receiptAttached: false,
            });
            break;
          case "self_approved":
            approvedBy = employee.id;
            status = "approved";
            approvedDate = submittedDate;
            break;
          case "exceeded_policy_limit":
            items[0].amount = round2(randomFloat(3000, 10000));
            break;
          case "duplicate_expense":
          case "backdated_expense":
            break;
        }
      }

      const finalTotal = round2(items.reduce((s, i) => s + i.amount, 0));

      reports.push({
        id: genId(),
        employeeId: employee.id,
        submittedDate,
        approvedDate,
        approvedBy,
        status,
        items,
        totalAmount: finalTotal,
        hasError,
        errorType,
      });

      // Duplicate expense injection
      if (hasError && errorType === "duplicate_expense") {
        reports.push({
          ...reports[reports.length - 1],
          id: genId(),
        });
      }
    }
  }

  return reports;
}
