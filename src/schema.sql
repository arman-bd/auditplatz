-- M&H Wearables GmbH - Business Database Schema
-- PostgreSQL Schema Definition

-- ═══════════════════════════════════════════════════════════
-- LOCATIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE locations (
    id UUID PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('headquarters', 'retail_store')),
    name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address VARCHAR(300) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    state VARCHAR(100) NOT NULL,
    open_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- EMPLOYEES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE employees (
    id UUID PRIMARY KEY,
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    phone VARCHAR(30),
    date_of_birth DATE NOT NULL,
    hire_date DATE NOT NULL,
    termination_date DATE,
    location_id UUID NOT NULL REFERENCES locations(id),
    department VARCHAR(100) NOT NULL,
    job_title VARCHAR(150) NOT NULL,
    employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
    annual_salary NUMERIC(12,2) NOT NULL,
    bank_iban VARCHAR(34),
    tax_id VARCHAR(20),
    social_security_number VARCHAR(20),
    manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_location ON employees(location_id);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_active ON employees(is_active);

-- ═══════════════════════════════════════════════════════════
-- PRODUCTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);

-- ═══════════════════════════════════════════════════════════
-- PAYROLL
-- ═══════════════════════════════════════════════════════════

CREATE TABLE payroll (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    base_pay NUMERIC(10,2) NOT NULL,
    overtime_hours NUMERIC(6,2) DEFAULT 0,
    overtime_pay NUMERIC(10,2) DEFAULT 0,
    bonus NUMERIC(10,2) DEFAULT 0,
    deductions NUMERIC(10,2) DEFAULT 0,
    tax_withheld NUMERIC(10,2) NOT NULL,
    social_security NUMERIC(10,2) NOT NULL,
    health_insurance NUMERIC(10,2) NOT NULL,
    gross_pay NUMERIC(10,2) NOT NULL,
    net_pay NUMERIC(10,2) NOT NULL,
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_period ON payroll(period_start, period_end);
CREATE INDEX idx_payroll_errors ON payroll(has_error) WHERE has_error = TRUE;

-- ═══════════════════════════════════════════════════════════
-- TIME & ATTENDANCE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE time_entries (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    scheduled_hours NUMERIC(4,2) NOT NULL,
    actual_hours NUMERIC(4,2) NOT NULL,
    overtime_hours NUMERIC(4,2) DEFAULT 0,
    break_minutes INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'sick', 'vacation', 'holiday')),
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_errors ON time_entries(has_error) WHERE has_error = TRUE;

-- ═══════════════════════════════════════════════════════════
-- SALES TRANSACTIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE sales_transactions (
    id UUID PRIMARY KEY,
    transaction_number VARCHAR(30) UNIQUE NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile_pay')),
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES sales_transactions(id),
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(30) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    line_total NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_sales_location ON sales_transactions(location_id);
CREATE INDEX idx_sales_date ON sales_transactions(date);
CREATE INDEX idx_sales_employee ON sales_transactions(employee_id);
CREATE INDEX idx_sales_errors ON sales_transactions(has_error) WHERE has_error = TRUE;
CREATE INDEX idx_sales_items_txn ON sales_items(transaction_id);

-- ═══════════════════════════════════════════════════════════
-- CASH RECONCILIATION
-- ═══════════════════════════════════════════════════════════

CREATE TABLE cash_reconciliations (
    id UUID PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id),
    date DATE NOT NULL,
    register_number INTEGER NOT NULL,
    expected_cash NUMERIC(10,2) NOT NULL,
    actual_cash NUMERIC(10,2) NOT NULL,
    variance NUMERIC(10,2) NOT NULL,
    reconciled_by UUID NOT NULL REFERENCES employees(id),
    notes TEXT,
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_recon_location ON cash_reconciliations(location_id);
CREATE INDEX idx_cash_recon_date ON cash_reconciliations(date);
CREATE INDEX idx_cash_recon_errors ON cash_reconciliations(has_error) WHERE has_error = TRUE;

-- ═══════════════════════════════════════════════════════════
-- INVENTORY
-- ═══════════════════════════════════════════════════════════

CREATE TABLE inventory_records (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('receipt', 'sale', 'adjustment', 'transfer', 'return')),
    quantity_change INTEGER NOT NULL,
    running_balance INTEGER NOT NULL,
    reference VARCHAR(100),
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON inventory_records(product_id);
CREATE INDEX idx_inventory_location ON inventory_records(location_id);
CREATE INDEX idx_inventory_date ON inventory_records(date);

-- ═══════════════════════════════════════════════════════════
-- CONTRACTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE contracts (
    id UUID PRIMARY KEY,
    contract_number VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('vendor', 'employee', 'lease', 'service', 'maintenance')),
    party_name VARCHAR(200) NOT NULL,
    party_id UUID,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    value NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'terminated', 'pending_renewal')),
    auto_renew BOOLEAN DEFAULT FALSE,
    terms TEXT,
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_errors ON contracts(has_error) WHERE has_error = TRUE;

-- ═══════════════════════════════════════════════════════════
-- INVOICES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('incoming', 'outgoing')),
    vendor_id UUID,
    customer_id UUID,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    amount NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'unpaid', 'overdue', 'partial', 'disputed')),
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    description VARCHAR(300) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_errors ON invoices(has_error) WHERE has_error = TRUE;
CREATE INDEX idx_invoice_items ON invoice_line_items(invoice_id);

-- ═══════════════════════════════════════════════════════════
-- EXPENSE REPORTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE expense_reports (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id),
    submitted_date DATE NOT NULL,
    approved_date DATE,
    approved_by UUID REFERENCES employees(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected', 'paid')),
    total_amount NUMERIC(10,2) NOT NULL,
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_report_id UUID NOT NULL REFERENCES expense_reports(id),
    category VARCHAR(100) NOT NULL,
    description VARCHAR(300) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    receipt_attached BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_expenses_employee ON expense_reports(employee_id);
CREATE INDEX idx_expenses_status ON expense_reports(status);
CREATE INDEX idx_expense_items ON expense_items(expense_report_id);

-- ═══════════════════════════════════════════════════════════
-- PURCHASE ORDERS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY,
    po_number VARCHAR(30) UNIQUE NOT NULL,
    vendor_id UUID NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id),
    order_date DATE NOT NULL,
    expected_delivery DATE NOT NULL,
    actual_delivery DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ordered', 'shipped', 'delivered', 'partial', 'cancelled')),
    total_amount NUMERIC(12,2) NOT NULL,
    has_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE po_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    product_id UUID REFERENCES products(id),
    description VARCHAR(300) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_location ON purchase_orders(location_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_items ON po_line_items(purchase_order_id);

-- ═══════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ═══════════════════════════════════════════════════════════
-- VENDORS (reference table)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE vendors (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    country VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    contact_email VARCHAR(200),
    contact_phone VARCHAR(30),
    tax_id VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
