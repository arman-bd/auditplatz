"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Filter, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { AuditFinding } from "@/lib/data";

const severityBadge: Record<string, string> = {
  critical: "bg-critical/15 text-critical border-critical/30",
  high: "bg-high/15 text-high border-high/30",
  medium: "bg-medium/15 text-medium border-medium/30",
  low: "bg-low/15 text-low border-low/30",
};

interface IndexedFinding extends AuditFinding {
  _index: number;
}

export function FindingsTable({ findings }: { findings: AuditFinding[] }) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"severity" | "type" | "category">("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const categories = useMemo(
    () => ["all", ...new Set(findings.map((f) => f.category))],
    [findings]
  );

  const severityOrder: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const filtered = useMemo(() => {
    let result: IndexedFinding[] = findings.map((f, i) => ({ ...f, _index: i }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.description.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q) ||
          f.recommendation.toLowerCase().includes(q)
      );
    }

    if (severityFilter !== "all") {
      result = result.filter((f) => f.severity === severityFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((f) => f.category === categoryFilter);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "severity") {
        cmp = severityOrder[a.severity] - severityOrder[b.severity];
      } else if (sortField === "type") {
        cmp = a.type.localeCompare(b.type);
      } else {
        cmp = a.category.localeCompare(b.category);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [findings, search, severityFilter, categoryFilter, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search findings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-card-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-card border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-card border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted mb-3">
        Showing {filtered.length} of {findings.length} findings
      </p>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left p-3 text-xs font-semibold text-muted uppercase tracking-wider w-12">
                #
              </th>
              <th
                className="text-left p-3 text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("severity")}
              >
                Severity
                <SortIcon field="severity" />
              </th>
              <th
                className="text-left p-3 text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("type")}
              >
                Type
                <SortIcon field="type" />
              </th>
              <th
                className="text-left p-3 text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("category")}
              >
                Category
                <SortIcon field="category" />
              </th>
              <th className="text-left p-3 text-xs font-semibold text-muted uppercase tracking-wider">
                Description
              </th>
              <th className="w-10 p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((finding) => (
              <tr
                key={finding._index}
                className="border-b border-card-border/50 hover:bg-foreground/[0.03] transition group"
              >
                <td className="p-3">
                  <Link
                    href={`/findings/${finding._index}`}
                    className="text-xs font-mono text-accent hover:underline"
                  >
                    #{finding._index + 1}
                  </Link>
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${
                      severityBadge[finding.severity]
                    }`}
                  >
                    {finding.severity}
                  </span>
                </td>
                <td className="p-3 text-sm font-mono text-foreground/80">
                  {finding.type.replace(/_/g, " ")}
                </td>
                <td className="p-3 text-sm text-foreground/70">
                  {finding.category}
                </td>
                <td className="p-3 text-sm text-foreground/70 max-w-md">
                  <Link
                    href={`/findings/${finding._index}`}
                    className="hover:text-foreground transition line-clamp-2"
                  >
                    {finding.description}
                  </Link>
                </td>
                <td className="p-3">
                  <Link
                    href={`/findings/${finding._index}`}
                    className="text-muted opacity-0 group-hover:opacity-100 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
