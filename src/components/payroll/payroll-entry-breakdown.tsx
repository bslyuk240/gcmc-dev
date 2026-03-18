import { Card } from "@/components/ui/card";
import type { PayrollEntry } from "@/lib/data/accounts-store";
import {
  getPayrollAllowanceRows,
  getPayrollDeductionRows,
} from "@/lib/payroll/utils";

type PayrollEntryBreakdownProps = {
  entry: PayrollEntry;
};

function money(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

export function PayrollEntryBreakdown({
  entry,
}: PayrollEntryBreakdownProps) {
  const allowanceRows = getPayrollAllowanceRows(entry);
  const deductionRows = getPayrollDeductionRows(entry);

  return (
    <Card className="space-y-4 border border-slate-200 p-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">{entry.staffName}</p>
          <p className="text-sm text-slate-500">
            {entry.role} · {entry.department}
          </p>
          <p className="text-xs text-slate-400">
            {entry.staffId ?? "Unassigned"} · {entry.unit ?? "General Unit"} · {entry.employmentType ?? "Staff"}
          </p>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payroll Ref</p>
            <p className="font-medium text-slate-700">{entry.payrollRef ?? "Pending"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Method</p>
            <p className="font-medium text-slate-700">{entry.paymentMethod ?? "Bank Transfer"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bank Details</p>
            <p className="font-medium text-slate-700">
              {entry.bankName ?? "Salary Bank"} {entry.bankAccount ?? ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tax ID</p>
            <p className="font-medium text-slate-700">{entry.taxId ?? "Pending"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Earnings</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-700">
              <span>Basic Salary</span>
              <span className="font-semibold">{money(entry.baseSalary)}</span>
            </div>
            {allowanceRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-slate-700">
                <span>{row.label}</span>
                <span className="font-semibold">{money(row.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-emerald-200 pt-2 font-semibold text-emerald-900">
              <span>Gross Pay</span>
              <span>{money(entry.grossPay ?? entry.baseSalary + entry.allowances)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Deductions</p>
          <div className="mt-3 space-y-2 text-sm">
            {deductionRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-slate-700">
                <span>{row.label}</span>
                <span className="font-semibold">{money(row.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-rose-200 pt-2 font-semibold text-rose-900">
              <span>Total Deductions</span>
              <span>{money(entry.deductions)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Taxable Pay</p>
          <p className="font-semibold text-slate-800">{money(entry.taxablePay ?? entry.grossPay ?? entry.baseSalary + entry.allowances)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employer Pension</p>
          <p className="font-semibold text-slate-800">{money(entry.employerPension ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grade / Step</p>
          <p className="font-semibold text-slate-800">
            {entry.payGrade ?? "GL-11"} / {entry.payStep ?? "Active"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Department</p>
          <p className="font-semibold text-slate-800">{entry.department}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net Pay</p>
          <p className="text-lg font-bold text-emerald-700">{money(entry.netPay)}</p>
        </div>
      </div>
    </Card>
  );
}
