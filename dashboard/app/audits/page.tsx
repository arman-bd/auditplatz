"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, DollarSign, TrendingUp, ScanSearch,
  Play, Loader2, CheckCircle2,
  Sparkles, ArrowRight, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface AuditStatus {
  contracts: AuditState;
  payroll: AuditState;
  financial: AuditState;
}

interface AuditState {
  status: "idle" | "running" | "done" | "error";
  findings: number | null;
  ranAt: string | null;
  bySeverity: Record<string, number> | null;
  log: string;
}

const emptyState: AuditState = { status: "idle", findings: null, ranAt: null, bySeverity: null, log: "" };

const AUDITS = [
  {
    key: "contracts" as const,
    label: "Contract Audit",
    description: "Checks for expired contracts, missing employee contracts, lease issues, salary mismatches",
    icon: FileText,
    color: "#8b5cf6",
    checks: ["Expired employment contracts", "Missing contracts for active staff", "Expired vendor/lease contracts", "Contract vs salary mismatches"],
  },
  {
    key: "payroll" as const,
    label: "Payroll Audit",
    description: "Detects ghost employees, over/under payments, overtime violations, duplicate entries",
    icon: DollarSign,
    color: "#f97316",
    checks: ["Ghost employee payments", "Overpayment / underpayment", "Overtime rate mismatches", "Excessive overtime (ArbZG)", "Duplicate payroll entries"],
  },
  {
    key: "financial" as const,
    label: "Financial Audit",
    description: "Finds cash shortages, invoice issues, expense anomalies, suspicious sales patterns",
    icon: TrendingUp,
    color: "#22c55e",
    checks: ["Cash register discrepancies", "Recurring cash shortages", "Overdue invoices", "Sales transaction errors", "Expense report fraud", "Excessive discounts"],
  },
];

export default function AuditsPage() {
  const [auditState, setAuditState] = useState<AuditStatus>({
    contracts: { ...emptyState },
    payroll: { ...emptyState },
    financial: { ...emptyState },
  });
  const [reportStatus, setReportStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const router = useRouter();

  const runAudit = async (type: "contracts" | "payroll" | "financial") => {
    setAuditState((prev) => ({
      ...prev,
      [type]: { ...prev[type], status: "running", log: "" },
    }));

    try {
      const res = await fetch(`/api/audit/${type}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Parse findings count from log
        const match = data.log?.match(/(\d+) findings/);
        const findings = match ? parseInt(match[1]) : 0;
        setAuditState((prev) => ({
          ...prev,
          [type]: { status: "done", findings, ranAt: new Date().toISOString(), bySeverity: null, log: data.log || "" },
        }));
      } else {
        setAuditState((prev) => ({
          ...prev,
          [type]: { ...prev[type], status: "error", log: data.error || "Failed" },
        }));
      }
    } catch (err) {
      setAuditState((prev) => ({
        ...prev,
        [type]: { ...prev[type], status: "error", log: `${err}` },
      }));
    }
  };

  const runAll = async () => {
    await Promise.all(AUDITS.map((a) => runAudit(a.key)));
    // Also generate combined findings
    try {
      await fetch("/api/audit/all", { method: "POST" });
    } catch {}
  };

  const generateReport = async () => {
    setReportStatus("running");
    try {
      // First ensure combined findings exist
      await fetch("/api/audit/all", { method: "POST" });
      const res = await fetch("/api/report", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setReportStatus("done");
        router.push("/report");
      } else {
        setReportStatus("error");
      }
    } catch {
      setReportStatus("error");
    }
  };

  const anyDone = Object.values(auditState).some((s) => s.status === "done");
  const allRunning = Object.values(auditState).every((s) => s.status === "running");
  const totalFindings = Object.values(auditState).reduce((sum, s) => sum + (s.findings || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Run Audits</h1>
        <p className="text-sm text-muted mt-1">
          Choose which audits to run against the company database
        </p>
      </div>

      {/* Run All */}
      <div className="flex items-center gap-4">
          <button
            onClick={runAll}
            disabled={allRunning}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all disabled:opacity-50"
          >
            {allRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            {allRunning ? "Running All..." : "Run All Audits"}
          </button>
          {anyDone && (
            <span className="text-sm text-muted">
              {totalFindings} total findings
            </span>
          )}
        </div>

      {/* Audit Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {AUDITS.map((audit) => {
            const state = auditState[audit.key];
            return (
              <div
                key={audit.key}
                className="bg-card border border-card-border rounded-2xl p-5 flex flex-col hover:border-white/10 transition-all"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${audit.color}20` }}
                  >
                    <audit.icon className="w-5 h-5" style={{ color: audit.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{audit.label}</h3>
                    <p className="text-xs text-muted">{audit.description}</p>
                  </div>
                </div>

                {/* What it checks */}
                <div className="flex-1 mb-4">
                  <ul className="space-y-1.5">
                    {audit.checks.map((check) => (
                      <li key={check} className="flex items-center gap-2 text-xs text-foreground/60">
                        <span className="w-1 h-1 rounded-full bg-foreground/30 shrink-0" />
                        {check}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Result */}
                {state.status === "done" && state.findings !== null && (
                  <div className="mb-4 p-3 bg-background rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{state.findings}</span>
                      <span className="text-xs text-muted">findings</span>
                    </div>
                    {state.log && (
                      <pre className="mt-2 text-xs text-foreground/40 font-mono whitespace-pre-wrap">{state.log}</pre>
                    )}
                  </div>
                )}

                {state.status === "error" && (
                  <div className="mb-4 p-3 bg-critical/5 border border-critical/20 rounded-xl">
                    <p className="text-xs text-critical">{state.log || "Audit failed"}</p>
                  </div>
                )}

                {/* Run Button */}
                <button
                  onClick={() => runAudit(audit.key)}
                  disabled={state.status === "running"}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    state.status === "running"
                      ? "bg-foreground/5 text-muted cursor-wait"
                      : state.status === "done"
                      ? "bg-low/10 text-low border border-low/20 hover:bg-low/20"
                      : "bg-foreground/5 border border-card-border text-foreground hover:bg-foreground/10"
                  }`}
                >
                  {state.status === "running" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : state.status === "done" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {state.status === "running"
                    ? "Running..."
                    : state.status === "done"
                    ? "Re-run"
                    : "Run Audit"}
                </button>
              </div>
            );
          })}
        </div>

      {/* Post-Audit Actions */}
      {anyDone && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Next Steps
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/findings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-foreground/5 border border-card-border hover:bg-foreground/10 transition"
            >
              <AlertTriangle className="w-4 h-4" />
              View Findings ({totalFindings})
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={generateReport}
              disabled={reportStatus === "running"}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                reportStatus === "running"
                  ? "bg-accent/20 text-accent cursor-wait"
                  : reportStatus === "done"
                  ? "bg-low/15 text-low"
                  : "bg-accent text-white hover:bg-accent/90 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              }`}
            >
              {reportStatus === "running" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : reportStatus === "done" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {reportStatus === "running"
                ? "Generating AI Report..."
                : reportStatus === "done"
                ? "Report Ready"
                : "Generate AI Report"}
            </button>
            {reportStatus === "done" && (
              <Link
                href="/report"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-accent hover:underline"
              >
                View Report <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
