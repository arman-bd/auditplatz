import { faker } from "@faker-js/faker/locale/de";
import { v4 as uuid } from "uuid";
import { db, schema, closeDB } from "../db/index.js";
import { sql } from "drizzle-orm";

const ANOMALY_RATE = 0.015;
const AUDIT_YEAR = 2025;

interface AnomalyRecord {
  table: string;
  id: string;
  errorType: string;
  description: string;
}

const injectedAnomalies: AnomalyRecord[] = [];

function shouldInject(): boolean {
  return Math.random() < ANOMALY_RATE;
}

// ── Locations ──

const CITIES: Array<{ city: string; state: string; postal: string }> = [
  { city: "München", state: "Bayern", postal: "80538" },
  { city: "Berlin", state: "Berlin", postal: "10117" },
  { city: "Hamburg", state: "Hamburg", postal: "20095" },
  { city: "Frankfurt am Main", state: "Hessen", postal: "60311" },
  { city: "Köln", state: "Nordrhein-Westfalen", postal: "50667" },
  { city: "Stuttgart", state: "Baden-Württemberg", postal: "70173" },
  { city: "Düsseldorf", state: "Nordrhein-Westfalen", postal: "40213" },
  { city: "Leipzig", state: "Sachsen", postal: "04109" },
  { city: "Dresden", state: "Sachsen", postal: "01067" },
  { city: "Nürnberg", state: "Bayern", postal: "90402" },
];

async function seedLocations() {
  const rows: (typeof schema.locations.$inferInsert)[] = [];

  // HQ
  rows.push({
    id: uuid(),
    code: "HQ-MUC",
    type: "headquarters",
    name: "M&H Wearables Hauptsitz",
    city: "München",
    address: "Maximilianstraße 45",
    postalCode: "80538",
    state: "Bayern",
    openDate: "2015-03-01",
    isActive: true,
  });

  // Retail stores
  for (const c of CITIES) {
    rows.push({
      id: uuid(),
      code: `RS-${c.city.slice(0, 3).toUpperCase()}`,
      type: "retail_store",
      name: `M&H Wearables ${c.city}`,
      city: c.city,
      address: `${faker.location.street()} ${faker.number.int({ min: 1, max: 200 })}`,
      postalCode: c.postal,
      state: c.state,
      openDate: faker.date.between({ from: "2016-01-01", to: "2022-12-31" }).toISOString().split("T")[0],
      isActive: true,
    });
  }

  await db.insert(schema.locations).values(rows);
  console.log(`  ✓ ${rows.length} locations`);
  return rows;
}

// ── Products ──

const PRODUCT_CATEGORIES = ["Smartwatches", "Fitness Bands", "Smart Glasses", "Earbuds", "Accessories", "Clothing"];

async function seedProducts() {
  const rows: (typeof schema.products.$inferInsert)[] = [];

  for (const cat of PRODUCT_CATEGORIES) {
    const count = faker.number.int({ min: 5, max: 12 });
    for (let i = 0; i < count; i++) {
      const cost = faker.number.float({ min: 10, max: 200, fractionDigits: 2 });
      rows.push({
        id: uuid(),
        sku: `${cat.slice(0, 2).toUpperCase()}-${faker.string.alphanumeric(6).toUpperCase()}`,
        name: `${faker.commerce.productAdjective()} ${cat.slice(0, -1)} ${faker.string.alpha(2).toUpperCase()}`,
        category: cat,
        unitPrice: String(Math.round(cost * faker.number.float({ min: 1.5, max: 3.5 }) * 100) / 100),
        costPrice: String(cost),
        isActive: true,
      });
    }
  }

  await db.insert(schema.products).values(rows);
  console.log(`  ✓ ${rows.length} products`);
  return rows;
}

// ── Vendors ──

async function seedVendors() {
  const categories = ["Fabric Supplier", "Electronics", "Packaging", "Logistics", "IT Services", "Cleaning", "Security", "Marketing"];
  const rows: (typeof schema.vendors.$inferInsert)[] = [];

  for (const cat of categories) {
    for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++) {
      rows.push({
        id: uuid(),
        name: faker.company.name(),
        country: "Germany",
        category: cat,
        contactEmail: faker.internet.email(),
        contactPhone: faker.phone.number(),
        taxId: `DE${faker.number.int({ min: 100000000, max: 999999999 })}`,
        isActive: true,
      });
    }
  }

  await db.insert(schema.vendors).values(rows);
  console.log(`  ✓ ${rows.length} vendors`);
  return rows;
}

