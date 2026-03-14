import { getCombinedFindings } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  Shield,
  Lightbulb,
  FileSearch,
} from "lucide-react";

export const dynamic = "force-dynamic";

const severityConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "bg-critical/10", text: "text-critical", border: "border-critical/30", label: "Critical" },
  high: { bg: "bg-high/10", text: "text-high", border: "border-high/30", label: "High" },
  medium: { bg: "bg-medium/10", text: "text-medium", border: "border-medium/30", label: "Medium" },
  low: { bg: "bg-low/10", text: "text-low", border: "border-low/30", label: "Low" },
};

export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const index = parseInt(id, 10);
  const findings = getCombinedFindings();

  if (isNaN(index) || index < 0 || index >= findings.length) {
    notFound();
  }

  const finding = findings[index];
  const sev = severityConfig[finding.severity] || severityConfig.medium;

  // Find related findings (same type or same entityId)
  const related = findings
    .map((f, i) => ({ ...f, _index: i }))
    .filter(
      (f, i) =>
        i !== index &&
        (f.type === finding.type || f.entityId === finding.entityId)
    )
    .slice(0, 5);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/findings" className="hover:text-foreground transition">
          Findings
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">#{index + 1}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${sev.bg} flex items-center justify-center shrink-0`}>
          <AlertTriangle className={`w-6 h-6 ${sev.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-full border border-card-border bg-foreground/5 text-foreground/70 font-mono">
              #{index + 1}
            </span>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}
            >
              {sev.label}
            </span>
            <span className="text-xs text-muted">{finding.category}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {finding.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </h1>
        </div>
      </div>

      {/* Description */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="w-4 h-4 text-muted" />
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Description
          </h2>
        </div>
        <p className="text-sm text-foreground/85 leading-relaxed">
          {finding.description}
        </p>
      </div>

      {/* Recommendation */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Recommendation
          </h2>
        </div>
        <p className="text-sm text-accent/85 leading-relaxed">
          {finding.recommendation}
        </p>
      </div>

      {/* Evidence */}
      {finding.evidence && Object.keys(finding.evidence).length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-muted" />
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Evidence
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {Object.entries(finding.evidence).map(([key, val]) => (
              <div key={key} className="border-l-2 border-card-border pl-3">
                <dt className="text-xs text-muted capitalize mb-0.5">
                  {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                </dt>
                <dd className="text-sm text-foreground/85 break-all">
                  {typeof val === "number"
                    ? val.toLocaleString("de-DE", { maximumFractionDigits: 2 })
                    : Array.isArray(val)
                    ? val.join(", ")
                    : String(val ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
          Metadata
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs text-muted mb-0.5">Finding #</dt>
            <dd className="text-sm font-mono">{index + 1}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-0.5">Severity</dt>
            <dd className={`text-sm font-semibold ${sev.text}`}>{sev.label}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-0.5">Category</dt>
            <dd className="text-sm">{finding.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-0.5">Entity ID</dt>
            <dd className="text-sm font-mono text-foreground/60 truncate">{finding.entityId}</dd>
          </div>
        </div>
      </div>

      {/* Related Findings */}
      {related.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            Related Findings
          </h2>
          <div className="space-y-2">
            {related.map((r) => {
              const rs = severityConfig[r.severity] || severityConfig.medium;
              return (
                <Link
                  key={r._index}
                  href={`/findings/${r._index}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/[0.03] transition group"
                >
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${rs.bg} ${rs.text}`}>
                    {r.severity}
                  </span>
                  <span className="text-sm text-foreground/70 group-hover:text-foreground transition truncate flex-1">
                    {r.description}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Back */}
      <Link
        href="/findings"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all findings
      </Link>
    </div>
  );
}
