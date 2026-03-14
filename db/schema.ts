import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  numeric,
  integer,
  text,
  time,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ── Locations ──

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  address: varchar("address", { length: 300 }).notNull(),
  postalCode: varchar("postal_code", { length: 10 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  openDate: date("open_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Vendors ──

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  contactEmail: varchar("contact_email", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  taxId: varchar("tax_id", { length: 30 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Employees ──

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey(),
  employeeNumber: varchar("employee_number", { length: 20 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).unique().notNull(),
  phone: varchar("phone", { length: 30 }),
  dateOfBirth: date("date_of_birth").notNull(),
  hireDate: date("hire_date").notNull(),
  terminationDate: date("termination_date"),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  department: varchar("department", { length: 100 }).notNull(),
  jobTitle: varchar("job_title", { length: 150 }).notNull(),
  employmentType: varchar("employment_type", { length: 20 }).notNull(),
  annualSalary: numeric("annual_salary", { precision: 12, scale: 2 }).notNull(),
  bankIban: varchar("bank_iban", { length: 34 }),
  taxId: varchar("tax_id", { length: 20 }),
  socialSecurityNumber: varchar("social_security_number", { length: 20 }),
  managerId: uuid("manager_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Products ──

export const products = pgTable("products", {
  id: uuid("id").primaryKey(),
  sku: varchar("sku", { length: 30 }).unique().notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Payroll ──

export const payroll = pgTable("payroll", {
  id: uuid("id").primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  payDate: date("pay_date").notNull(),
  basePay: numeric("base_pay", { precision: 10, scale: 2 }).notNull(),
  overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  overtimePay: numeric("overtime_pay", { precision: 10, scale: 2 }).default("0"),
  bonus: numeric("bonus", { precision: 10, scale: 2 }).default("0"),
  deductions: numeric("deductions", { precision: 10, scale: 2 }).default("0"),
  taxWithheld: numeric("tax_withheld", { precision: 10, scale: 2 }).notNull(),
  socialSecurity: numeric("social_security", { precision: 10, scale: 2 }).notNull(),
  healthInsurance: numeric("health_insurance", { precision: 10, scale: 2 }).notNull(),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }).notNull(),
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).notNull(),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Time Entries ──

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  date: date("date").notNull(),
  clockIn: time("clock_in"),
  clockOut: time("clock_out"),
  scheduledHours: numeric("scheduled_hours", { precision: 4, scale: 2 }).notNull(),
  actualHours: numeric("actual_hours", { precision: 4, scale: 2 }).notNull(),
  overtimeHours: numeric("overtime_hours", { precision: 4, scale: 2 }).default("0"),
  breakMinutes: integer("break_minutes").default(0),
  status: varchar("status", { length: 20 }).notNull(),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Sales Transactions ──

export const salesTransactions = pgTable("sales_transactions", {
  id: uuid("id").primaryKey(),
  transactionNumber: varchar("transaction_number", { length: 30 }).unique().notNull(),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  date: date("date").notNull(),
  time: time("time").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesItems = pgTable("sales_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().references(() => salesTransactions.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productName: varchar("product_name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  sku: varchar("sku", { length: 30 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
});

// ── Cash Reconciliations ──

export const cashReconciliations = pgTable("cash_reconciliations", {
  id: uuid("id").primaryKey(),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  date: date("date").notNull(),
  registerNumber: integer("register_number").notNull(),
  expectedCash: numeric("expected_cash", { precision: 10, scale: 2 }).notNull(),
  actualCash: numeric("actual_cash", { precision: 10, scale: 2 }).notNull(),
  variance: numeric("variance", { precision: 10, scale: 2 }).notNull(),
  reconciledBy: uuid("reconciled_by").notNull().references(() => employees.id),
  notes: text("notes"),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Contracts ──

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey(),
  contractNumber: varchar("contract_number", { length: 30 }).unique().notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  partyName: varchar("party_name", { length: 200 }).notNull(),
  partyId: uuid("party_id"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  status: varchar("status", { length: 20 }).notNull(),
  autoRenew: boolean("auto_renew").default(false),
  terms: text("terms"),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Invoices ──

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 30 }).unique().notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  vendorId: uuid("vendor_id"),
  customerId: uuid("customer_id"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  description: varchar("description", { length: 300 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
});

// ── Expense Reports ──

export const expenseReports = pgTable("expense_reports", {
  id: uuid("id").primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id),
  submittedDate: date("submitted_date").notNull(),
  approvedDate: date("approved_date"),
  approvedBy: uuid("approved_by"),
  status: varchar("status", { length: 20 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseItems = pgTable("expense_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseReportId: uuid("expense_report_id").notNull().references(() => expenseReports.id),
  category: varchar("category", { length: 100 }).notNull(),
  description: varchar("description", { length: 300 }).notNull(),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  receiptAttached: boolean("receipt_attached").default(true),
});

// ── Purchase Orders ──

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey(),
  poNumber: varchar("po_number", { length: 30 }).unique().notNull(),
  vendorId: uuid("vendor_id").notNull(),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  orderDate: date("order_date").notNull(),
  expectedDelivery: date("expected_delivery").notNull(),
  actualDelivery: date("actual_delivery"),
  status: varchar("status", { length: 20 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const poLineItems = pgTable("po_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productId: uuid("product_id").references(() => products.id),
  description: varchar("description", { length: 300 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
});

// ── Inventory ──

export const inventoryRecords = pgTable("inventory_records", {
  id: uuid("id").primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  date: date("date").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  quantityChange: integer("quantity_change").notNull(),
  runningBalance: integer("running_balance").notNull(),
  reference: varchar("reference", { length: 100 }),
  hasError: boolean("has_error").default(false),
  errorType: varchar("error_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Audit Logs ──

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  userId: uuid("user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
});