// ── Employees ──

const HQ_DEPARTMENTS = ["Executive", "Finance", "HR", "IT", "Marketing", "Product Design", "Supply Chain", "Legal", "Customer Service", "Quality Assurance"];
const STORE_POSITIONS = ["Store Manager", "Assistant Manager", "Sales Associate", "Cashier", "Visual Merchandiser", "Stock Associate"];

function getSalary(dept: string, title: string): number {
  const base: Record<string, number> = {
    Executive: 140000, Finance: 68000, HR: 58000, IT: 72000,
    Marketing: 62000, "Product Design": 65000, "Supply Chain": 58000,
    Legal: 75000, "Customer Service": 45000, "Quality Assurance": 55000, Retail: 35000,
  };
  let b = base[dept] || 50000;
  if (title.includes("CEO") || title.includes("CFO") || title.includes("CTO")) b *= 1.8;
  else if (title.includes("Director") || title.includes("Head")) b *= 1.4;
  else if (title.includes("Manager")) b *= 1.15;
  else b += faker.number.int({ min: -5000, max: 5000 });
  return Math.round(b);
}

async function seedEmployees(locs: (typeof schema.locations.$inferInsert)[]) {
  const hq = locs.find((l) => l.type === "headquarters")!;
  const stores = locs.filter((l) => l.type === "retail_store");
  const rows: (typeof schema.employees.$inferInsert)[] = [];
  let empNum = 1000;

  // HQ employees ~250
  for (const dept of HQ_DEPARTMENTS) {
    const count = dept === "Executive" ? 5 : Math.floor(245 / (HQ_DEPARTMENTS.length - 1));
    for (let i = 0; i < count; i++) {
      const title = dept === "Executive"
        ? ["CEO", "CFO", "COO", "CTO", "VP Operations"][i]
        : `${dept} ${["Specialist", "Analyst", "Coordinator", "Manager", "Senior Specialist"][i % 5]}`;
      const hireDate = faker.date.between({ from: "2015-03-01", to: "2024-06-01" });
      const isTerminated = shouldInject();
      const id = uuid();

      rows.push({
        id,
        employeeNumber: `MH-${++empNum}`,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: `emp${empNum}@mh-wearables.de`,
        phone: faker.phone.number(),
        dateOfBirth: faker.date.between({ from: "1965-01-01", to: "2000-12-31" }).toISOString().split("T")[0],
        hireDate: hireDate.toISOString().split("T")[0],
        terminationDate: isTerminated ? faker.date.between({ from: hireDate, to: `${AUDIT_YEAR}-12-31` }).toISOString().split("T")[0] : null,
        locationId: hq.id!,
        department: dept,
        jobTitle: title,
        employmentType: "full_time",
        annualSalary: String(getSalary(dept, title)),
        bankIban: faker.finance.iban({ countryCode: "DE" }),
        taxId: `${faker.number.int({ min: 10, max: 99 })}/${faker.number.int({ min: 100, max: 999 })}/${faker.number.int({ min: 10000, max: 99999 })}`,
        socialSecurityNumber: `${faker.number.int({ min: 10, max: 99 })} ${faker.number.int({ min: 100000, max: 999999 })} ${faker.string.alpha(1).toUpperCase()} ${faker.number.int({ min: 100, max: 999 })}`,
        isActive: !isTerminated,
      });
    }
  }

  // Store employees: 8-12 per store
  for (const store of stores) {
    const count = faker.number.int({ min: 8, max: 12 });
    for (let i = 0; i < count; i++) {
      const title = i === 0 ? "Store Manager" : STORE_POSITIONS[faker.number.int({ min: 1, max: STORE_POSITIONS.length - 1 })];
      const hireDate = faker.date.between({ from: store.openDate!, to: "2024-06-01" });
      const id = uuid();

      rows.push({
        id,
        employeeNumber: `MH-${++empNum}`,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: `emp${empNum}@mh-wearables.de`,
        phone: faker.phone.number(),
        dateOfBirth: faker.date.between({ from: "1970-01-01", to: "2003-12-31" }).toISOString().split("T")[0],
        hireDate: hireDate.toISOString().split("T")[0],
        terminationDate: null,
        locationId: store.id!,
        department: "Retail",
        jobTitle: title,
        employmentType: i === 0 ? "full_time" : faker.helpers.arrayElement(["full_time", "part_time"]),
        annualSalary: String(getSalary("Retail", title)),
        bankIban: faker.finance.iban({ countryCode: "DE" }),
        taxId: `${faker.number.int({ min: 10, max: 99 })}/${faker.number.int({ min: 100, max: 999 })}/${faker.number.int({ min: 10000, max: 99999 })}`,
        socialSecurityNumber: `${faker.number.int({ min: 10, max: 99 })} ${faker.number.int({ min: 100000, max: 999999 })} ${faker.string.alpha(1).toUpperCase()} ${faker.number.int({ min: 100, max: 999 })}`,
        isActive: true,
      });
    }
  }

  // Insert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(schema.employees).values(rows.slice(i, i + 100));
  }
  console.log(`  ✓ ${rows.length} employees`);
  return rows;
}

