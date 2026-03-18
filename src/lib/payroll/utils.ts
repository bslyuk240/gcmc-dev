import type {
  PayrollAllowanceBreakdown,
  PayrollDeductionBreakdown,
  PayrollEntry,
  PayrollLineItem,
} from "@/lib/data/accounts-store";
import type { GeneratedPayslip, StaffMember } from "@/lib/data/hr-store";

export type PayrollDraftAdjustments = {
  housing: number;
  transport: number;
  medical: number;
  meal: number;
  duty: number;
  overtime: number;
  bonus: number;
  arrears: number;
  otherAllowance: number;
  taxPercent: number;
  pension: number;
  nhf: number;
  loan: number;
  insurance: number;
  absence: number;
  otherDeduction: number;
  customEarnings: PayrollLineItem[];
  customDeductions: PayrollLineItem[];
};

export const EMPTY_PAYROLL_ADJUSTMENTS: PayrollDraftAdjustments = {
  housing: 0,
  transport: 0,
  medical: 0,
  meal: 0,
  duty: 0,
  overtime: 0,
  bonus: 0,
  arrears: 0,
  otherAllowance: 0,
  taxPercent: 7.5,
  pension: 0,
  nhf: 0,
  loan: 0,
  insurance: 0,
  absence: 0,
  otherDeduction: 0,
  customEarnings: [],
  customDeductions: [],
};

function roundAmount(value: number) {
  return Math.round(value);
}

function normalizeDepartmentLabel(department: string) {
  return department === "Admin" ? "Administration" : department;
}

function buildMaskedAccount(staffId: string) {
  const digits = staffId.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `****${digits}`;
}

function buildTaxId(staffId: string) {
  const digits = staffId.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `TIN-${digits}`;
}

function buildPayGrade(staff: StaffMember) {
  if (staff.roleKey === "hod" || staff.role.toLowerCase().includes("head")) return "GL-15";
  if (staff.role.toLowerCase().includes("senior") || staff.role.toLowerCase().includes("manager")) return "GL-13";
  if (staff.contractType === "Contract") return "GL-09";
  return "GL-11";
}

function compactLineItems<T extends { amount: number }>(items: T[]) {
  return items.filter((item) => item.amount > 0);
}

export function sumLineItems(items?: Array<{ amount: number }>) {
  return (items ?? []).reduce((sum, item) => sum + item.amount, 0);
}

export function sumPayrollAllowances(breakdown?: PayrollAllowanceBreakdown) {
  return sumLineItems(
    breakdown
      ? Object.values(breakdown).map((amount) => ({ amount }))
      : [],
  );
}

export function sumPayrollDeductions(breakdown?: PayrollDeductionBreakdown) {
  return sumLineItems(
    breakdown
      ? Object.values(breakdown).map((amount) => ({ amount }))
      : [],
  );
}

export function getPayrollAllowanceRows(entry: PayrollEntry) {
  const breakdown = entry.allowanceBreakdown;
  const baseRows = breakdown
    ? [
        { label: "Housing", value: breakdown.housing },
        { label: "Transport", value: breakdown.transport },
        { label: "Medical", value: breakdown.medical },
        { label: "Meal", value: breakdown.meal },
        { label: "Duty", value: breakdown.duty },
        { label: "Overtime", value: breakdown.overtime },
        { label: "Bonus", value: breakdown.bonus },
        { label: "Arrears", value: breakdown.arrears },
        { label: "Other", value: breakdown.other },
      ]
    : [{ label: "Allowances", value: entry.allowances }];

  const customRows = (entry.customEarnings ?? []).map((item) => ({
    label: item.label,
    value: item.amount,
  }));

  return [...baseRows, ...customRows].filter((row) => row.value > 0);
}

export function getPayrollDeductionRows(entry: PayrollEntry) {
  const breakdown = entry.deductionBreakdown;
  const taxLabel = entry.taxPercent ? `PAYE (${entry.taxPercent}%)` : "PAYE";

  const baseRows = breakdown
    ? [
        { label: taxLabel, value: breakdown.paye },
        { label: "Pension", value: breakdown.pension },
        { label: "NHF", value: breakdown.nhf },
        { label: "Loan", value: breakdown.loan },
        { label: "Insurance", value: breakdown.insurance },
        { label: "Absence", value: breakdown.absence },
        { label: "Other", value: breakdown.other },
      ]
    : [{ label: "Deductions", value: entry.deductions }];

  const customRows = (entry.customDeductions ?? []).map((item) => ({
    label: item.label,
    value: item.amount,
  }));

  return [...baseRows, ...customRows].filter((row) => row.value > 0);
}

