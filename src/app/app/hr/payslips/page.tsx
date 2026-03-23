"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollEntryBreakdown } from "@/components/payroll/payroll-entry-breakdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { buildPayrollEntryFromPayslip } from "@/lib/payroll/utils";
import type { GeneratedPayslip } from "@/lib/data/hr-store";

function money(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

export default function HRPayslipsPage() {
  const { generatedPayslips } = useHRStore();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GeneratedPayslip | null>(null);

  const filtered = useMemo(
    () =>
      generatedPayslips.filter((payslip) => {
        const haystack = `${payslip.staffName} ${payslip.department} ${payslip.role} ${payslip.period}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [generatedPayslips, search],
  );

  const totals = useMemo(
    () => ({
      gross: filtered.reduce((sum, payslip) => sum + payslip.grossPay, 0),
      deductions: filtered.reduce((sum, payslip) => sum + payslip.totalDeductions, 0),
      net: filtered.reduce((sum, payslip) => sum + payslip.netPay, 0),
    }),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generated Payslips"
        description="Review all staff payslips created from payroll management and published to the staff portal."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Staff, department, role, or period"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{filtered.length}</span> payslips
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Payslips", value: filtered.length, color: "text-slate-900" },
          { label: "Gross Value", value: money(totals.gross), color: "text-violet-700" },
          { label: "Deductions", value: money(totals.deductions), color: "text-rose-700" },
          { label: "Net Value", value: money(totals.net), color: "text-emerald-700" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Published Payslips</p>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((payslip) => (
            <div key={payslip.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{payslip.staffName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{payslip.role}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    payslip.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {payslip.paymentStatus}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Department</p>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">{payslip.department}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Period</p>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">{payslip.period}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Gross</p>
                  <div className="mt-0.5 text-xs font-semibold text-slate-800">{money(payslip.grossPay)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Net</p>
                  <div className="mt-0.5 text-xs font-semibold text-emerald-700">{money(payslip.netPay)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{payslip.workflowStatus}</span>
                <Button size="sm" variant="outline" onClick={() => setSelected(payslip)}>View</Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-400">
              No generated payslips found.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Employee", "Department", "Period", "Gross", "Deductions", "Net", "Workflow", "Payment", "Action"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((payslip) => (
                <tr key={payslip.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{payslip.staffName}</p>
                    <p className="text-xs text-slate-400">{payslip.role}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{payslip.department}</td>
                  <td className="px-4 py-3 text-slate-600">{payslip.period}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{money(payslip.grossPay)}</td>
                  <td className="px-4 py-3 text-rose-600">{money(payslip.totalDeductions)}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{money(payslip.netPay)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{payslip.workflowStatus}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${payslip.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {payslip.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setSelected(payslip)}>View</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                    No generated payslips found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <Modal open={true} onClose={() => setSelected(null)} title={`${selected.staffName} - ${selected.period}`} className="max-w-5xl">
          <PayrollEntryBreakdown entry={buildPayrollEntryFromPayslip(selected)} />
          <ModalFooter>
            <Button size="md" onClick={() => setSelected(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