// ── Contracts ──

async function seedContracts(
  emps: (typeof schema.employees.$inferInsert)[],
  vends: (typeof schema.vendors.$inferInsert)[],
  locs: (typeof schema.locations.$inferInsert)[]
) {
  const rows: (typeof schema.contracts.$inferInsert)[] = [];
  let cNum = 1000;

  // Employment contracts
  for (const emp of emps) {
    const isMissing = shouldInject();
    if (isMissing) {
      injectedAnomalies.push({ table: "contracts", id: emp.id!, errorType: "missing_employee_contract", description: `No contract for ${emp.firstName} ${emp.lastName}` });
      continue;
    }

    const isExpired = shouldInject();
    const endDate = isExpired
      ? faker.date.between({ from: emp.hireDate!, to: "2024-12-31" }).toISOString().split("T")[0]
      : "2026-12-31";

    const row: typeof schema.contracts.$inferInsert = {
      id: uuid(),
      contractNumber: `CTR-EMP-${++cNum}`,
      type: "employee",
      partyName: `${emp.firstName} ${emp.lastName}`,
      partyId: emp.id,
      startDate: emp.hireDate!,
      endDate,
      value: emp.annualSalary!,
      status: isExpired ? "expired" : "active",
      hasError: isExpired && emp.isActive === true,
      errorType: isExpired && emp.isActive === true ? "expired_employee_contract" : null,
    };

    if (row.hasError) {
      injectedAnomalies.push({ table: "contracts", id: row.id!, errorType: "expired_employee_contract", description: `Expired contract for active employee ${emp.firstName} ${emp.lastName}` });
    }

    rows.push(row);
  }

  // Vendor contracts
  for (const v of vends) {
    const isExpired = shouldInject();
    const startDate = faker.date.between({ from: "2019-01-01", to: "2023-06-01" }).toISOString().split("T")[0];
    const endDate = isExpired
      ? faker.date.between({ from: startDate, to: "2024-11-30" }).toISOString().split("T")[0]
      : "2026-06-30";

    const row: typeof schema.contracts.$inferInsert = {
      id: uuid(),
      contractNumber: `CTR-VND-${++cNum}`,
      type: "vendor",
      partyName: v.name!,
      partyId: v.id,
      startDate,
      endDate,
      value: String(faker.number.int({ min: 24000, max: 300000 })),
      status: isExpired ? "expired" : "active",
      hasError: isExpired,
      errorType: isExpired ? "expired_vendor_contract" : null,
    };

    if (isExpired) {
      injectedAnomalies.push({ table: "contracts", id: row.id!, errorType: "expired_vendor_contract", description: `Expired vendor contract with ${v.name}` });
    }
    rows.push(row);
  }

  // Lease contracts for stores
  for (const loc of locs.filter((l) => l.type === "retail_store")) {
    const isExpired = shouldInject();
    const endDate = isExpired
      ? faker.date.between({ from: loc.openDate!, to: "2024-12-31" }).toISOString().split("T")[0]
      : "2027-12-31";

    const row: typeof schema.contracts.$inferInsert = {
      id: uuid(),
      contractNumber: `CTR-LSE-${++cNum}`,
      type: "lease",
      partyName: `Landlord — ${loc.city}`,
      partyId: loc.id,
      startDate: loc.openDate!,
      endDate,
      value: String(faker.number.int({ min: 60000, max: 216000 })),
      status: isExpired ? "expired" : "active",
      hasError: isExpired,
      errorType: isExpired ? "expired_lease" : null,
    };

    if (isExpired) {
      injectedAnomalies.push({ table: "contracts", id: row.id!, errorType: "expired_lease", description: `Expired lease for ${loc.city}` });
    }
    rows.push(row);
  }

  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(schema.contracts).values(rows.slice(i, i + 100));
  }
  console.log(`  ✓ ${rows.length} contracts`);
  return rows;
}

