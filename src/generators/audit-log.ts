import { faker } from "@faker-js/faker/locale/de";
import {
  genId,
  pick,
  randomInt,
  monthsBetween,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Employee, AuditLog } from "../types.js";

const ACTIONS = [
  "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT",
  "LOGIN", "LOGOUT", "EXPORT", "IMPORT", "OVERRIDE",
];

const ENTITY_TYPES = [
  "employee", "payroll", "sales_transaction", "invoice",
  "expense_report", "purchase_order", "contract", "inventory",
  "cash_reconciliation", "product",
];

export function generateAuditLogs(employees: Employee[]): AuditLog[] {
  const logs: AuditLog[] = [];
  const months = monthsBetween(DATA_START_DATE, DATA_END_DATE);
  const activeEmployees = employees.filter((e) => e.isActive);

  for (const month of months) {
    // ~50-150 audit events per month
    const eventCount = randomInt(50, 150);

    for (let i = 0; i < eventCount; i++) {
      const employee = pick(activeEmployees);
      const timestamp = faker.date
        .between({ from: month.start, to: month.end })
        .toISOString();

      logs.push({
        id: genId(),
        timestamp,
        userId: employee.id,
        action: pick(ACTIONS),
        entityType: pick(ENTITY_TYPES),
        entityId: genId(),
        oldValue: Math.random() > 0.5 ? JSON.stringify({ value: faker.number.int({ min: 1, max: 10000 }) }) : null,
        newValue: JSON.stringify({ value: faker.number.int({ min: 1, max: 10000 }) }),
        ipAddress: faker.internet.ipv4(),
      });
    }
  }

  return logs;
}
