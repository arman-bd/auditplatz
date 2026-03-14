// ─── Core Entity Types ───

export interface Location {
  id: string;
  code: string;
  type: "headquarters" | "retail_store";
  name: string;
  city: string;
  address: string;
  postalCode: string;
  state: string;
  openDate: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  hireDate: string;
  terminationDate: string | null;
  locationId: string;
  department: string;
  jobTitle: string;
  employmentType: "full_time" | "part_time" | "contractor";
  annualSalary: number;
  bankIban: string;
  taxId: string;
  socialSecurityNumber: string;
  managerId: string | null;
  isActive: boolean;
}

// ─── Payroll ───

export interface PayrollRecord {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  basePay: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  taxWithheld: number;
  socialSecurity: number;
  healthInsurance: number;
  netPay: number;
  grossPay: number;
  hasError: boolean;
  errorType: string | null;
}

// ─── Time & Attendance ───

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  scheduledHours: number;
  actualHours: number;
  overtimeHours: number;
  breakMinutes: number;
  status: "present" | "absent" | "sick" | "vacation" | "holiday";
  hasError: boolean;
  errorType: string | null;
}

// ─── Sales & Transactions ───

export interface SalesTransaction {
  id: string;
  transactionNumber: string;
  locationId: string;
  employeeId: string;
  date: string;
  time: string;
  items: SalesItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: "cash" | "card" | "mobile_pay";
  hasError: boolean;
  errorType: string | null;
}

export interface SalesItem {
  productId: string;
  productName: string;
  category: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// ─── Cash Reconciliation ───

export interface CashReconciliation {
  id: string;
  locationId: string;
  date: string;
  registerNumber: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  reconciledBy: string;
  notes: string | null;
  hasError: boolean;
  errorType: string | null;
}

// ─── Inventory ───

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  isActive: boolean;
}

export interface InventoryRecord {
  id: string;
  productId: string;
  locationId: string;
  date: string;
  type: "receipt" | "sale" | "adjustment" | "transfer" | "return";
  quantityChange: number;
  runningBalance: number;
  reference: string;
  hasError: boolean;
  errorType: string | null;
}

// ─── Contracts ───

export interface Contract {
  id: string;
  contractNumber: string;
  type: "vendor" | "employee" | "lease" | "service" | "maintenance";
  partyName: string;
  partyId: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  status: "active" | "expired" | "terminated" | "pending_renewal";
  autoRenew: boolean;
  terms: string;
  hasError: boolean;
  errorType: string | null;
}

// ─── Invoices & Documents ───

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "incoming" | "outgoing";
  vendorId: string | null;
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: "paid" | "unpaid" | "overdue" | "partial" | "disputed";
  lineItems: InvoiceLineItem[];
  hasError: boolean;
  errorType: string | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ─── Expenses ───

export interface ExpenseReport {
  id: string;
  employeeId: string;
  submittedDate: string;
  approvedDate: string | null;
  approvedBy: string | null;
  status: "submitted" | "approved" | "rejected" | "paid";
  items: ExpenseItem[];
  totalAmount: number;
  hasError: boolean;
  errorType: string | null;
}

export interface ExpenseItem {
  category: string;
  description: string;
  date: string;
  amount: number;
  receiptAttached: boolean;
}

// ─── Purchase Orders ───

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  locationId: string;
  orderDate: string;
  expectedDelivery: string;
  actualDelivery: string | null;
  status: "ordered" | "shipped" | "delivered" | "partial" | "cancelled";
  items: POLineItem[];
  totalAmount: number;
  hasError: boolean;
  errorType: string | null;
}

export interface POLineItem {
  productId: string;
  description: string;
  quantity: number;
  unitCost: number;
  total: number;
}

// ─── Audit Trail ───

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string;
}

// ─── Error Summary ───

export interface ErrorSummary {
  totalRecords: number;
  errorRecords: number;
  errorRate: number;
  errorsByType: Record<string, number>;
}

// ─── Generated Data Bundle ───

export interface GeneratedData {
  locations: Location[];
  employees: Employee[];
  products: Product[];
  payroll: PayrollRecord[];
  timeEntries: TimeEntry[];
  salesTransactions: SalesTransaction[];
  cashReconciliations: CashReconciliation[];
  inventoryRecords: InventoryRecord[];
  contracts: Contract[];
  invoices: Invoice[];
  expenses: ExpenseReport[];
  purchaseOrders: PurchaseOrder[];
  auditLogs: AuditLog[];
  errorSummary: Record<string, ErrorSummary>;
}
