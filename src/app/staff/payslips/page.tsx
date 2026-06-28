"use client";

import { useMemo, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useStaffPortalStore } from "@/lib/hooks/use-staff-portal-store";

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
  const { payslips, hydrated } = useStaffPortalStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  const myPayslips = useMemo(
    () =>
      payslips
        .filter((payslip) => payslip.staffId === session?.staff_id)
        .sort((left, right) => right.monthKey.localeCompare(left.monthKey)),
    [payslips, session?.staff_id],
  );

  const selected = myPayslips.find((payslip) => payslip.id === selectedId) ?? null;
  const ytdPayslips = myPayslips.filter((payslip) => payslip.paymentStatus === "Paid" && payslip.monthKey.startsWith(String(currentYear)));

  if (!hydrated) {
    return <p className="py-12 text-center text-sm text-slate-400">Loading payslips…</p>;
  }

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
              <div className="flex justify-between px-4 py-2 font-bold text-slate-900">
                <span>Total Deductions</span>
                <span>{money(selected.totalDeductions)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
            <span className="font-bold text-emerald-800">Net Pay</span>
            <span className="text-xl font-black text-emerald-700">{money(selected.netPay)}</span>
          </div>

          <p className="text-xs text-slate-400">
            Status: {selected.paymentStatus}
            {selected.paidAt ? ` · Paid ${formatDateTime(selected.paidAt)}` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Payslips</h1>
        <p className="mt-1 text-sm text-slate-500">Your salary slips from HR payroll.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Available</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{myPayslips.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Paid YTD</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{ytdPayslips.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Net YTD</p>
          <p className="mt-1 text-lg font-black text-slate-900">
            {money(ytdPayslips.reduce((sum, p) => sum + p.netPay, 0))}
          </p>
        </div>
      </div>

      {myPayslips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No payslips published yet. They appear here after HR processes payroll.
        </div>
      ) : (
        <div className="space-y-2">
          {myPayslips.map((payslip) => (
            <button
              key={payslip.id}
              type="button"
              onClick={() => setSelectedId(payslip.id)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <div>
                <p className="font-semibold text-slate-900">{payslip.period}</p>
                <p className="text-xs text-slate-400">{payslip.paymentStatus}</p>
              </div>
              <p className="font-bold text-emerald-700">{money(payslip.netPay)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
