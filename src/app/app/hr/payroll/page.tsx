"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollEntryBreakdown } from "@/components/payroll/payroll-entry-breakdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import {
  addPayrollBatch,
  updatePayrollStatus,
  type PayrollBatch,
  type PayrollLineItem,
} from "@/lib/data/accounts-store";
import {
  addGeneratedPayslip,
  assignPayslipsToBatch,
  updatePayslipWorkflowByBatch,
  type GeneratedPayslip,
  type StaffDepartment,
} from "@/lib/data/hr-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import {
  buildGeneratedPayslip,
  buildPayrollEntry,
  buildPayrollEntryFromPayslip,
  EMPTY_PAYROLL_ADJUSTMENTS,
  summarisePayrollEntries,
  sumLineItems,
  type PayrollDraftAdjustments,
} from "@/lib/payroll/utils";

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PAYROLL_STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-sky-50 text-sky-700",
  Approved: "bg-violet-50 text-violet-700",
  Paid: "bg-emerald-50 text-emerald-700",
};

function money(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

function buildMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function buildPeriodLabel(year: number, monthIndex: number) {
  return `${MONTH_OPTIONS[monthIndex]} ${year}`;
}

type CustomLineKind = "customEarnings" | "customDeductions";
type NumericAdjustmentField = Exclude<keyof PayrollDraftAdjustments, "customEarnings" | "customDeductions">;

export default function HRPayrollPage() {
  const { payrollBatches } = useAccountsStore();
  const { generatedPayslips, staff, payrollPreps } = useHRStore();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(today.getMonth());
  const [selectedDepartment, setSelectedDepartment] = useState<StaffDepartment>("Doctors");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [draftAdjustments, setDraftAdjustments] = useState<PayrollDraftAdjustments>(EMPTY_PAYROLL_ADJUSTMENTS);
  const [showCreate, setShowCreate] = useState(false);
  const [viewBatch, setViewBatch] = useState<PayrollBatch | null>(null);
  const [viewPayslip, setViewPayslip] = useState<GeneratedPayslip | null>(null);
  const [submitTarget, setSubmitTarget] = useState<PayrollBatch | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const monthKey = buildMonthKey(selectedYear, selectedMonthIndex);
  const periodLabel = buildPeriodLabel(selectedYear, selectedMonthIndex);

  const eligibleStaff = useMemo(
    () => staff.filter((member) => member.status !== "Suspended" && member.status !== "Terminated"),
    [staff],
  );

  const departments = useMemo(
    () => Array.from(new Set(eligibleStaff.map((member) => member.department))).sort() as StaffDepartment[],
    [eligibleStaff],
  );

  const staffInDepartment = useMemo(
    () => eligibleStaff.filter((member) => member.department === selectedDepartment),
    [eligibleStaff, selectedDepartment],
  );

  const selectedStaff = useMemo(
    () => staffInDepartment.find((member) => member.id === selectedStaffId) ?? null,
    [selectedStaffId, staffInDepartment],
  );

  const previewEntry = useMemo(
    () => (selectedStaff ? buildPayrollEntry(selectedStaff, draftAdjustments) : null),
    [selectedStaff, draftAdjustments],
  );

  const filteredPayslips = useMemo(
    () => generatedPayslips.filter((payslip) => payslip.monthKey === monthKey),
    [generatedPayslips, monthKey],
  );

  const payslipGroups = useMemo(() => {
    const grouped = new Map<StaffDepartment, GeneratedPayslip[]>();
    filteredPayslips.forEach((payslip) => {
      const current = grouped.get(payslip.department) ?? [];
      grouped.set(payslip.department, [...current, payslip]);
    });
    return Array.from(grouped.entries())
      .map(([department, items]) => ({
        department,
        items: items.sort((left, right) => left.staffName.localeCompare(right.staffName)),
        totals: {
          gross: items.reduce((sum, item) => sum + item.grossPay, 0),
          deductions: items.reduce((sum, item) => sum + item.totalDeductions, 0),
          net: items.reduce((sum, item) => sum + item.netPay, 0),
        },
      }))
      .sort((left, right) => left.department.localeCompare(right.department));
  }, [filteredPayslips]);

  const periodSummary = useMemo(
    () => ({
      staffCount: filteredPayslips.length,
      gross: filteredPayslips.reduce((sum, item) => sum + item.grossPay, 0),
      deductions: filteredPayslips.reduce((sum, item) => sum + item.totalDeductions, 0),
      net: filteredPayslips.reduce((sum, item) => sum + item.netPay, 0),
    }),
    [filteredPayslips],
  );

  const periodBatches = useMemo(
    () => payrollBatches.filter((batch) => batch.period === periodLabel && batch.department),
    [payrollBatches, periodLabel],
  );

  function updateAdjustment(field: NumericAdjustmentField, value: string) {
    setDraftAdjustments((current) => ({
      ...current,
      [field]: Number(value) || 0,
    }));
  }

  function resetDraft() {
    setDraftAdjustments(EMPTY_PAYROLL_ADJUSTMENTS);
  }

  function addCustomLine(kind: CustomLineKind) {
    setDraftAdjustments((current) => ({
      ...current,
      [kind]: [...current[kind], { label: "", amount: 0 }],
    }));
  }

  function updateCustomLine(kind: CustomLineKind, index: number, field: keyof PayrollLineItem, value: string) {
    setDraftAdjustments((current) => ({
      ...current,
      [kind]: current[kind].map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === "amount" ? Number(value) || 0 : value,
            }
          : item,
      ),
    }));
  }

  function removeCustomLine(kind: CustomLineKind, index: number) {
    setDraftAdjustments((current) => ({
      ...current,
      [kind]: current[kind].filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleCreatePayslip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStaff) {
      setToast({ message: "Select a staff member before creating a payslip.", type: "error" });
      return;
    }

    const payslip = buildGeneratedPayslip(
      selectedStaff,
      periodLabel,
      monthKey,
      "HR Manager (You)",
      draftAdjustments,
    );

    addGeneratedPayslip(payslip);
    setToast({
      message: `${selectedStaff.name}'s ${periodLabel} payslip has been created and published to the staff portal.`,
      type: "success",
    });
    resetDraft();
    setShowCreate(false);
  }

  function handleGenerateDepartmentBatch(department: StaffDepartment) {
    const group = payslipGroups.find((item) => item.department === department);
    if (!group || group.items.length === 0) {
      setToast({ message: `No generated payslips found for ${department} in ${periodLabel}.`, type: "error" });
      return;
    }

    const existing = payrollBatches.find(
      (batch) => batch.period === periodLabel && batch.department === department,
    );
    if (existing) {
      setViewBatch(existing);
      setToast({ message: `${department} already has a batch for ${periodLabel}.`, type: "info" });
      return;
    }

    const entries = group.items.map((item) => buildPayrollEntryFromPayslip(item));
    const totals = summarisePayrollEntries(entries);
    const batchId = `PAY-${department}-${monthKey}`.replace(/\s+/g, "-").toUpperCase();
    const batch: PayrollBatch = {
      id: batchId,
      period: periodLabel,
      department,
      totalStaff: group.items.length,
      totalAmount: totals.net,
      preparedBy: "HR Manager (You)",
      preparedAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Draft",
      payslipIds: group.items.map((item) => item.id),
      entries,
    };

    addPayrollBatch(batch);
    assignPayslipsToBatch(batchId, group.items.map((item) => item.id));
    setToast({
      message: `${department} payroll batch generated from ${group.items.length} payslips for ${periodLabel}.`,
      type: "success",
    });
  }

  function handleSubmitToAccounts(batch: PayrollBatch) {
    updatePayrollStatus(batch.id, "Submitted");
    updatePayslipWorkflowByBatch(batch.id, "Submitted to Accounts");
    setSubmitTarget(null);
    setToast({
      message: `${batch.department ?? "Department"} payroll for ${batch.period} submitted to Accounts.`,
      type: "success",
    });
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        description="Create individual staff payslips by department, then generate and submit department payroll batches to Accounts."
        action={<Button onClick={() => setShowCreate(true)}>Create Payslip</Button>}
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Month</label>
            <select value={selectedMonthIndex} onChange={(event) => setSelectedMonthIndex(Number(event.target.value))} className={inputCls}>
              {MONTH_OPTIONS.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Year</label>
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className={inputCls}>
              {[2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll Period</label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
              {periodLabel}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Generated Payslips", value: periodSummary.staffCount, color: "text-slate-900" },
          { label: "Gross Payroll", value: money(periodSummary.gross), color: "text-violet-700" },
          { label: "Total Deductions", value: money(periodSummary.deductions), color: "text-rose-700" },
          { label: "Net Payroll", value: money(periodSummary.net), color: "text-emerald-700" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </Card>
        ))}
      </div>

      {payrollPreps.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Department Payroll Status</h3>
            <p className="text-xs text-slate-400">Generated payslips automatically roll up into department preparation totals.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {payrollPreps
              .filter((prep) => prep.period === periodLabel)
              .map((prep) => (
                <div key={prep.id} className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{prep.department}</p>
                      <p className="text-xs text-slate-500">{prep.staffCount} payslips generated</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      prep.status === "Paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : prep.status === "Approved"
                          ? "bg-violet-100 text-violet-700"
                          : prep.status === "Submitted to Accounts"
                            ? "bg-sky-100 text-sky-700"
                            : prep.status === "Ready"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                    }`}>
                      {prep.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Gross {money(prep.grossTotal)} · Net {money(prep.netTotal)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Generated Payslips by Department</h3>
              <p className="text-sm text-slate-500">{periodLabel}</p>
            </div>
          </div>
          <div className="space-y-4">
            {payslipGroups.map((group) => {
              const relatedBatch = periodBatches.find((batch) => batch.department === group.department);
              return (
                <div key={group.department} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{group.department}</p>
                      <p className="text-sm text-slate-500">
                        {group.items.length} payslips · Gross {money(group.totals.gross)} · Net {money(group.totals.net)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {relatedBatch ? (
                        <>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PAYROLL_STATUS_STYLES[relatedBatch.status]}`}>
                            {relatedBatch.status}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => setViewBatch(relatedBatch)}>View Batch</Button>
                          {relatedBatch.status === "Draft" && (
                            <Button size="sm" onClick={() => setSubmitTarget(relatedBatch)}>Send to Accounts</Button>
                          )}
                        </>
                      ) : (
                        <Button size="sm" onClick={() => handleGenerateDepartmentBatch(group.department)}>
                          Generate Department Batch
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {group.items.map((payslip) => (
                      <button
                        key={payslip.id}
                        onClick={() => setViewPayslip(payslip)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{payslip.staffName}</p>
                          <p className="text-xs text-slate-500">{payslip.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{money(payslip.netPay)}</p>
                          <p className="text-xs text-slate-500">{payslip.workflowStatus}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {payslipGroups.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
                No payslips have been generated for {periodLabel} yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Department Payroll Batches</h3>
          <p className="mt-1 text-sm text-slate-500">Batches created from generated payslips for {periodLabel}.</p>
          <div className="mt-4 space-y-3">
            {periodBatches.map((batch) => (
              <div key={batch.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{batch.department}</p>
                    <p className="text-xs text-slate-500">{batch.totalStaff} staff · {money(batch.totalAmount)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PAYROLL_STATUS_STYLES[batch.status]}`}>
                    {batch.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewBatch(batch)}>View</Button>
                  {batch.status === "Draft" && (
                    <Button size="sm" onClick={() => setSubmitTarget(batch)}>Send to Accounts</Button>
                  )}
                </div>
              </div>
            ))}
            {periodBatches.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                Generate a department batch after creating payslips.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Staff Payslip" className="max-w-4xl">
        <form onSubmit={handleCreatePayslip} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-900">Staff Selection</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(event) => {
                        setSelectedDepartment(event.target.value as StaffDepartment);
                        setSelectedStaffId("");
                      }}
                      className={inputCls}
                    >
                      {departments.map((department) => (
                        <option key={department} value={department}>{department}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Staff</label>
                    <select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} className={inputCls}>
                      <option value="">Select staff member</option>
                      {staffInDepartment.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pay Period</label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                      {periodLabel}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Main Salary</label>
                    <input value={selectedStaff?.salary ?? ""} readOnly className={`${inputCls} bg-slate-50`} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-900">Earnings</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[
                    ["housing", "Housing"],
                    ["transport", "Transport"],
                    ["medical", "Medical"],
                    ["meal", "Meal"],
                    ["duty", "Duty"],
                    ["overtime", "Overtime"],
                    ["bonus", "Bonus"],
                    ["arrears", "Arrears"],
                    ["otherAllowance", "Other Allowance"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
                      <input
                        type="number"
                        min="0"
                        value={draftAdjustments[field as NumericAdjustmentField]}
                        onChange={(event) => updateAdjustment(field as NumericAdjustmentField, event.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom Earnings</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => addCustomLine("customEarnings")}>
                      Add earning field
                    </Button>
                  </div>
                  {draftAdjustments.customEarnings.map((item, index) => (
                    <div key={`earning-${index}`} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                      <input
                        placeholder="Label"
                        value={item.label}
                        onChange={(event) => updateCustomLine("customEarnings", index, "label", event.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(event) => updateCustomLine("customEarnings", index, "amount", event.target.value)}
                        className={inputCls}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeCustomLine("customEarnings", index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-900">Deductions</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tax Percentage</label>
                    <input type="number" min="0" step="0.1" value={draftAdjustments.taxPercent} onChange={(event) => updateAdjustment("taxPercent", event.target.value)} className={inputCls} />
                  </div>
                  {[
                    ["pension", "Pension"],
                    ["nhf", "NHF"],
                    ["loan", "Loan"],
                    ["insurance", "Insurance"],
                    ["absence", "Absence"],
                    ["otherDeduction", "Other Deduction"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
                      <input
                        type="number"
                        min="0"
                        value={draftAdjustments[field as NumericAdjustmentField]}
                        onChange={(event) => updateAdjustment(field as NumericAdjustmentField, event.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom Deductions</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => addCustomLine("customDeductions")}>
                      Add deduction field
                    </Button>
                  </div>
                  {draftAdjustments.customDeductions.map((item, index) => (
                    <div key={`deduction-${index}`} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                      <input
                        placeholder="Label"
                        value={item.label}
                        onChange={(event) => updateCustomLine("customDeductions", index, "label", event.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(event) => updateCustomLine("customDeductions", index, "amount", event.target.value)}
                        className={inputCls}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeCustomLine("customDeductions", index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Preview Summary</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Base Salary</p>
                    <p className="font-semibold text-slate-800">{money(selectedStaff?.salary ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Custom Earnings</p>
                    <p className="font-semibold text-slate-800">{money(sumLineItems(draftAdjustments.customEarnings))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Custom Deductions</p>
                    <p className="font-semibold text-slate-800">{money(sumLineItems(draftAdjustments.customDeductions))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tax %</p>
                    <p className="font-semibold text-slate-800">{draftAdjustments.taxPercent}%</p>
                  </div>
                </div>
              </div>

              {previewEntry ? (
                <PayrollEntryBreakdown entry={previewEntry} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
                  Select a staff member to preview the payslip.
                </div>
              )}
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="button" size="md" variant="outline" onClick={resetDraft}>Clear Form</Button>
            <Button size="md" type="submit">Create Payslip</Button>
          </ModalFooter>
        </form>
      </Modal>

      {submitTarget && (
        <Modal open={true} onClose={() => setSubmitTarget(null)} title="Send Department Payroll to Accounts">
          <div className="space-y-3 text-sm">
            {(() => {
              const batchTotals = summarisePayrollEntries(submitTarget.entries ?? []);
              return (
                <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-500">Department</span><span className="font-semibold">{submitTarget.department}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-semibold">{submitTarget.period}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Staff</span><span>{submitTarget.totalStaff}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Gross Payroll</span><span>{money(batchTotals.gross)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total Deductions</span><span>{money(batchTotals.deductions)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Net Amount</span><span className="font-bold text-xl text-slate-900">{money(submitTarget.totalAmount)}</span></div>
                </div>
              );
            })()}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Once sent, this department batch moves to Accounts approval and the linked staff payslips stay visible in their portals.
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setSubmitTarget(null)}>Cancel</Button>
            <Button size="md" onClick={() => handleSubmitToAccounts(submitTarget)}>Send to Accounts</Button>
          </ModalFooter>
        </Modal>
      )}

      {viewPayslip && (
        <Modal open={true} onClose={() => setViewPayslip(null)} title={`${viewPayslip.staffName} - ${viewPayslip.period}`} className="max-w-5xl">
          <PayrollEntryBreakdown entry={buildPayrollEntryFromPayslip(viewPayslip)} />
          <ModalFooter>
            <Button size="md" onClick={() => setViewPayslip(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      {viewBatch && (
        <Modal open={true} onClose={() => setViewBatch(null)} title={`${viewBatch.department ?? "Department"} Payroll - ${viewBatch.period}`} className="max-w-6xl">
          <div className="space-y-4">
            {(() => {
              const totals = summarisePayrollEntries(viewBatch.entries ?? []);
              return (
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Department</p>
                    <p className="font-semibold text-slate-900">{viewBatch.department}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Staff Count</p>
                    <p className="font-semibold text-slate-900">{viewBatch.totalStaff}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gross</p>
                    <p className="font-semibold text-slate-900">{money(totals.gross)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deductions</p>
                    <p className="font-semibold text-slate-900">{money(totals.deductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PAYROLL_STATUS_STYLES[viewBatch.status]}`}>
                      {viewBatch.status}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {viewBatch.entries?.map((entry) => (
                <PayrollEntryBreakdown key={entry.staffId ?? entry.staffName} entry={entry} />
              ))}
            </div>
          </div>
          <ModalFooter>
            <Button size="md" onClick={() => setViewBatch(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
