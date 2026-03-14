"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const CATEGORY_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#22c55e",
];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-card-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

// ── Severity Bar Chart ──

export function SeverityChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort(
      (a, b) =>
        ["critical", "high", "medium", "low"].indexOf(a.name) -
        ["critical", "high", "medium", "low"].indexOf(b.name)
    );

  return (
    <ChartCard title="Findings by Severity">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} barSize={40}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#6b7280", fontSize: 12, textTransform: "capitalize" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={SEVERITY_COLORS[entry.name] || "#6b7280"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Category Pie Chart ──

export function CategoryChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <ChartCard title="Findings by Category">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            dataKey="value"
            stroke="none"
            paddingAngle={3}
          >
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#6b7280" }}
          />
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Findings by Type (Top 10) ──

export function FindingTypesChart({
  findings,
}: {
  findings: Array<{ type: string; severity: string }>;
}) {
  const typeCounts = new Map<string, { count: number; severity: string }>();
  for (const f of findings) {
    const existing = typeCounts.get(f.type);
    if (!existing || existing.count < 1) {
      typeCounts.set(f.type, {
        count: (existing?.count || 0) + 1,
        severity: f.severity,
      });
    } else {
      existing.count++;
    }
  }

  const chartData = [...typeCounts.entries()]
    .map(([type, { count, severity }]) => ({
      type: type.replace(/_/g, " "),
      count,
      severity,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <ChartCard title="Top Finding Types">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" barSize={18}>
          <XAxis
            type="number"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="type"
            type="category"
            width={160}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" name="Findings" radius={[0, 6, 6, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.type}
                fill={SEVERITY_COLORS[entry.severity] || "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Monthly Trend ──

export function MonthlyTrendChart({
  findings,
}: {
  findings: Array<{ description: string; severity: string }>;
}) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const monthData = months.map((month, i) => {
    const monthStr = String(i + 1).padStart(2, "0");
    const pattern = new RegExp(`2025-${monthStr}`);
    const monthFindings = findings.filter((f) => pattern.test(f.description));
    return {
      month,
      critical: monthFindings.filter((f) => f.severity === "critical").length,
      high: monthFindings.filter((f) => f.severity === "high").length,
      medium: monthFindings.filter((f) => f.severity === "medium").length,
      low: monthFindings.filter((f) => f.severity === "low").length,
    };
  });

  return (
    <ChartCard title="Monthly Trend">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={monthData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1b2332" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
          <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.2} />
          <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
          <Area type="monotone" dataKey="low" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
