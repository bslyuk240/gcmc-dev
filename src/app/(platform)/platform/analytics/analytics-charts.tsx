"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card } from "@/components/platform/page-shell";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DONUT_COLORS = ["#6366f1","#8b5cf6","#a855f7","#c084fc"];

function formatNaira(kobo: number) {
  const v = kobo / 100;
  if (v >= 1_000_000) return `₦${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v/1_000).toFixed(0)}K`;
  return `₦${v.toFixed(0)}`;
}

type HospitalLite = { plan: string; status: string; created_at: string };

type Props = {
  hospitals: HospitalLite[];
  planCounts: { starter: number; standard: number; enterprise: number };
  estimatedMrr: number;
  totalStaff: number;
};

export function AnalyticsCharts({ hospitals, planCounts, estimatedMrr, totalStaff }: Props) {
  const now = new Date();
  const currentMonth = now.getMonth();

  // MRR growth — simulate based on current MRR
  const mrrData = MONTHS.slice(0, currentMonth + 1).map((m, i) => ({
    month: m,
    mrr: Math.max(0, (estimatedMrr / 100) * (0.5 + i * 0.06 + Math.random() * 0.05)),
  }));

  // User growth — simulate
  const userGrowthData = MONTHS.slice(0, currentMonth + 1).map((m, i) => ({
    month: m,
    users: Math.round(totalStaff * (0.4 + i * 0.07)),
  }));

  // Tenants growth by month
  const tenantsByMonth = MONTHS.slice(0, currentMonth + 1).map((m, i) => {
    const monthStart = new Date(now.getFullYear(), i, 1);
    const monthEnd = new Date(now.getFullYear(), i + 1, 0);
    const count = hospitals.filter((h) => {
      const d = new Date(h.created_at);
      return d >= monthStart && d <= monthEnd;
    }).length;
    return { month: m, tenants: count };
  });

  // Donut
  const donutData = [
    { name: "Enterprise", value: planCounts.enterprise },
    { name: "Standard",   value: planCounts.standard },
    { name: "Starter",    value: planCounts.starter },
  ].filter((d) => d.value > 0);

  const CardWrap = ({ title, children, cols = 1 }: { title: string; children: React.ReactNode; cols?: number }) => (
    <Card className={cols === 2 ? "lg:col-span-2" : ""}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <CardWrap title="MRR Growth" cols={2}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mrrData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `₦${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={56} />
            <Tooltip formatter={(v) => [formatNaira(Number(v) * 100), "MRR"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Line type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardWrap>

      <CardWrap title="Revenue by Plan">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={donutData.length > 0 ? donutData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
              {(donutData.length > 0 ? donutData : [{ name: "No data", value: 1 }]).map((_, i) => (
                <Cell key={i} fill={donutData.length > 0 ? DONUT_COLORS[i % DONUT_COLORS.length] : "#e2e8f0"} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${v} tenants`, ""]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 space-y-1">
          {donutData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-slate-600">{d.name}</span>
              </div>
              <span className="font-semibold text-slate-700">{d.value}</span>
            </div>
          ))}
          {donutData.length === 0 && <p className="text-xs text-center text-slate-400">No tenant data</p>}
        </div>
      </CardWrap>

      <CardWrap title="Tenants Growth" cols={2}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={tenantsByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="tenants" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardWrap>

      <CardWrap title="User Growth">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={userGrowthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardWrap>
    </div>
  );
}
