import {
  genId,
  dateRange,
  formatDate,
  isWeekend,
  shouldInjectError,
  pickErrorType,
  randomFloat,
  randomInt,
  round2,
  pick,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Employee, Location, SalesTransaction, CashReconciliation } from "../types.js";

const CASH_ERROR_TYPES = [
  "missing_cash",             // Cash short — potential theft
  "excess_cash",              // More cash than expected — possible unreported sale
  "register_not_reconciled",  // End of day reconciliation skipped
  "large_variance",           // Significant unexplained difference
  "counterfeit_suspected",    // Cash total off due to fake bills
];

export function generateCashReconciliations(
  locations: Location[],
  employees: Employee[],
  salesTransactions: SalesTransaction[]
): CashReconciliation[] {
  const records: CashReconciliation[] = [];
  const stores = locations.filter((l) => l.type === "retail_store");
  const allDates = dateRange(DATA_START_DATE, DATA_END_DATE);

  // Pre-compute cash sales by location and date
  const cashByLocationDate = new Map<string, number>();
  for (const txn of salesTransactions) {
    if (txn.paymentMethod === "cash") {
      const key = `${txn.locationId}|${txn.date}`;
      cashByLocationDate.set(key, (cashByLocationDate.get(key) || 0) + txn.total);
    }
  }

  for (const store of stores) {
    const storeEmployees = employees.filter(
      (e) => e.locationId === store.id && e.isActive
    );
    if (storeEmployees.length === 0) continue;

    const storeOpenDate = new Date(store.openDate);
    const registersCount = randomInt(2, 3);

    for (const date of allDates) {
      if (date < storeOpenDate) continue;

      for (let reg = 1; reg <= registersCount; reg++) {
        const key = `${store.id}|${formatDate(date)}`;
        const totalCashSales = cashByLocationDate.get(key) || 0;
        // Split roughly across registers
        const expectedCash = round2(totalCashSales / registersCount + randomFloat(-5, 5));

        let actualCash = round2(expectedCash + randomFloat(-2, 2)); // Normal small variance
        let hasError = false;
        let errorType: string | null = null;
        let notes: string | null = null;

        if (shouldInjectError()) {
          hasError = true;
          errorType = pickErrorType(CASH_ERROR_TYPES);

          switch (errorType) {
            case "missing_cash":
              actualCash = round2(expectedCash - randomFloat(20, 200));
              notes = "Cash shortage detected at end of day count";
              break;
            case "excess_cash":
              actualCash = round2(expectedCash + randomFloat(15, 150));
              notes = "Excess cash found — no matching transaction";
              break;
            case "large_variance":
              actualCash = round2(expectedCash * randomFloat(0.7, 0.85));
              notes = "Significant unexplained variance";
              break;
            case "register_not_reconciled":
              actualCash = 0;
              notes = "Register not reconciled — closing procedure not followed";
              break;
            case "counterfeit_suspected":
              actualCash = round2(expectedCash - randomFloat(50, 100));
              notes = "Suspected counterfeit bills removed from count";
              break;
          }
        }

        const variance = round2(actualCash - expectedCash);

        records.push({
          id: genId(),
          locationId: store.id,
          date: formatDate(date),
          registerNumber: reg,
          expectedCash,
          actualCash,
          variance,
          reconciledBy: pick(storeEmployees).id,
          notes,
          hasError,
          errorType,
        });
      }
    }
  }

  return records;
}
