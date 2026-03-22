"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { updateStaffFinancialDetails } from "@/lib/data/hr-store";

function maskAccount(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function formatPersonName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function AccountsStaffBankingPage() {
  const { staff, generatedPayslips } = useHRStore();
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [taxId, setTaxId] = useState("");
  const [pensionNumber, setPensionNumber] = useState("");
  const [nhfNumber, setNhfNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...staff]
      .sort((left, right) => left.name.localeCompare(right.name))
      .filter((item) => {
        if (!query) return true;
        const searchable = [
          item.name,
          item.department,
          item.role,
          item.email,
          item.id,
        ].join(" ").toLowerCase();
        return searchable.includes(query);
      });
  }, [search, staff]);

  const selectedStaff = useMemo(
    () => staff.find((item) => item.id === selectedStaffId) ?? filteredStaff[0] ?? null,
    [filteredStaff, selectedStaffId, staff],
  );

  const selectedPayslip = useMemo(
    () => generatedPayslips.find((item) => item.staffId === selectedStaff?.id) ?? null,
    [generatedPayslips, selectedStaff?.id],
  );

  useEffect(() => {
    if (!selectedStaff) return;
    setSelectedStaffId(selectedStaff.id);
    setBankName(selectedStaff.bankName ?? "");
    setBankAccount(selectedStaff.bankAccount ?? "");
    setTaxId(selectedStaff.taxId ?? "");
    setPensionNumber(selectedStaff.pensionNumber ?? "");
    setNhfNumber(selectedStaff.nhfNumber ?? "");
  }, [selectedStaff]);

  const completeCount = useMemo(
    () =>
      staff.filter(
        (item) =>
          Boolean(item.bankName?.trim()) &&
          Boolean(item.bankAccount?.trim()) &&
          Boolean(item.taxId?.trim()) &&
          Boolean(item.pensionNumber?.trim()) &&
          Boolean(item.nhfNumber?.trim()),
      ).length,
    [staff],
  );

  async function handleSave() {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      await updateStaffFinancialDetails(selectedStaff.id, {
        bankName: bankName.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        taxId: taxId.trim() || undefined,
        pensionNumber: pensionNumber.trim() || undefined,
        nhfNumber: nhfNumber.trim() || undefined,
      });
      setToast({
        type: "success",
        message: `${formatPersonName(selectedStaff.name)} payroll details saved for Accounts.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save payroll details.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Banking Details"
        description="Accounts HOD maintains payroll-linked banking records used by staff payslips and salary generation."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registered Staff</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{staff.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">All active staff loaded from HR profiles</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll Ready</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{completeCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">Banking and statutory details complete</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Attention</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{Math.max(staff.length - completeCount, 0)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Missing one or more payroll fields</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-sm font-bold text-slate-900">Search Staff</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, department, role..."
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div className="max-h-[68vh] divide-y divide-slate-100 overflow-y-auto">
            {filteredStaff.map((item) => {
              const latestPayslip = generatedPayslips.find((payslip) => payslip.staffId === item.id) ?? null;
              const isSelected = item.id === selectedStaff?.id;
              const ready = Boolean(item.bankName?.trim() && item.bankAccount?.trim() && item.taxId?.trim());

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStaffId(item.id)}
                  className={`w-full px-4 py-3 text-left transition ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{formatPersonName(item.name)}</p>
                      <p className="text-xs text-slate-500">{item.department} · {item.role}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {ready ? "Payroll ready" : "Details pending"}
                        {latestPayslip ? ` · Last payslip ${latestPayslip.period}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {ready ? "Ready" : "Pending"}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredStaff.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">No staff match the current filter.</div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          {selectedStaff ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Staff</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">{formatPersonName(selectedStaff.name)}</h3>
                  <p className="text-sm text-slate-500">{selectedStaff.department} · {selectedStaff.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Payslip</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedPayslip?.period ?? "No payslip yet"}</p>
                  <p className="text-xs text-slate-500">{selectedPayslip?.workflowStatus ?? "Generated details will appear here"}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Bank Name</label>
                  <input value={bankName} onChange={(event) => setBankName(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="e.g. GTBank" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Bank Account</label>
                  <input value={bankAccount} onChange={(event) => setBankAccount(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="0123456789" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tax ID (TIN)</label>
                  <input value={taxId} onChange={(event) => setTaxId(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="TIN-1234" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pension Number</label>
                  <input value={pensionNumber} onChange={(event) => setPensionNumber(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="PEN-0000" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">NHF Number</label>
                  <input value={nhfNumber} onChange={(event) => setNhfNumber(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="NHF-0000" />
                </div>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                These values are used when HR generates payslips and when staff view the banking section of their profile.
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saving..." : "Save Payroll Details"}
                </Button>
                {selectedPayslip?.bankAccount && (
                  <p className="text-xs text-slate-500">
                    Current payslip account: {maskAccount(selectedPayslip.bankAccount)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Select a staff member to manage payroll-linked banking details.
            </div>
          )}
        </Card>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
