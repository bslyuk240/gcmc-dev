"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import {
  addPayrollBatch,
  updatePayrollStatus,
  type PayrollBatch,
  type PayrollEntry,
} from "@/lib/data/accounts-store";
import { updatePayrollPrepStatus } from "@/lib/data/hr-store";

const PAYROLL_STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-sky-50 text-sky-700",
  Approved: "bg-violet-50 text-violet-700",
  Paid: "bg-emerald-50 text-emerald-700",
};

const DEPARTMENTS = ["Doctors", "Nurses", "Pharmacy", "Front Desk", "Accounts", "Store", "IT", "HR", "Administration"];
const ROLES_BY_DEPT: Record<string, string[]> = {
  Doctors: ["Consultant", "Senior Doctor", "Junior Doctor", "Resident"],
  Nurses: ["Senior Nurse", "Staff Nurse", "Nursing Assistant"],
  Pharmacy: ["Pharmacist", "Pharmacy Technician"],
  "Front Desk": ["Receptionist", "Senior Receptionist"],
  Accounts: ["Accountant", "Senior Accountant", "Finance Manager"],
  Store: ["Store Manager", "Store Keeper"],
  IT: ["IT Manager", "Systems Admin", "Support Technician"],
  HR: ["HR Manager", "HR Officer"],
  Administration: ["Administrator", "Department Head"],
};

const BASE_SALARIES: Record<string, number> = {
  Consultant: 12000, "Senior Doctor": 8000, "Junior Doctor": 5500, Resident: 4000,
  "Senior Nurse": 4500, "Staff Nurse": 3500, "Nursing Assistant": 2500,
  Pharmacist: 5000, "Pharmacy Technician": 3000,
  Receptionist: 2800, "Senior Receptionist": 3500,
  Accountant: 4500, "Senior Accountant": 6000, "Finance Manager": 8000,
  "Store Manager": 4000, "Store Keeper": 3000,
  "IT Manager": 7000, "Systems Admin": 5500, "Support Technician": 3500,
  "HR Manager": 7000, "HR Officer": 4500,
  Administrator: 5000, "Department Head": 9000,
};

const CURRENT_MONTH = "March 2026";

const DEFAULT_ENTRIES: PayrollEntry[] = [
  { staffName: "Dr. Amaka Osei", department: "Doctors", role: "Senior Doctor", baseSalary: 8000, allowances: 1200, deductions: 400, netPay: 8800 },
  { staffName: "Dr. Kwame Mensah", department: "Doctors", role: "Consultant", baseSalary: 12000, allowances: 1800, deductions: 600, netPay: 13200 },
  { staffName: "Nurse Patricia", department: "Nurses", role: "Senior Nurse", baseSalary: 4500, allowances: 800, deductions: 300, netPay: 5000 },
  { staffName: "Nurse Grace", department: "Nurses", role: "Staff Nurse", baseSalary: 3500, allowances: 600, deductions: 200, netPay: 3900 },
  { staffName: "James Adu", department: "Pharmacy", role: "Pharmacist", baseSalary: 5000, allowances: 600, deductions: 250, netPay: 5350 },
  { staffName: "Tom Kwesi", department: "Front Desk", role: "Receptionist", baseSalary: 2800, allowances: 400, deductions: 150, netPay: 3050 },
  { staffName: "Sarah Mensah", department: "Accounts", role: "Accountant", baseSalary: 4500, allowances: 700, deductions: 250, netPay: 4950 },
  { staffName: "Store Manager", department: "Store", role: "Store Manager", baseSalary: 4000, allowances: 500, deductions: 200, netPay: 4300 },
];

