#!/bin/bash
set -e

CONTAINER="business-auditor-db"
DB="business_auditor"
USER="mh_admin"

echo "═══════════════════════════════════════════════════════════"
echo "  Loading data into PostgreSQL via COPY (volume mount)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verify staging dir is mounted
docker exec "$CONTAINER" ls /staging/locations.tsv > /dev/null 2>&1 || {
  echo "ERROR: /staging not mounted. Run 'npx tsx src/load-db.ts' to generate staging files, then restart containers."
  exit 1
}

load_table() {
  local file=$1
  local table=$2
  local columns=$3
  echo -n "  $table..."
  local result=$(docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -t -A -c "COPY $table ($columns) FROM '/staging/$file'" 2>&1)
  echo " $result"
}

START=$(date +%s)

# Core entities (FK dependency order)
load_table "locations.tsv" "locations" "id, code, type, name, city, address, postal_code, state, open_date, is_active"
load_table "employees_managers.tsv" "employees" "id, employee_number, first_name, last_name, email, phone, date_of_birth, hire_date, termination_date, location_id, department, job_title, employment_type, annual_salary, bank_iban, tax_id, social_security_number, manager_id, is_active"
load_table "employees_rest.tsv" "employees" "id, employee_number, first_name, last_name, email, phone, date_of_birth, hire_date, termination_date, location_id, department, job_title, employment_type, annual_salary, bank_iban, tax_id, social_security_number, manager_id, is_active"
load_table "products.tsv" "products" "id, sku, name, category, unit_price, cost_price, is_active"
load_table "vendors.tsv" "vendors" "id, name, country, category, contact_email, contact_phone, tax_id, is_active"

# Transactional data
load_table "payroll.tsv" "payroll" "id, employee_id, period_start, period_end, pay_date, base_pay, overtime_hours, overtime_pay, bonus, deductions, tax_withheld, social_security, health_insurance, gross_pay, net_pay, has_error, error_type"
load_table "time_entries.tsv" "time_entries" "id, employee_id, date, clock_in, clock_out, scheduled_hours, actual_hours, overtime_hours, break_minutes, status, has_error, error_type"
load_table "sales.tsv" "sales_transactions" "id, transaction_number, location_id, employee_id, date, time, subtotal, tax_amount, discount, total, payment_method, has_error, error_type"
load_table "sales_items.tsv" "sales_items" "transaction_id, product_id, product_name, category, sku, quantity, unit_price, line_total"
load_table "cash_recon.tsv" "cash_reconciliations" "id, location_id, date, register_number, expected_cash, actual_cash, variance, reconciled_by, notes, has_error, error_type"
load_table "inventory.tsv" "inventory_records" "id, product_id, location_id, date, type, quantity_change, running_balance, reference, has_error, error_type"
load_table "contracts.tsv" "contracts" "id, contract_number, type, party_name, party_id, start_date, end_date, value, currency, status, auto_renew, terms, has_error, error_type"
load_table "invoices.tsv" "invoices" "id, invoice_number, type, vendor_id, customer_id, issue_date, due_date, paid_date, amount, tax_amount, total_amount, status, has_error, error_type"
load_table "invoice_items.tsv" "invoice_line_items" "invoice_id, description, quantity, unit_price, total"
load_table "expenses.tsv" "expense_reports" "id, employee_id, submitted_date, approved_date, approved_by, status, total_amount, has_error, error_type"
load_table "expense_items.tsv" "expense_items" "expense_report_id, category, description, date, amount, receipt_attached"
load_table "purchase_orders.tsv" "purchase_orders" "id, po_number, vendor_id, location_id, order_date, expected_delivery, actual_delivery, status, total_amount, has_error, error_type"
load_table "po_items.tsv" "po_line_items" "purchase_order_id, product_id, description, quantity, unit_cost, total"
load_table "audit_logs.tsv" "audit_logs" "id, timestamp, user_id, action, entity_type, entity_id, old_value, new_value, ip_address"

END=$(date +%s)
ELAPSED=$((END - START))

echo ""
echo "─── Verification ───"
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
SELECT 'locations' AS table_name, COUNT(*) AS rows FROM locations
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL SELECT 'payroll', COUNT(*) FROM payroll
UNION ALL SELECT 'time_entries', COUNT(*) FROM time_entries
UNION ALL SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL SELECT 'sales_items', COUNT(*) FROM sales_items
UNION ALL SELECT 'cash_reconciliations', COUNT(*) FROM cash_reconciliations
UNION ALL SELECT 'inventory_records', COUNT(*) FROM inventory_records
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'invoice_line_items', COUNT(*) FROM invoice_line_items
UNION ALL SELECT 'expense_reports', COUNT(*) FROM expense_reports
UNION ALL SELECT 'expense_items', COUNT(*) FROM expense_items
UNION ALL SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL SELECT 'po_line_items', COUNT(*) FROM po_line_items
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
ORDER BY rows DESC;
"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Done in ${ELAPSED}s"
echo "═══════════════════════════════════════════════════════════"