// ── Payroll ──

async function seedPayroll(emps: (typeof schema.employees.$inferInsert)[]) {
  const rows: (typeof schema.payroll.$inferInsert)[] = [];

  for (const emp of emps) {
    const monthlySalary = Number(emp.annualSalary) / 12;
    const hourlyRate = monthlySalary / 160;

    for (let month = 1; month <= 12; month++) {
      const periodStart = `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-01`;
      const periodEnd = `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31}`;
      const payDate = `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${faker.number.int({ min: 25, max: 28 })}`;

      // Skip if terminated before this month
      if (emp.terminationDate && emp.terminationDate < periodStart) {
        // Ghost employee anomaly
        if (shouldInject()) {
          const basePay = monthlySalary;
          const grossPay = basePay;
          const tax = Math.round(grossPay * 0.35);
          const ss = Math.round(grossPay * 0.095);
          const hi = Math.round(grossPay * 0.073);
          const netPay = Math.round((grossPay - tax - ss - hi) * 100) / 100;

          const id = uuid();
          rows.push({
            id, employeeId: emp.id!, periodStart, periodEnd, payDate,
            basePay: String(Math.round(basePay * 100) / 100),
            overtimeHours: "0", overtimePay: "0", bonus: "0", deductions: "0",
            taxWithheld: String(tax), socialSecurity: String(ss), healthInsurance: String(hi),
            grossPay: String(Math.round(grossPay * 100) / 100),
            netPay: String(netPay),
            hasError: true, errorType: "ghost_employee_payment",
          });
          injectedAnomalies.push({ table: "payroll", id, errorType: "ghost_employee_payment", description: `Payment to terminated employee ${emp.firstName} ${emp.lastName} for ${periodStart}` });
        }
        continue;
      }

      let basePay = monthlySalary;
      let overtimeHours = faker.number.int({ min: 0, max: 15 });
      let overtimePay = overtimeHours * hourlyRate * 1.5;
      const bonus = Math.random() < 0.1 ? faker.number.int({ min: 100, max: 2000 }) : 0;
      let hasError = false;
      let errorType: string | null = null;

      // Inject payroll anomalies
      if (shouldInject()) {
        const anomaly = faker.helpers.arrayElement(["overpayment", "underpayment", "overtime_mismatch", "excessive_overtime"]);
        hasError = true;
        errorType = anomaly;

        switch (anomaly) {
          case "overpayment":
            basePay += faker.number.int({ min: 200, max: 1500 });
            injectedAnomalies.push({ table: "payroll", id: "", errorType: "overpayment", description: `Overpayment to ${emp.firstName} ${emp.lastName}` });
            break;
          case "underpayment":
            basePay -= faker.number.int({ min: 100, max: 800 });
            injectedAnomalies.push({ table: "payroll", id: "", errorType: "underpayment", description: `Underpayment to ${emp.firstName} ${emp.lastName}` });
            break;
          case "overtime_mismatch":
            overtimeHours = faker.number.int({ min: 5, max: 20 });
            overtimePay = overtimeHours * hourlyRate * 1.5 * faker.helpers.arrayElement([0.5, 0.75, 1.8, 2.0]);
            injectedAnomalies.push({ table: "payroll", id: "", errorType: "overtime_mismatch", description: `OT mismatch for ${emp.firstName} ${emp.lastName}` });
            break;
          case "excessive_overtime":
            overtimeHours = faker.number.int({ min: 60, max: 100 });
            overtimePay = overtimeHours * hourlyRate * 1.5;
            injectedAnomalies.push({ table: "payroll", id: "", errorType: "excessive_overtime", description: `Excessive OT for ${emp.firstName} ${emp.lastName}` });
            break;
        }
      }

      const grossPay = basePay + overtimePay + bonus;
      const taxWithheld = Math.round(grossPay * (0.3 + Math.random() * 0.12));
      const socialSecurity = Math.round(grossPay * 0.095);
      const healthInsurance = Math.round(grossPay * 0.073);
      const deductions = faker.number.int({ min: 50, max: 300 });
      const netPay = Math.round((grossPay - taxWithheld - socialSecurity - healthInsurance - deductions) * 100) / 100;

      const id = uuid();
      rows.push({
        id, employeeId: emp.id!, periodStart, periodEnd, payDate,
        basePay: String(Math.round(basePay * 100) / 100),
        overtimeHours: String(overtimeHours),
        overtimePay: String(Math.round(overtimePay * 100) / 100),
        bonus: String(bonus), deductions: String(deductions),
        taxWithheld: String(taxWithheld), socialSecurity: String(socialSecurity),
        healthInsurance: String(healthInsurance),
        grossPay: String(Math.round(grossPay * 100) / 100),
        netPay: String(netPay),
        hasError, errorType,
      });
    }
  }

  // Batch insert
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(schema.payroll).values(rows.slice(i, i + 500));
  }
  console.log(`  ✓ ${rows.length} payroll records`);
  return rows;
}