export default function HRPayrollPage() {
  const { payrollBatches } = useAccountsStore();
  const { payrollPreps } = useHRStore();
  const [showCreate, setShowCreate] = useState(false);
  const [viewBatch, setViewBatch] = useState<PayrollBatch | null>(null);
  const [submitTarget, setSubmitTarget] = useState<PayrollBatch | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New batch form
  const [period, setPeriod] = useState(CURRENT_MONTH);
  const [entries, setEntries] = useState<PayrollEntry[]>(DEFAULT_ENTRIES);
  const [newEntry, setNewEntry] = useState<Partial<PayrollEntry>>({ department: DEPARTMENTS[0] });
  const [creatingBatch, setCreatingBatch] = useState(false);

  const totalAmount = entries.reduce((s, e) => s + e.netPay, 0);

  function addEntry() {
    if (!newEntry.staffName || !newEntry.role || !newEntry.baseSalary) {
      setToast({ message: "Fill in name, role, and base salary.", type: "error" });
      return;
    }
    const base = newEntry.baseSalary ?? 0;
    const allow = newEntry.allowances ?? Math.round(base * 0.15);
    const deduct = newEntry.deductions ?? Math.round(base * 0.05);
    const entry: PayrollEntry = {
      staffName: newEntry.staffName ?? "",
      department: newEntry.department ?? DEPARTMENTS[0],
      role: newEntry.role ?? "",
      baseSalary: base,
      allowances: allow,
      deductions: deduct,
      netPay: base + allow - deduct,
    };
    setEntries((prev) => [...prev, entry]);
    setNewEntry({ department: newEntry.department });
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!period || entries.length === 0) return;
    setCreatingBatch(true);
    setTimeout(() => {
      const batch: PayrollBatch = {
        id: `PAY-${Date.now()}`,
        period,
        totalStaff: entries.length,
        totalAmount,
        preparedBy: "HR Manager (You)",
        preparedAt: "Mar 15, 2026",
        status: "Draft",
        entries: [...entries],
      };
      addPayrollBatch(batch);
      setToast({ message: `Payroll batch for ${period} created as Draft.`, type: "success" });
      setShowCreate(false);
      setCreatingBatch(false);
      setEntries(DEFAULT_ENTRIES);
      setPeriod(CURRENT_MONTH);
    }, 600);
  }

  function handleSubmitToAccounts(batch: PayrollBatch) {
    updatePayrollStatus(batch.id, "Submitted");
    setSubmitTarget(null);
    setToast({ message: `Payroll for ${batch.period} submitted to Accounts for approval. ₦${batch.totalAmount.toLocaleString()} pending disbursement.`, type: "success" });
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        description="Prepare monthly payroll and submit to Accounts for salary disbursement."
        action={
          <Button onClick={() => setShowCreate(true)}>+ Prepare Payroll</Button>
        }
      />

      {/* Payroll Prep Pipeline from HR Store */}
      {payrollPreps.some((p) => p.status !== "Submitted to Accounts") && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-800">Payroll Preparation Pipeline</h3>
            <p className="text-xs text-slate-400">Prepared by HR — submit to Accounts for disbursement</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {payrollPreps.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 min-w-[200px] ${p.status === "Ready" ? "border-emerald-200 bg-emerald-50" : p.status === "Submitted to Accounts" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"}`}>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{p.department}</p>
                  <p className="text-xs text-slate-500">{p.staffCount} staff · ₦{p.netTotal.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === "Ready" ? "bg-emerald-100 text-emerald-700" : p.status === "Submitted to Accounts" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                  {p.status === "Ready" && (
                    <button onClick={() => { updatePayrollPrepStatus(p.id, "Submitted to Accounts"); }}
                      className="mt-1 block text-[10px] font-bold text-sky-600 hover:underline">
                      Submit to Accounts →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Batches This Year", value: payrollBatches.length, color: "text-slate-900" },
          { label: "Pending Approval", value: payrollBatches.filter((b) => b.status === "Submitted").length, color: "text-sky-700" },
          { label: "MTD Disbursed", value: `₦${payrollBatches.filter((b) => b.status === "Paid" && b.period.includes("2026")).reduce((s, b) => s + b.totalAmount, 0).toLocaleString()}`, color: "text-emerald-700" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Payroll batches table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Payroll Batches</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Period", "Staff", "Total Amount", "Prepared By", "Prepared At", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{batch.period}</td>
                  <td className="px-5 py-3 text-slate-600">{batch.totalStaff} staff</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{batch.totalAmount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-500">{batch.preparedBy}</td>
                  <td className="px-5 py-3 text-slate-500">{batch.preparedAt}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PAYROLL_STATUS_STYLES[batch.status]}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewBatch(batch)}>View</Button>
                      {batch.status === "Draft" && (
                        <Button size="sm" onClick={() => setSubmitTarget(batch)}>
                          Submit to Accounts
                        </Button>
                      )}
                      {batch.status === "Submitted" && (
                        <span className="text-xs font-medium text-sky-700">Awaiting Accounts approval</span>
                      )}
                      {batch.status === "Paid" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-700">✓ Disbursed</span>
                          <a href="/app/hr/payslips" className="text-xs font-semibold text-sky-600 hover:underline">
                            Payslips →
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payrollBatches.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No payroll batches yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> HR prepares payroll → clicks &quot;Submit to Accounts&quot; → Accounts approves → Accounts disburses salaries → status updates to Paid.
      </div>

      {/* Create payroll modal */}
      <Modal open={showCreate} onClose={() => !creatingBatch && setShowCreate(false)} title="Prepare Payroll Batch">
        <form onSubmit={handleCreateBatch} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Pay Period *</label>
            <input type="text" required value={period} onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. March 2026" className={inputCls} />
          </div>

          {/* Staff entries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800">Staff Entries ({entries.length})</span>
              <span className="text-sm font-bold text-slate-700">Total: ₦{totalAmount.toLocaleString()}</span>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-800">{e.staffName}</p>
                    <p className="text-xs text-slate-500">{e.department} · {e.role}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">₦{e.netPay.toLocaleString()}</span>
                    <button type="button" onClick={() => removeEntry(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add entry */}
          <div className="rounded-xl border border-dashed border-slate-300 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Add Staff Member</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Staff name" value={newEntry.staffName ?? ""} onChange={(e) => setNewEntry((p) => ({ ...p, staffName: e.target.value }))} className={inputCls} />
              <select value={newEntry.department ?? DEPARTMENTS[0]} onChange={(e) => setNewEntry((p) => ({ ...p, department: e.target.value, role: undefined }))} className={inputCls}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={newEntry.role ?? ""} onChange={(e) => {
                const base = BASE_SALARIES[e.target.value] ?? 3000;
                setNewEntry((p) => ({ ...p, role: e.target.value, baseSalary: base, allowances: Math.round(base * 0.15), deductions: Math.round(base * 0.05) }));
              }} className={inputCls}>
                <option value="">Select role…</option>
                {(ROLES_BY_DEPT[newEntry.department ?? DEPARTMENTS[0]] ?? []).map((r) => <option key={r}>{r}</option>)}
              </select>
              <input type="number" placeholder="Base salary" value={newEntry.baseSalary ?? ""} onChange={(e) => setNewEntry((p) => ({ ...p, baseSalary: parseFloat(e.target.value) }))} className={inputCls} />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addEntry}>+ Add to Payroll</Button>
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowCreate(false)} disabled={creatingBatch}>Cancel</Button>
            <Button size="md" type="submit" disabled={creatingBatch || entries.length === 0}>
              {creatingBatch ? "Creating…" : "Save Payroll Draft"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Submit confirm modal */}
      {submitTarget && (
        <Modal open={true} onClose={() => setSubmitTarget(null)} title="Submit Payroll to Accounts">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-semibold">{submitTarget.period}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Staff</span><span>{submitTarget.totalStaff}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-semibold">Total Amount</span><span className="font-bold text-xl text-slate-900">₦{submitTarget.totalAmount.toLocaleString()}</span></div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              ✓ Submitting will send this payroll to Accounts for approval and disbursement. You cannot edit it after submission.
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setSubmitTarget(null)}>Cancel</Button>
            <Button size="md" onClick={() => handleSubmitToAccounts(submitTarget)}>Submit to Accounts</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* View batch modal */}
      {viewBatch && (
        <Modal open={true} onClose={() => setViewBatch(null)} title={`Payroll — ${viewBatch.period}`}>
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-semibold">{viewBatch.period}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Staff</span><span>{viewBatch.totalStaff}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Amount</span><span className="font-bold">₦{viewBatch.totalAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PAYROLL_STATUS_STYLES[viewBatch.status]}`}>{viewBatch.status}</span>
              </div>
              {viewBatch.paidAt && <div className="flex justify-between"><span className="text-slate-500">Paid At</span><span>{viewBatch.paidAt}</span></div>}
            </div>
            {viewBatch.entries && viewBatch.entries.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {viewBatch.entries.map((e, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div>
                      <p className="font-medium text-slate-800">{e.staffName}</p>
                      <p className="text-slate-500">{e.department} · {e.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-700">₦{e.netPay.toLocaleString()}</p>
                      <p className="text-slate-400">+{e.allowances} −{e.deductions}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
