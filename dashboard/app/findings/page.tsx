import { getAllAuditResults, getCombinedFindings } from "@/lib/data";
import { FindingsTable } from "@/components/findings-table";
import { AlertTriangle, FileText, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function FindingsPage() {
  const results = getAllAuditResults();
  const allFindings = getCombinedFindings();

  const hasAny = allFindings.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="w-12 h-12 text-muted" />
        <div className="text-center">
          <h2 className="text-lg font-bold mb-1">No Findings Yet</h2>
          <p className="text-muted text-sm mb-4">Run audits first to see findings here.</p>
          <Link
            href="/audits"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition"
          >
            Go to Audits
          </Link>
        </div>
      </div>
    );
  }

  // Summary per audit
  const auditCards = [
    { key: "contracts", label: "Contracts", icon: FileText, color: "#8b5cf6", result: results.contracts },
    { key: "payroll", label: "Payroll", icon: DollarSign, color: "#f97316", result: results.payroll },
    { key: "financial", label: "Financial", icon: TrendingUp, color: "#22c55e", result: results.financial },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Findings Explorer</h1>
        <p className="text-sm text-muted mt-1">
          {allFindings.length} findings across {auditCards.filter((a) => a.result).length} audit(s)
        </p>
      </div>

      {/* Per-Audit Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {auditCards.map((a) => (
          <div key={a.key} className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <a.icon className="w-4 h-4" style={{ color: a.color }} />
              <span className="text-sm font-semibold">{a.label}</span>
            </div>
            {a.result ? (
              <div>
                <span className="text-2xl font-bold">{a.result.summary.total}</span>
                <span className="text-xs text-muted ml-2">findings</span>
                <div className="flex gap-2 mt-2">
                  {a.result.summary.bySeverity?.critical && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-critical/15 text-critical">
                      {a.result.summary.bySeverity.critical} critical
                    </span>
                  )}
                  {a.result.summary.bySeverity?.high && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-high/15 text-high">
                      {a.result.summary.bySeverity.high} high
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-1">
                  {new Date(a.result.ranAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Not run yet</p>
            )}
          </div>
        ))}
      </div>

      <FindingsTable findings={allFindings} />
    </div>
  );
}
