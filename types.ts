// ── Shared Types for M&H Wearables Business Auditor ──

export interface Location {
  id: string;
  name: string;
  city: string;
  type: "headquarters" | "retail_store";
  address: string;
  openedDate: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  locationId: string;
  department: string;
  position: string;
  monthlySalary: number; // gross EUR
  hourlyRate: number;
  startDate: string;
  endDate: string | null;
  status: "active" | "terminated" | "on_leave";
  contractId: string | null;
  taxId: string;
}

export interface Contract {
  id: string;
  type: "employment" | "vendor" | "lease" | "service";
  relatedEntityId: string; // employeeId, vendorId, or locationId
  title: string;
  startDate: string;
  endDate: string;
  renewalDate: string | null;
  monthlyValue: number;
  status: "active" | "expired" | "terminated" | "pending_renewal";
  signedBy: string;
  documentRef: string | null;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  period: string; // YYYY-MM
  basePay: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  taxWithheld: number;
  netPay: number;
  paidDate: string;
  approvedBy: string;
}

export interface FinancialTransaction {
  id: string;
  locationId: string;
  date: string;
  type: "sale" | "expense" | "transfer" | "refund" | "cash_deposit";
  category: string;
  amount: number;
  reference: string;
  counterparty: string;
  approvedBy: string | null;
  notes: string;
}

export interface DailyCashReport {
  id: string;
  locationId: string;
  date: string;
  posTotal: number;
  cashCounted: number;
  cardTotal: number;
  discrepancy: number;
  reportedBy: string;
  notes: string;
}

export interface Document {
  id: string;
  type: "tax_certificate" | "business_license" | "insurance" | "audit_report" | "invoice" | "receipt";
  relatedEntityId: string;
  title: string;
  createdDate: string;
  expiryDate: string | null;
  status: "valid" | "expired" | "missing" | "pending";
}

// ── Anomaly tracking (used by generator for ground truth) ──

export interface Anomaly {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  category: "payroll" | "contract" | "financial" | "compliance" | "cash";
  entityId: string;
  entityType: string;
  description: string;
  amount?: number;
}

// ── Audit result types ──

export interface AuditFinding {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  entityId: string;
  description: string;
  evidence: Record<string, unknown>;
  recommendation: string;
}

export interface AuditReport {
  companyName: string;
  auditPeriod: { start: string; end: string };
  generatedAt: string;
  findings: AuditFinding[];
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

// ── Full database shape ──

export interface CompanyDatabase {
  company: {
    name: string;
    country: string;
    industry: string;
    auditPeriod: { start: string; end: string };
  };
  locations: Location[];
  employees: Employee[];
  contracts: Contract[];
  payroll: PayrollRecord[];
  transactions: FinancialTransaction[];
  dailyCashReports: DailyCashReport[];
  documents: Document[];
}

export interface GeneratorOutput {
  database: CompanyDatabase;
  anomalies: Anomaly[]; // ground truth for validation
}