export function buildPayrollEntry(
  staff: StaffMember,
  adjustments: Partial<PayrollDraftAdjustments> = {},
): PayrollEntry {
  const merged = {
    ...EMPTY_PAYROLL_ADJUSTMENTS,
    ...adjustments,
    customEarnings: adjustments.customEarnings ?? EMPTY_PAYROLL_ADJUSTMENTS.customEarnings,
    customDeductions: adjustments.customDeductions ?? EMPTY_PAYROLL_ADJUSTMENTS.customDeductions,
  };

  const baseSalary = roundAmount(staff.salary);
  const allowanceBreakdown: PayrollAllowanceBreakdown = {
    housing: roundAmount(merged.housing),
    transport: roundAmount(merged.transport),
    medical: roundAmount(merged.medical),
    meal: roundAmount(merged.meal),
    duty: roundAmount(merged.duty),
    overtime: roundAmount(merged.overtime),
    bonus: roundAmount(merged.bonus),
    arrears: roundAmount(merged.arrears),
    other: roundAmount(merged.otherAllowance),
  };

  const customEarnings = compactLineItems(
    merged.customEarnings.map((item) => ({
      label: item.label,
      amount: roundAmount(item.amount),
    })),
  );
  const allowances = sumPayrollAllowances(allowanceBreakdown) + sumLineItems(customEarnings);
  const grossPay = baseSalary + allowances;

  const taxPercent = merged.taxPercent;
  const taxAmount = roundAmount(grossPay * (taxPercent / 100));
  const deductionBreakdown: PayrollDeductionBreakdown = {
    paye: taxAmount,
    pension: roundAmount(merged.pension),
    nhf: roundAmount(merged.nhf),
    loan: roundAmount(merged.loan),
    insurance: roundAmount(merged.insurance),
    absence: roundAmount(merged.absence),
    other: roundAmount(merged.otherDeduction),
  };

  const customDeductions = compactLineItems(
    merged.customDeductions.map((item) => ({
      label: item.label,
      amount: roundAmount(item.amount),
    })),
  );
  const deductions = sumPayrollDeductions(deductionBreakdown) + sumLineItems(customDeductions);
  const netPay = grossPay - deductions;

  return {
    staffId: staff.id,
    staffName: staff.name,
    department: normalizeDepartmentLabel(staff.department),
    role: staff.role,
    employmentType: staff.contractType,
    unit: staff.unit,
    bankName: "Salary Bank",
    bankAccount: buildMaskedAccount(staff.id),
    taxId: buildTaxId(staff.id),
    paymentMethod: "Bank Transfer",
    payGrade: buildPayGrade(staff),
    payStep: staff.status,
    payrollRef: `PY-${staff.id}-${new Date().getFullYear()}`,
    baseSalary,
    grossPay,
    taxablePay: grossPay,
    employerPension: roundAmount(baseSalary * 0.10),
    taxPercent,
    customEarnings,
    customDeductions,
    allowanceBreakdown,
    deductionBreakdown,
    allowances,
    deductions,
    netPay,
  };
}

export function buildGeneratedPayslip(
  staff: StaffMember,
  period: string,
  monthKey: string,
  createdBy: string,
  adjustments: Partial<PayrollDraftAdjustments> = {},
): GeneratedPayslip {
  const entry = buildPayrollEntry(staff, adjustments);
  const earnings: GeneratedPayslip["earnings"] = [
    { label: "Basic Salary", amount: entry.baseSalary },
    ...getPayrollAllowanceRows(entry).map((row) => ({
      label: row.label,
      amount: row.value,
    })),
  ];
  const deductions: GeneratedPayslip["deductions"] = getPayrollDeductionRows(entry).map((row) => ({
    label: row.label,
    amount: row.value,
  }));

  return {
    id: `PS-${staff.id}-${monthKey}`,
    period,
    monthKey,
    department: entry.department as GeneratedPayslip["department"],
    staffId: staff.id,
    staffName: staff.name,
    role: staff.role,
    unit: staff.unit,
    bankName: entry.bankName,
    bankAccount: entry.bankAccount,
    taxId: entry.taxId,
    baseSalary: entry.baseSalary,
    earnings,
    deductions,
    grossPay: entry.grossPay ?? 0,
    totalDeductions: entry.deductions,
    netPay: entry.netPay,
    paymentStatus: "Processing",
    workflowStatus: "Generated",
    createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    createdBy,
  };
}

