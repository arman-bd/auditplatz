import {
  Users, Building2, FileText, DollarSign, ShoppingCart,
  Receipt, Package, Truck, Bot, Database, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getDBStats, getLocationBreakdown, getDepartmentBreakdown, hasData } from "@/lib/data";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const dataExists = await hasData();

  if (!dataExists) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(91,160,150,0.15)" }}>
          <Database className="w-10 h-10" style={{ color: "#5ba096" }} />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">No Data Found</h1>
          <p className="text-muted text-sm mb-4">
            The database is empty. Run <code className="bg-foreground/5 px-1.5 py-0.5 rounded text-foreground/60">npm run generate</code> to seed the database first.
          </p>
        </div>
      </div>
    );
  }

  const [stats, locations, departments] = await Promise.all([
    getDBStats(),
    getLocationBreakdown(),
    getDepartmentBreakdown(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company Overview</h1>
          <p className="text-sm text-muted mt-1">
            M&H Wearables GmbH &middot; FY 2025 Data Explorer
          </p>
        </div>
        <Link
          href="/audits"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all"
        >
          Run Audits
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`€${(Number(stats.total_revenue) / 1e6).toFixed(1)}M`}
          subtitle={`${Number(stats.sales_count).toLocaleString()} transactions`}
          icon={DollarSign}
          color="accent"
        />
        <StatCard
          label="Total Payroll"
          value={`€${(Number(stats.total_payroll) / 1e6).toFixed(1)}M`}
          subtitle={`${Number(stats.payroll_count).toLocaleString()} records`}
          icon={Receipt}
          color="medium"
        />
        <StatCard
          label="Employees"
          value={stats.active_employees}
          subtitle={`${stats.terminated_employees} terminated`}
          icon={Users}
          color="low"
        />
        <StatCard
          label="Locations"
          value={stats.location_count}
          subtitle={`${stats.store_count} retail stores + HQ`}
          icon={Building2}
          color="accent"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat icon={FileText} label="Contracts" value={stats.contract_count} />
        <MiniStat icon={Receipt} label="Invoices" value={stats.invoice_count} />
        <MiniStat icon={ShoppingCart} label="Expenses" value={stats.expense_count} />
        <MiniStat icon={Package} label="Products" value={stats.product_count} />
        <MiniStat icon={Truck} label="Vendors" value={stats.vendor_count} />
        <MiniStat icon={DollarSign} label="Cash Reports" value={stats.cash_report_count} />
      </div>

      {/* Locations */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Locations
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left p-3 text-xs font-semibold text-muted uppercase">Code</th>
                <th className="text-left p-3 text-xs font-semibold text-muted uppercase">City</th>
                <th className="text-left p-3 text-xs font-semibold text-muted uppercase">Type</th>
                <th className="text-right p-3 text-xs font-semibold text-muted uppercase">Employees</th>
                <th className="text-right p-3 text-xs font-semibold text-muted uppercase">Revenue</th>
                <th className="text-right p-3 text-xs font-semibold text-muted uppercase">Cash Issues</th>
                <th className="text-right p-3 text-xs font-semibold text-muted uppercase">Sales Errors</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc: any) => (
                <tr key={loc.id} className="border-b border-card-border/50 hover:bg-foreground/[0.02]">
                  <td className="p-3 text-sm font-mono text-foreground/60">{loc.code}</td>
                  <td className="p-3 text-sm font-medium">{loc.city}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${loc.type === "headquarters" ? "bg-accent/15 text-accent" : "bg-foreground/5 text-foreground/60"}`}>
                      {loc.type === "headquarters" ? "HQ" : "Store"}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-right">{loc.employee_count}</td>
                  <td className="p-3 text-sm text-right font-mono">
                    {loc.type === "retail_store"
                      ? `€${Number(loc.total_revenue).toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
                      : "—"}
                  </td>
                  <td className="p-3 text-sm text-right">
                    {loc.cash_shortage_days > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${loc.cash_shortage_days >= 3 ? "bg-critical/15 text-critical" : "bg-medium/15 text-medium"}`}>
                        {loc.cash_shortage_days} days
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="p-3 text-sm text-right">
                    {loc.sales_errors > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-high/15 text-high">{loc.sales_errors}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Departments */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Departments
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {departments.map((d: any) => (
            <div key={d.department} className="border border-card-border rounded-xl p-3">
              <p className="text-sm font-medium truncate">{d.department}</p>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-lg font-bold">{d.active}</span>
                <span className="text-xs text-muted">
                  avg €{Math.round(Number(d.avg_salary)).toLocaleString()}/yr
                </span>
              </div>
              {d.count !== d.active && (
                <p className="text-xs text-muted mt-1">{d.count - d.active} terminated</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-3 text-center">
      <Icon className="w-4 h-4 text-muted mx-auto mb-1.5" />
      <p className="text-lg font-bold">{Number(value).toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