// ── Sales Transactions ──

async function seedSales(
  locs: (typeof schema.locations.$inferInsert)[],
  emps: (typeof schema.employees.$inferInsert)[],
  prods: (typeof schema.products.$inferInsert)[]
) {
  const txRows: (typeof schema.salesTransactions.$inferInsert)[] = [];
  const itemRows: (typeof schema.salesItems.$inferInsert)[] = [];
  const stores = locs.filter((l) => l.type === "retail_store");
  let txNum = 10000;

  for (const store of stores) {
    const storeEmps = emps.filter((e) => e.locationId === store.id && e.isActive);

    for (let month = 1; month <= 12; month++) {
      const txCount = faker.number.int({ min: 80, max: 200 });
      for (let t = 0; t < txCount; t++) {
        const day = faker.number.int({ min: 1, max: 28 });
        const dow = new Date(AUDIT_YEAR, month - 1, day).getDay();
        if (dow === 0) continue;

        const emp = storeEmps.length > 0 ? faker.helpers.arrayElement(storeEmps) : emps[0];
        const itemCount = faker.number.int({ min: 1, max: 5 });
        let subtotal = 0;
        const txId = uuid();
        const txItems: (typeof schema.salesItems.$inferInsert)[] = [];

        for (let it = 0; it < itemCount; it++) {
          const prod = faker.helpers.arrayElement(prods);
          const qty = faker.number.int({ min: 1, max: 3 });
          const lineTotal = Number(prod.unitPrice) * qty;
          subtotal += lineTotal;
          txItems.push({
            transactionId: txId,
            productId: prod.id!,
            productName: prod.name!,
            category: prod.category!,
            sku: prod.sku!,
            quantity: qty,
            unitPrice: prod.unitPrice!,
            lineTotal: String(Math.round(lineTotal * 100) / 100),
          });
        }

        const taxAmount = Math.round(subtotal * 0.19 * 100) / 100;
        const discount = Math.random() < 0.15 ? Math.round(subtotal * faker.number.float({ min: 0.05, max: 0.2 }) * 100) / 100 : 0;
        const total = Math.round((subtotal + taxAmount - discount) * 100) / 100;
        const paymentMethod = faker.helpers.weightedArrayElement([
          { value: "card" as const, weight: 55 },
          { value: "cash" as const, weight: 35 },
          { value: "mobile_pay" as const, weight: 10 },
        ]);

        let hasError = false;
        let errorType: string | null = null;

        if (shouldInject()) {
          hasError = true;
          errorType = faker.helpers.arrayElement(["voided_not_refunded", "discount_no_approval", "after_hours_sale"]);
          injectedAnomalies.push({ table: "sales_transactions", id: txId, errorType, description: `${errorType} at ${store.city}` });
        }

        txRows.push({
          id: txId,
          transactionNumber: `TXN-${++txNum}`,
          locationId: store.id!,
          employeeId: emp.id!,
          date: `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          time: `${faker.number.int({ min: 9, max: 20 })}:${String(faker.number.int({ min: 0, max: 59 })).padStart(2, "0")}:00`,
          subtotal: String(Math.round(subtotal * 100) / 100),
          taxAmount: String(taxAmount),
          discount: String(discount),
          total: String(total),
          paymentMethod,
          hasError, errorType,
        });
        itemRows.push(...txItems);
      }
    }
  }

  for (let i = 0; i < txRows.length; i += 500) {
    await db.insert(schema.salesTransactions).values(txRows.slice(i, i + 500));
  }
  for (let i = 0; i < itemRows.length; i += 500) {
    await db.insert(schema.salesItems).values(itemRows.slice(i, i + 500));
  }
  console.log(`  ✓ ${txRows.length} sales transactions (${itemRows.length} line items)`);
}

// ── Cash Reconciliations ──

async function seedCashRecon(
  locs: (typeof schema.locations.$inferInsert)[],
  emps: (typeof schema.employees.$inferInsert)[]
) {
  const rows: (typeof schema.cashReconciliations.$inferInsert)[] = [];
  const stores = locs.filter((l) => l.type === "retail_store");

  for (const store of stores) {
    const storeEmps = emps.filter((e) => e.locationId === store.id && e.isActive);

    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day++) {
        const dow = new Date(AUDIT_YEAR, month - 1, day).getDay();
        if (dow === 0) continue;

        const expected = faker.number.float({ min: 800, max: 4000, fractionDigits: 2 });
        let actual = expected;
        let hasError = false;
        let errorType: string | null = null;

        if (shouldInject()) {
          const type = faker.helpers.arrayElement(["cash_shortage", "cash_surplus"]);
          hasError = true;
          errorType = type;
          if (type === "cash_shortage") {
            actual = Math.round((expected - faker.number.float({ min: 20, max: 500 })) * 100) / 100;
          } else {
            actual = Math.round((expected + faker.number.float({ min: 10, max: 200 })) * 100) / 100;
          }
          injectedAnomalies.push({ table: "cash_reconciliations", id: "", errorType: type, description: `${type} at ${store.city} on ${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
        }

        const variance = Math.round((actual - expected) * 100) / 100;
        const emp = storeEmps.length > 0 ? faker.helpers.arrayElement(storeEmps) : emps[0];

        rows.push({
          id: uuid(),
          locationId: store.id!,
          date: `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          registerNumber: faker.number.int({ min: 1, max: 3 }),
          expectedCash: String(expected),
          actualCash: String(actual),
          variance: String(variance),
          reconciledBy: emp.id!,
          notes: hasError ? errorType : null,
          hasError, errorType,
        });
      }
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(schema.cashReconciliations).values(rows.slice(i, i + 500));
  }
  console.log(`  ✓ ${rows.length} cash reconciliations`);
}

// ── Invoices ──

async function seedInvoices(vends: (typeof schema.vendors.$inferInsert)[]) {
  const rows: (typeof schema.invoices.$inferInsert)[] = [];
  let invNum = 5000;

  for (let month = 1; month <= 12; month++) {
    // Incoming invoices from vendors
    for (const v of vends) {
      if (Math.random() > 0.6) continue;
      const amount = faker.number.float({ min: 500, max: 50000, fractionDigits: 2 });
      const taxAmount = Math.round(amount * 0.19 * 100) / 100;
      const total = Math.round((amount + taxAmount) * 100) / 100;
      const issueDate = `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${faker.number.int({ min: 1, max: 15 })}`;
      const dueDate = `${AUDIT_YEAR}-${String(Math.min(month + 1, 12)).padStart(2, "0")}-${faker.number.int({ min: 1, max: 28 })}`;

      let hasError = false;
      let errorType: string | null = null;
      let status: "paid" | "unpaid" | "overdue" | "disputed" = faker.helpers.weightedArrayElement([
        { value: "paid" as const, weight: 70 },
        { value: "unpaid" as const, weight: 15 },
        { value: "overdue" as const, weight: 10 },
        { value: "disputed" as const, weight: 5 },
      ]);

      if (shouldInject()) {
        hasError = true;
        errorType = faker.helpers.arrayElement(["duplicate_invoice", "amount_mismatch", "missing_approval"]);
        injectedAnomalies.push({ table: "invoices", id: "", errorType, description: `${errorType} for invoice from ${v.name}` });
      }

      rows.push({
        id: uuid(),
        invoiceNumber: `INV-${++invNum}`,
        type: "incoming",
        vendorId: v.id,
        issueDate, dueDate,
        paidDate: status === "paid" ? `${AUDIT_YEAR}-${String(Math.min(month + 1, 12)).padStart(2, "0")}-${faker.number.int({ min: 1, max: 28 })}` : null,
        amount: String(amount), taxAmount: String(taxAmount), totalAmount: String(total),
        status, hasError, errorType,
      });
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(schema.invoices).values(rows.slice(i, i + 500));
  }
  console.log(`  ✓ ${rows.length} invoices`);
}

// ── Expense Reports ──

async function seedExpenses(emps: (typeof schema.employees.$inferInsert)[]) {
  const rows: (typeof schema.expenseReports.$inferInsert)[] = [];
  const itemRows: (typeof schema.expenseItems.$inferInsert)[] = [];
  const managers = emps.filter((e) => e.jobTitle?.includes("Manager") || e.jobTitle?.includes("Director"));

  for (const emp of emps) {
    if (Math.random() > 0.3) continue; // ~30% of employees submit expenses
    const count = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < count; i++) {
      const month = faker.number.int({ min: 1, max: 12 });
      const id = uuid();
      const items: (typeof schema.expenseItems.$inferInsert)[] = [];
      let total = 0;

      const itemCount = faker.number.int({ min: 1, max: 5 });
      for (let j = 0; j < itemCount; j++) {
        const amount = faker.number.float({ min: 15, max: 500, fractionDigits: 2 });
        total += amount;
        items.push({
          expenseReportId: id,
          category: faker.helpers.arrayElement(["Travel", "Meals", "Office Supplies", "Software", "Training", "Entertainment"]),
          description: faker.commerce.productDescription().slice(0, 100),
          date: `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${faker.number.int({ min: 1, max: 28 })}`,
          amount: String(amount),
          receiptAttached: Math.random() > 0.05,
        });
      }

      let hasError = false;
      let errorType: string | null = null;
      if (shouldInject()) {
        hasError = true;
        errorType = faker.helpers.arrayElement(["excessive_amount", "missing_receipts", "self_approved"]);
        injectedAnomalies.push({ table: "expense_reports", id, errorType, description: `${errorType} by ${emp.firstName} ${emp.lastName}` });
      }

      const approver = managers.length > 0 ? faker.helpers.arrayElement(managers) : emps[0];

      rows.push({
        id,
        employeeId: emp.id!,
        submittedDate: `${AUDIT_YEAR}-${String(month).padStart(2, "0")}-${faker.number.int({ min: 15, max: 28 })}`,
        approvedDate: hasError && errorType === "self_approved" ? null : `${AUDIT_YEAR}-${String(Math.min(month + 1, 12)).padStart(2, "0")}-05`,
        approvedBy: hasError && errorType === "self_approved" ? emp.id : approver.id,
        status: "approved",
        totalAmount: String(Math.round(total * 100) / 100),
        hasError, errorType,
      });
      itemRows.push(...items);
    }
  }

  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(schema.expenseReports).values(rows.slice(i, i + 100));
  }
  for (let i = 0; i < itemRows.length; i += 500) {
    await db.insert(schema.expenseItems).values(itemRows.slice(i, i + 500));
  }
  console.log(`  ✓ ${rows.length} expense reports (${itemRows.length} items)`);
}

// ── Main ──

async function main() {
  console.log("🏭 Generating synthetic database for M&H Wearables...\n");
  console.log("  Clearing existing data...");

  // Drop all data (reverse FK order)
  await db.execute(sql`TRUNCATE TABLE audit_logs, po_line_items, purchase_orders, expense_items, expense_reports, invoice_line_items, invoices, inventory_records, cash_reconciliations, sales_items, sales_transactions, time_entries, payroll, contracts, employees, products, vendors, locations CASCADE`);

  const locs = await seedLocations();
  const prods = await seedProducts();
  const vends = await seedVendors();
  const emps = await seedEmployees(locs);
  const contracts = await seedContracts(emps, vends, locs);
  await seedPayroll(emps);
  await seedSales(locs, emps, prods);
  await seedCashRecon(locs, emps);
  await seedInvoices(vends);
  await seedExpenses(emps);

  console.log(`\n📊 Anomalies injected: ${injectedAnomalies.length}`);
  const byType: Record<string, number> = {};
  for (const a of injectedAnomalies) {
    byType[a.errorType] = (byType[a.errorType] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  console.log("\n✅ Database seeded successfully!");
  await closeDB();
}

main().catch((err) => {
  console.error("Error:", err);
  closeDB();
  process.exit(1);
});
