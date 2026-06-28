"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateRevenueData(mrrKobo: number) {
  const base = mrrKobo / 100;
  return MONTHS.slice(0, new Date().getMonth() + 1).map((m, i) => ({
    month: m,
    revenue: Math.max(0, base * (0.6 + i * 0.05 + Math.random() * 0.1)),
  }));
}

const DONUT_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc"];

type Props = {
  planCounts: { starter: number; standard: number; enterprise: number };
  estimatedMrr: number;
  collectedThisMonth: number;
  chartType?: "line" | "donut";
};

function formatNaira(kobo: number) {
  const v = kobo / 100;
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
  return `₦${v.toFixed(0)}`;
}

export function DashboardCharts({ planCounts, estimatedMrr, collectedThisMonth, chartType }: Props) {
  if (chartType === "donut") {
    const donutData = [
      { name: "Enterprise", value: planCounts.enterprise },
      { name: "Standard",   value: planCounts.standard },
      { name: "Starter",    value: planCounts.starter },
    ].filter((d) => d.value > 0);

    if (donutData.length === 0) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No tenants yet
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {donutData.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${v} tenants`, ""]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 space-y-1.5 w-full">
          {donutData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-slate-600">{d.name} Plan</span>
              </div>
              <span className="font-semibold text-slate-700">{d.value} ({Math.round(d.value / donutData.reduce((s,x)=>s+x.value,0)*100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: line chart
  const data = generateRevenueData(estimatedMrr);

  return (
    <div>
      <div className="mb-4 flex items-center gap-6">
        <div>
          <p className="text-xs text-slate-500">Est. MRR</p>
          <p className="text-lg font-bold text-slate-800">{formatNaira(estimatedMrr)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Collected this month</p>
          <p className="text-lg font-bold text-emerald-600">{formatNaira(collectedThisMonth)}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatNaira(Number(v) * 100)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            formatter={(v) => [formatNaira(Number(v) * 100), "Revenue"]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ fill: "#6366f1", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