export function buildPayrollEntryFromPayslip(payslip: GeneratedPayslip): PayrollEntry {
  const earningsWithoutBase = payslip.earnings.filter((item) => item.label !== "Basic Salary");
  const deductionRows = payslip.deductions;
  const payeRow = deductionRows.find((item) => item.label.startsWith("PAYE"));
  const taxPercent = payeRow?.percentage ?? Number((payeRow?.label.match(/([\d.]+)%/)?.[1] ?? "0"));

  return {
    payslipId: payslip.id,
    monthKey: payslip.monthKey,
    staffId: payslip.staffId,
    staffName: payslip.staffName,
    department: payslip.department,
    role: payslip.role,
    unit: payslip.unit,
    bankName: payslip.bankName,
    bankAccount: payslip.bankAccount,
    taxId: payslip.taxId,
    paymentMethod: "Bank Transfer",
    payrollRef: payslip.id.replace("PS-", "PY-"),
    baseSalary: payslip.baseSalary,
    grossPay: payslip.grossPay,
    taxablePay: payslip.grossPay,
    taxPercent,
    customEarnings: earningsWithoutBase
      .filter((item) => !["Housing", "Transport", "Medical", "Meal", "Duty", "Overtime", "Bonus", "Arrears", "Other"].includes(item.label))
      .map((item) => ({ label: item.label, amount: item.amount })),
    customDeductions: deductionRows
      .filter((item) => !item.label.startsWith("PAYE") && !["Pension", "NHF", "Loan", "Insurance", "Absence", "Other"].includes(item.label))
      .map((item) => ({ label: item.label, amount: item.amount })),
    allowanceBreakdown: {
      housing: earningsWithoutBase.find((item) => item.label === "Housing")?.amount ?? 0,
      transport: earningsWithoutBase.find((item) => item.label === "Transport")?.amount ?? 0,
      medical: earningsWithoutBase.find((item) => item.label === "Medical")?.amount ?? 0,
      meal: earningsWithoutBase.find((item) => item.label === "Meal")?.amount ?? 0,
      duty: earningsWithoutBase.find((item) => item.label === "Duty")?.amount ?? 0,
      overtime: earningsWithoutBase.find((item) => item.label === "Overtime")?.amount ?? 0,
      bonus: earningsWithoutBase.find((item) => item.label === "Bonus")?.amount ?? 0,
      arrears: earningsWithoutBase.find((item) => item.label === "Arrears")?.amount ?? 0,
      other: earningsWithoutBase.find((item) => item.label === "Other")?.amount ?? 0,
    },
    deductionBreakdown: {
      paye: payeRow?.amount ?? 0,
      pension: deductionRows.find((item) => item.label === "Pension")?.amount ?? 0,
      nhf: deductionRows.find((item) => item.label === "NHF")?.amount ?? 0,
      loan: deductionRows.find((item) => item.label === "Loan")?.amount ?? 0,
      insurance: deductionRows.find((item) => item.label === "Insurance")?.amount ?? 0,
      absence: deductionRows.find((item) => item.label === "Absence")?.amount ?? 0,
      other: deductionRows.find((item) => item.label === "Other")?.amount ?? 0,
    },
    allowances: sumLineItems(earningsWithoutBase),
    deductions: payslip.totalDeductions,
    netPay: payslip.netPay,
  };
}

export function summarisePayrollEntries(entries: PayrollEntry[]) {
  return entries.reduce(
    (summary, entry) => ({
      gross: summary.gross + (entry.grossPay ?? entry.baseSalary + entry.allowances),
      allowances: summary.allowances + entry.allowances,
      deductions: summary.deductions + entry.deductions,
      net: summary.net + entry.netPay,
    }),
    { gross: 0, allowances: 0, deductions: 0, net: 0 },
  );
}
