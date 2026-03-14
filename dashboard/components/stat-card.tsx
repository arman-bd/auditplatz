import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "accent" | "critical" | "high" | "medium" | "low";
  trend?: { value: string; up: boolean };
}

const colorMap = {
  accent: "bg-accent/15 text-accent",
  critical: "bg-critical/15 text-critical",
  high: "bg-high/15 text-high",
  medium: "bg-medium/15 text-medium",
  low: "bg-low/15 text-low",
};

const glowMap = {
  accent: "shadow-[0_0_30px_rgba(59,130,246,0.08)]",
  critical: "shadow-[0_0_30px_rgba(239,68,68,0.08)]",
  high: "shadow-[0_0_30px_rgba(249,115,22,0.08)]",
  medium: "shadow-[0_0_30px_rgba(234,179,8,0.08)]",
  low: "shadow-[0_0_30px_rgba(34,197,94,0.08)]",
};

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color = "accent",
  trend,
}: StatCardProps) {
  return (
    <div
      className={`bg-card border border-card-border rounded-2xl p-5 hover:border-accent/30 transition-all duration-300 ${glowMap[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wider">
            {label}
          </p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-2 font-medium ${
                trend.up ? "text-critical" : "text-low"
              }`}
            >
              {trend.up ? "+" : "-"}{trend.value}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
