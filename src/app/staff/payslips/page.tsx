"use client";

import { useMemo, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useHRStore } from "@/lib/hooks/use-hr-store";

function money(value: number) {
  return `NGN ${value.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function PayslipsPage() {
  const session = useHMSSession();
  const { generatedPayslips } = useHRStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const myPayslips = useMemo(
    () =>
      generatedPayslips
        .filter((payslip) => payslip.staffId === session?.staff_id)
        .sort((left, right) => right.monthKey.localeCompare(left.monthKey)),
    [generatedPayslips, session?.staff_id],
  );

  const selected = myPayslips.find((payslip) => payslip.id === selectedId) ?? null;
  const ytdPayslips = myPayslips.filter((payslip) => payslip.paymentStatus === "Paid" && payslip.monthKey.startsWith("2026"));

  if (selected) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="text-sm font-semibold text-indigo-600">Back</button>
          <h1 className="text-xl font-black text-slate-900">Payslip - {selected.period}</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <p className="font-bold text-slate-900">{selected.staffName}</p>
            <p className="text-sm text-slate-400">{selected.role} - {selected.department}</p>
            <p className="text-xs text-slate-400">{selected.period}</p>
          </div>

          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
            <div>
              <p className="text-slate-400">Bank</p>
              <p className="font-semibold text-slate-900">{selected.bankName ?? "Salary Bank"} {selected.bankAccount ?? ""}</p>
            </div>
            <div>
              <p className="text-slate-400">Tax ID</p>
              <p className="font-semibold text-slate-900">{selected.taxId ?? "Pending"}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Earnings</p>
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {selected.earnings.map((item) => (
                <div key={item.label} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="font-semibold text-slate-900">{money(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2 font-bold text-slate-900">
                <span>Gross Pay</span>
                <span>{money(selected.grossPay)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Deductions</p>
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {selected.deductions.map((item) => (
                <div key={item.label} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="font-semibold text-red-600">{money(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2 font-bold text-red-700">
                <span>Total Deductions</span>
                <span>{money(selected.totalDeductions)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50 px-4 py-3 flex justify-between items-center">
            <p className="font-bold text-indigo-800">Net Pay</p>
            <p className="text-xl font-black text-indigo-700">{money(selected.netPay)}</p>
          </div>

          <p className={`text-center text-xs font-semibold ${selected.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600"}`}>
            {selected.paymentStatus === "Paid"
              ? `Paid${selected.paidAt ? ` on ${formatDateTime(selected.paidAt)}` : ""}`
              : `${selected.workflowStatus} - payment pending`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Payslips</h1>
        <p className="mt-1 text-sm text-slate-500">View salary slips generated for your staff portal account.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Year to Date (2026)</p>
        <div className="mt-2 flex justify-between text-sm">
          <div><p className="text-slate-500">Gross Paid</p><p className="font-bold text-slate-900">{money(ytdPayslips.reduce((sum, payslip) => sum + payslip.grossPay, 0))}</p></div>
          <div><p className="text-slate-500">Total Deductions</p><p className="font-bold text-red-600">{money(ytdPayslips.reduce((sum, payslip) => sum + payslip.totalDeductions, 0))}</p></div>
          <div><p className="text-slate-500">Net Received</p><p className="font-bold text-emerald-700">{money(ytdPayslips.reduce((sum, payslip) => sum + payslip.netPay, 0))}</p></div>
        </div>
      </div>

      <div className="space-y-2">
        {myPayslips.map((payslip) => (
          <button
            key={payslip.id}
            onClick={() => setSelectedId(payslip.id)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-200 hover:bg-indigo-50 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{payslip.period}</p>
                <p className="text-sm text-slate-500">{money(payslip.netPay)} net</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${payslip.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {payslip.paymentStatus === "Paid" ? "Paid" : payslip.workflowStatus}
                </span>
                <p className="mt-1 text-[10px] text-slate-400">{payslip.department}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {myPayslips.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-400">
          HR has not generated any payslips for your account yet.
        </div>
      )}
    </div>
  );
}
