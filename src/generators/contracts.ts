import { faker } from "@faker-js/faker/locale/de";
import {
  genId,
  shouldInjectError,
  pickErrorType,
  randomInt,
  randomFloat,
  round2,
  addMonths,
  pick,
  SequentialCounter,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE } from "../config.js";
import type { Employee, Location, Contract } from "../types.js";
import type { VendorRecord } from "./vendors.js";

const counter = new SequentialCounter();

const CONTRACT_ERROR_TYPES = [
  "expired_still_active",     // Contract expired but still marked active
  "missing_renewal",          // Auto-renew contract not renewed
  "value_mismatch",           // Contract value doesn't match invoiced amounts
  "unsigned_contract",        // Contract in effect but never properly signed
  "duplicate_contract",       // Two active contracts for same vendor/service
  "terms_violation",          // Service delivered outside contract terms
];

const LEASE_TERMS = [
  "Monthly rent includes utilities and maintenance",
  "Tenant responsible for interior maintenance",
  "Landlord responsible for structural repairs",
  "Annual rent increase capped at 3%",
];

const SERVICE_TERMS = [
  "Service level agreement: 99.9% uptime",
  "Response time within 4 business hours",
  "Quarterly performance reviews required",
  "30-day termination notice required",
];

export function generateContracts(
  locations: Location[],
  employees: Employee[],
  vendors: VendorRecord[]
): Contract[] {
  const contracts: Contract[] = [];

  // ─── Vendor Contracts ───
  for (const vendor of vendors) {
    const numContracts = randomInt(1, 3);
    for (let i = 0; i < numContracts; i++) {
      const startDate = faker.date
        .between({ from: DATA_START_DATE, to: "2024-06-01" })
        .toISOString()
        .split("T")[0];
      const durationMonths = pick([12, 24, 36]);
      const endDate = addMonths(startDate, durationMonths);
      const value = round2(randomFloat(5000, 500000));
      const isExpired = new Date(endDate) < new Date();

      let status: Contract["status"] = isExpired ? "expired" : "active";
      let hasError = false;
      let errorType: string | null = null;

      if (shouldInjectError()) {
        hasError = true;
        errorType = pickErrorType(CONTRACT_ERROR_TYPES);

        if (errorType === "expired_still_active" && isExpired) {
          status = "active"; // Bug: should be expired
        } else if (errorType === "missing_renewal") {
          status = "pending_renewal";
        }
      }

      contracts.push({
        id: genId(),
        contractNumber: counter.next("CTR"),
        type: "vendor",
        partyName: vendor.name,
        partyId: vendor.id,
        startDate,
        endDate,
        value,
        currency: "EUR",
        status,
        autoRenew: Math.random() > 0.4,
        terms: `${vendor.category} supply agreement. Payment terms: Net 30.`,
        hasError,
        errorType,
      });
    }
  }

  // ─── Lease Contracts (one per retail store) ───
  const stores = locations.filter((l) => l.type === "retail_store");
  for (const store of stores) {
    const startDate = store.openDate;
    const durationMonths = pick([36, 60, 120]);
    const endDate = addMonths(startDate, durationMonths);
    const monthlyRent = randomFloat(3000, 15000);
    const totalValue = round2(monthlyRent * durationMonths);

    const isExpired = new Date(endDate) < new Date();
    let status: Contract["status"] = isExpired ? "expired" : "active";
    let hasError = false;
    let errorType: string | null = null;

    if (shouldInjectError()) {
      hasError = true;
      errorType = pickErrorType(CONTRACT_ERROR_TYPES);
      if (errorType === "expired_still_active" && isExpired) {
        status = "active";
      }
    }

    contracts.push({
      id: genId(),
      contractNumber: counter.next("LSE"),
      type: "lease",
      partyName: `${store.city} Property Management GmbH`,
      partyId: genId(),
      startDate,
      endDate,
      value: totalValue,
      currency: "EUR",
      status,
      autoRenew: true,
      terms: pick(LEASE_TERMS),
      hasError,
      errorType,
    });
  }

  // ─── Service/Maintenance Contracts ───
  const serviceTypes = [
    { name: "IT Infrastructure Support", vendor: "SecureIT Solutions" },
    { name: "Cleaning Services", vendor: "CleanTech Supplies GmbH" },
    { name: "Security Monitoring", vendor: "Alarm Systems Bavaria" },
    { name: "POS System Maintenance", vendor: "TechParts GmbH" },
    { name: "HVAC Maintenance", vendor: "Klimatech Service" },
  ];

  for (const service of serviceTypes) {
    for (const location of locations) {
      if (Math.random() < 0.7) {
        const startDate = faker.date
          .between({ from: location.openDate, to: "2024-01-01" })
          .toISOString()
          .split("T")[0];
        const endDate = addMonths(startDate, pick([12, 24]));
        const value = round2(randomFloat(1000, 20000));

        const isExpired = new Date(endDate) < new Date();
        let status: Contract["status"] = isExpired ? "expired" : "active";
        let hasError = false;
        let errorType: string | null = null;

        if (shouldInjectError()) {
          hasError = true;
          errorType = pickErrorType(CONTRACT_ERROR_TYPES);
          if (errorType === "expired_still_active" && isExpired) {
            status = "active";
          }
        }

        contracts.push({
          id: genId(),
          contractNumber: counter.next("SVC"),
          type: pick(["service", "maintenance"]),
          partyName: service.vendor,
          partyId: genId(),
          startDate,
          endDate,
          value,
          currency: "EUR",
          status,
          autoRenew: Math.random() > 0.3,
          terms: pick(SERVICE_TERMS),
          hasError,
          errorType,
        });
      }
    }
  }

  // ─── Employee Contracts ───
  for (const emp of employees) {
    const endDate = emp.terminationDate || addMonths(emp.hireDate, pick([12, 24, 36, 0]));
    // 0 = indefinite, use a far future date
    const actualEndDate = endDate === emp.hireDate ? "2030-12-31" : endDate;

    let hasError = false;
    let errorType: string | null = null;

    if (shouldInjectError()) {
      hasError = true;
      errorType = pickErrorType(CONTRACT_ERROR_TYPES);
    }

    contracts.push({
      id: genId(),
      contractNumber: counter.next("EMP"),
      type: "employee",
      partyName: `${emp.firstName} ${emp.lastName}`,
      partyId: emp.id,
      startDate: emp.hireDate,
      endDate: actualEndDate,
      value: emp.annualSalary,
      currency: "EUR",
      status: emp.isActive ? "active" : "terminated",
      autoRenew: false,
      terms: `${emp.employmentType} employment. Role: ${emp.jobTitle}. Department: ${emp.department}.`,
      hasError,
      errorType,
    });
  }

  return contracts;
}
