"use client";

import { useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { printReceipt, downloadReceiptHTML } from "@/lib/utils/print-receipt";

type Payslip = {
  id: string;
  period: string;
  month: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: "Paid" | "Processing";
  paidOn?: string;
};

const MOCK_PAYSLIPS: Payslip[] = [
  { id: "PS-2026-03", period: "March 2026",    month: "2026-03", grossPay: 12500, deductions: 1875, netPay: 10625, status: "Processing" },
  { id: "PS-2026-02", period: "February 2026", month: "2026-02", grossPay: 12500, deductions: 1875, netPay: 10625, status: "Paid", paidOn: "Feb 28, 2026" },
  { id: "PS-2026-01", period: "January 2026",  month: "2026-01", grossPay: 12500, deductions: 1875, netPay: 10625, status: "Paid", paidOn: "Jan 31, 2026" },
  { id: "PS-2025-12", period: "December 2025", month: "2025-12", grossPay: 13750, deductions: 2063, netPay: 11688, status: "Paid", paidOn: "Dec 31, 2025" },
];

const DEDUCTION_BREAKDOWN = [
  { label: "Income Tax (PAYE)", pct: 10 },
  { label: "Pension (Employee)", pct: 5 },
];

export default function PayslipsPage() {
  const session  = useHMSSession();
  const [selected, setSelected] = useState<Payslip | null>(null);

  function fmt(n: number) {
    return `₦${n.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  }

  if (selected) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-sm font-semibold text-indigo-600">← Back</button>
          <h1 className="text-xl font-black text-slate-900">Payslip — {selected.period}</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          {/* Header */}
          <div className="border-b border-slate-100 pb-3">
            <p className="font-bold text-slate-900">{session?.full_name ?? "Staff Member"}</p>
            <p className="text-sm text-slate-400">{selected.period}</p>
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Earnings</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700">Basic Salary</span>
              <span className="font-bold text-slate-900">{fmt(selected.grossPay)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Deductions</p>
            {DEDUCTION_BREAKDOWN.map((d) => {
              const amount = Math.round(selected.grossPay * d.pct / 100);
              return (
                <div key={d.label} className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{d.label} ({d.pct}%)</span>
                  <span className="text-red-600">-{fmt(amount)}</span>
                </div>
              );
            })}
          </div>

          {/* Net */}
          <div className="rounded-xl bg-indigo-50 px-4 py-3 flex justify-between items-center">
            <p className="font-bold text-indigo-800">Net Pay</p>
            <p className="text-xl font-black text-indigo-700">{fmt(selected.netPay)}</p>
          </div>

          {selected.status === "Paid" && (
            <p className="text-center text-xs text-slate-400">Paid on {selected.paidOn}</p>
          )}
          {selected.status === "Processing" && (
            <p className="text-center text-xs text-amber-600 font-semibold">Processing — payment pending</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => printReceipt({
                title: "Payslip",
                subtitle: selected.period,
                refNumber: selected.id,
                lines: [
                  { label: "Employee",   value: session?.full_name ?? "Staff Member" },
                  { label: "Period",     value: selected.period },
                  { label: "Gross Pay",  value: fmt(selected.grossPay) },
                  { label: "Deductions", value: fmt(selected.deductions), bold: false },
                  { label: "Status",     value: selected.status.toUpperCase(), bold: true },
                  ...(selected.paidOn ? [{ label: "Paid On", value: selected.paidOn }] : []),
                ],
                total: { label: "Net Pay", value: fmt(selected.netPay) },
                copyLabel: "EMPLOYEE COPY",
              })}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              🖨 Print
            </button>
            <button
              onClick={() => downloadReceiptHTML({
                title: "Payslip",
                subtitle: selected.period,
                refNumber: selected.id,
                lines: [
                  { label: "Employee",   value: session?.full_name ?? "Staff Member" },
                  { label: "Period",     value: selected.period },
                  { label: "Gross Pay",  value: fmt(selected.grossPay) },
                  { label: "Deductions", value: fmt(selected.deductions) },
                  { label: "Status",     value: selected.status.toUpperCase(), bold: true },
                ],
                total: { label: "Net Pay", value: fmt(selected.netPay) },
                copyLabel: "EMPLOYEE COPY",
              }, `Payslip_${selected.id}`)}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              ⬇ Download
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Payslips</h1>
        <p className="mt-1 text-sm text-slate-500">View and download your monthly salary statements.</p>
      </div>

      {/* YTD summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Year to Date (2026)</p>
        <div className="mt-2 flex justify-between text-sm">
          <div><p className="text-slate-500">Gross Paid</p><p className="font-bold text-slate-900">{fmt(MOCK_PAYSLIPS.filter((p) => p.status === "Paid" && p.month.startsWith("2026")).reduce((s, p) => s + p.grossPay, 0))}</p></div>
          <div><p className="text-slate-500">Total Deductions</p><p className="font-bold text-red-600">{fmt(MOCK_PAYSLIPS.filter((p) => p.status === "Paid" && p.month.startsWith("2026")).reduce((s, p) => s + p.deductions, 0))}</p></div>
          <div><p className="text-slate-500">Net Received</p><p className="font-bold text-emerald-700">{fmt(MOCK_PAYSLIPS.filter((p) => p.status === "Paid" && p.month.startsWith("2026")).reduce((s, p) => s + p.netPay, 0))}</p></div>
        </div>
      </div>

      {/* Payslip list */}
      <div className="space-y-2">
        {MOCK_PAYSLIPS.map((p) => (
          <button key={p.id} onClick={() => setSelected(p)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-200 hover:bg-indigo-50 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{p.period}</p>
                <p className="text-sm text-slate-500">{fmt(p.netPay)} net</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                {p.paidOn && <p className="mt-1 text-[10px] text-slate-400">{p.paidOn}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-slate-300">
        Contact Accounts for queries about your salary.
      </p>
    </div>
  );
}
