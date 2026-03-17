"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";

const HOSPITAL = "Group Christian Medical Centre";
const HOSPITAL_ADDR = "12 Hospital Avenue, Lagos, Nigeria";
const HOSPITAL_TEL = "+234 801 234 5678";

// ─── seed staff list ───────────────────────────────────────────────────────────
type StaffRecord = {
  id: string;
  name: string;
  role: string;
  department: string;
  bankAccount: string;
  bank: string;
  taxId: string;
};

const STAFF_LIST: StaffRecord[] = [
  { id: "EMP-001", name: "Dr. Amaka Osei",      role: "Senior Doctor",        department: "Doctors",     bankAccount: "****4521", bank: "GTBank",   taxId: "TIN-8821" },
  { id: "EMP-002", name: "Dr. Kwame Mensah",    role: "Consultant",           department: "Doctors",     bankAccount: "****1102", bank: "Zenith",   taxId: "TIN-4432" },
  { id: "EMP-003", name: "Nurse Patricia",      role: "Senior Nurse",         department: "Nurses",      bankAccount: "****7743", bank: "Access",   taxId: "TIN-6601" },
  { id: "EMP-004", name: "Nurse Grace",         role: "Staff Nurse",          department: "Nurses",      bankAccount: "****9812", bank: "UBA",      taxId: "TIN-2234" },
  { id: "EMP-005", name: "James Adu",           role: "Pharmacist",           department: "Pharmacy",    bankAccount: "****3315", bank: "GTBank",   taxId: "TIN-5510" },
  { id: "EMP-006", name: "Tom Kwesi",           role: "Receptionist",         department: "Front Desk",  bankAccount: "****6672", bank: "FirstBank",taxId: "TIN-1198" },
  { id: "EMP-007", name: "Sarah Mensah",        role: "Accountant",           department: "Accounts",    bankAccount: "****0091", bank: "Zenith",   taxId: "TIN-7723" },
  { id: "EMP-008", name: "Kofi Acheampong",     role: "Store Manager",        department: "Store",       bankAccount: "****8834", bank: "Fidelity", taxId: "TIN-8809" },
  { id: "EMP-009", name: "Daniel Cole",         role: "IT Manager",           department: "IT",          bankAccount: "****4452", bank: "GTBank",   taxId: "TIN-3341" },
  { id: "EMP-010", name: "Grace Adebayo",       role: "HR Manager",           department: "HR",          bankAccount: "****2218", bank: "UBA",      taxId: "TIN-9912" },
];

const BASE_PAY: Record<string, number> = {
  Consultant:        480000, "Senior Doctor":   320000, "Junior Doctor":    220000, Resident:          160000,
  "Senior Nurse":    180000, "Staff Nurse":     140000, "Nursing Assistant":100000,
  Pharmacist:        200000, "Pharmacy Technician": 120000,
  Receptionist:      112000, "Senior Receptionist": 140000,
  Accountant:        180000, "Senior Accountant":   240000, "Finance Manager":  320000,
  "Store Manager":   160000, "Store Keeper":    120000,
  "IT Manager":      280000, "Systems Admin":   220000, "Support Technician": 140000,
  "HR Manager":      280000, "HR Officer":      180000,
  Administrator:     200000, "Department Head": 360000,
};

const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type PayslipData = {
  staff: StaffRecord;
  month: string;
  year: number;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  grossPay: number;
  pensionDeduction: number;
  taxDeduction: number;
  nhfDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  ytdGross: number;
  ytdNetPay: number;
  ytdTax: number;
};

function computePayslip(staff: StaffRecord, monthIdx: number, year: number): PayslipData {
  const basic       = BASE_PAY[staff.role] ?? 150000;
  const housing     = Math.round(basic * 0.15);
  const transport   = Math.round(basic * 0.10);
  const medical     = Math.round(basic * 0.05);
  const grossPay    = basic + housing + transport + medical;
  const pension     = Math.round(grossPay * 0.08);
  const tax         = Math.round(grossPay * 0.075);
  const nhf         = Math.round(basic * 0.025);
  const other       = 0;
  const totalDeduct = pension + tax + nhf + other;
  const netPay      = grossPay - totalDeduct;

  // YTD = sum from January through current month
  const monthsElapsed = monthIdx + 1;
  return {
    staff,
    month: MONTHS_EN[monthIdx],
    year,
    basicSalary:       basic,
    housingAllowance:  housing,
    transportAllowance:transport,
    medicalAllowance:  medical,
    grossPay,
    pensionDeduction:  pension,
    taxDeduction:      tax,
    nhfDeduction:      nhf,
    otherDeductions:   other,
    totalDeductions:   totalDeduct,
    netPay,
    ytdGross:    grossPay  * monthsElapsed,
    ytdNetPay:   netPay    * monthsElapsed,
    ytdTax:      tax       * monthsElapsed,
  };
}

// ─── print helpers ─────────────────────────────────────────────────────────────
function n(v: number) { return `₦${v.toLocaleString()}`; }

function buildPayslipHTML(ps: PayslipData): string {
  const row = (label: string, val: string, bold = false) =>
    `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">${label}</td>
     <td style="padding:5px 0;text-align:right;font-size:13px;font-weight:${bold ? "700" : "500"};color:#0f172a">${val}</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Payslip — ${ps.staff.name} — ${ps.month} ${ps.year}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;display:flex;justify-content:center;padding:20px}
  .slip{background:#fff;width:520px;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
  .header{background:#1e3a5f;color:#fff;padding:22px 24px}h1{font-size:16px;font-weight:800}
  .sub{font-size:11px;opacity:.7;margin-top:2px}.addr{font-size:10px;opacity:.55;margin-top:5px;line-height:1.6}
  .period-badge{display:inline-block;margin-top:10px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:2px 14px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase}
  .body{padding:20px 24px}.emp{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #e2e8f0}
  .emp label{color:#94a3b8}.emp span{font-weight:600;color:#0f172a}
  .section{margin-bottom:14px}.section h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#64748b;margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed #e2e8f0}
  table{width:100%;border-collapse:collapse}
  .total-row td{padding:10px 0;font-size:16px;font-weight:800;color:#0f172a;border-top:2px solid #0f172a}
  .ytd{margin-top:16px;background:#f8fafc;border-radius:8px;padding:12px 14px}
  .ytd h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#64748b;margin-bottom:8px}
  .ytd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ytd-item label{font-size:10px;color:#94a3b8;display:block}.ytd-item span{font-size:14px;font-weight:700;color:#0f172a}
  .footer{text-align:center;font-size:10px;color:#cbd5e1;margin-top:16px;padding-bottom:6px}
  @media print{body{background:#fff;padding:0}.slip{box-shadow:none;border-radius:0;width:100%}}</style>
  </head><body>
  <div class="slip">
    <div class="header">
      <h1>${HOSPITAL}</h1>
      <p class="sub">Employee Pay Advice</p>
      <p class="addr">${HOSPITAL_ADDR} · ${HOSPITAL_TEL}</p>
      <div class="period-badge">Payslip — ${ps.month} ${ps.year}</div>
    </div>
    <div class="body">
      <div class="emp">
        <div><label>Employee Name</label><span>${ps.staff.name}</span></div>
        <div><label>Employee ID</label><span>${ps.staff.id}</span></div>
        <div><label>Department</label><span>${ps.staff.department}</span></div>
        <div><label>Designation</label><span>${ps.staff.role}</span></div>
        <div><label>Bank</label><span>${ps.staff.bank} ${ps.staff.bankAccount}</span></div>
        <div><label>Tax ID</label><span>${ps.staff.taxId}</span></div>
      </div>
      <div class="section">
        <h3>Earnings</h3>
        <table>${row("Basic Salary", n(ps.basicSalary))}${row("Housing Allowance", n(ps.housingAllowance))}${row("Transport Allowance", n(ps.transportAllowance))}${row("Medical Allowance", n(ps.medicalAllowance))}<tr><td colspan="2" style="padding-top:2px"></td></tr><tr class="total-row"><td>Gross Pay</td><td style="text-align:right">${n(ps.grossPay)}</td></tr></table>
      </div>
      <div class="section">
        <h3>Deductions</h3>
        <table>${row("Pension (8%)", n(ps.pensionDeduction))}${row("Income Tax (7.5%)", n(ps.taxDeduction))}${row("NHF (2.5%)", n(ps.nhfDeduction))}${ps.otherDeductions ? row("Other", n(ps.otherDeductions)) : ""}
        <tr class="total-row"><td>Total Deductions</td><td style="text-align:right">${n(ps.totalDeductions)}</td></tr></table>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:13px;font-weight:600;color:#15803d">NET PAY</span>
        <span style="font-size:22px;font-weight:800;color:#15803d">${n(ps.netPay)}</span>
      </div>
      <div class="ytd">
        <h3>Year-to-Date (Jan – ${ps.month} ${ps.year})</h3>
        <div class="ytd-grid">
          <div class="ytd-item"><label>YTD Gross Pay</label><span>${n(ps.ytdGross)}</span></div>
          <div class="ytd-item"><label>YTD Net Pay</label><span>${n(ps.ytdNetPay)}</span></div>
          <div class="ytd-item"><label>YTD Tax Paid</label><span>${n(ps.ytdTax)}</span></div>
        </div>
      </div>
    </div>
    <p class="footer">This payslip is computer generated. ${HOSPITAL} · ${new Date().getFullYear()}</p>
  </div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;
}

function printPayslip(ps: PayslipData): void {
  const win = window.open("", "_blank", "width=600,height=780,scrollbars=yes");
  if (!win) return;
  win.document.write(buildPayslipHTML(ps));
  win.document.close();
}

function downloadPayslip(ps: PayslipData): void {
  const html = buildPayslipHTML(ps);
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Payslip_${ps.staff.id}_${ps.month}_${ps.year}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function HRPayslipsPage() {
  const { payrollBatches } = useAccountsStore();
  const [selectedMonth, setSelectedMonth] = useState(2);  // March (0-indexed)
  const [selectedYear, setSelectedYear]   = useState(2026);
  const [searchQ, setSearchQ]             = useState("");
  const [sentTo, setSentTo]               = useState<Set<string>>(new Set());
  const [viewPayslip, setViewPayslip]     = useState<PayslipData | null>(null);
  const [toast, setToast]                 = useState<ToastData | null>(null);

  const payslips = useMemo(
    () => STAFF_LIST.map((s) => computePayslip(s, selectedMonth, selectedYear)),
    [selectedMonth, selectedYear],
  );

  const filtered = payslips.filter((ps) =>
    ps.staff.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    ps.staff.department.toLowerCase().includes(searchQ.toLowerCase()) ||
    ps.staff.role.toLowerCase().includes(searchQ.toLowerCase()),
  );

  const totalGross  = payslips.reduce((s, p) => s + p.grossPay, 0);
  const totalNet    = payslips.reduce((s, p) => s + p.netPay, 0);
  const totalTax    = payslips.reduce((s, p) => s + p.taxDeduction, 0);
  const sentCount   = sentTo.size;

  function handleSend(ps: PayslipData) {
    setSentTo((prev) => new Set([...prev, ps.staff.id]));
    setToast({ message: `Payslip sent to ${ps.staff.name}'s staff profile.`, type: "success" });
  }

  function handleSendAll() {
    setSentTo(new Set(STAFF_LIST.map((s) => s.id)));
    setToast({ message: `All ${STAFF_LIST.length} payslips sent to staff profiles.`, type: "success" });
  }

  function handlePrintAll() {
    payslips.forEach((ps, i) => {
      setTimeout(() => printPayslip(ps), i * 800);
    });
    setToast({ message: `Printing ${payslips.length} payslips…`, type: "info" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Payslips"
        description="Generate, view, print, and send payslips to individual staff profiles."
        action={
          <div className="flex gap-2">
            <Button size="md" variant="outline" onClick={handleSendAll}>Send All to Profiles</Button>
            <Button size="md" onClick={handlePrintAll}>Print All ({STAFF_LIST.length})</Button>
          </div>
        }
      />

      {/* Controls */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {MONTHS_EN.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Search Staff</label>
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Name, department, role…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{sentCount}</span> of {STAFF_LIST.length} sent
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Gross Pay",   value: n(totalGross),  color: "text-slate-900" },
          { label: "Total Net Pay",     value: n(totalNet),    color: "text-emerald-700" },
          { label: "Total Tax (PAYE)",  value: n(totalTax),    color: "text-orange-700" },
          { label: "Staff Count",       value: `${payslips.length} staff`, color: "text-sky-700" },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Payslips table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {MONTHS_EN[selectedMonth]} {selectedYear} — {filtered.length} payslips
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Employee", "Department", "Role", "Gross Pay", "Deductions", "Net Pay", "YTD Net", "Status", "Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ps) => {
                const isSent = sentTo.has(ps.staff.id);
                return (
                  <tr key={ps.staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{ps.staff.name}</p>
                      <p className="text-xs text-slate-400">{ps.staff.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ps.staff.department}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{ps.staff.role}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{n(ps.grossPay)}</td>
                    <td className="px-4 py-3 text-red-600">−{n(ps.totalDeductions)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{n(ps.netPay)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{n(ps.ytdNetPay)}</td>
                    <td className="px-4 py-3">
                      {isSent ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">✓ Sent</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setViewPayslip(ps)}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => printPayslip(ps)}>🖨</Button>
                        <Button size="sm" variant="outline" onClick={() => downloadPayslip(ps)}>⬇</Button>
                        {!isSent && (
                          <Button size="sm" onClick={() => handleSend(ps)}>Send</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payslip preview modal */}
      {viewPayslip && (
        <Modal open={true} onClose={() => setViewPayslip(null)} title={`Payslip — ${viewPayslip.staff.name}`} className="max-w-lg">
          <div className="space-y-4 text-sm">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
              {[
                ["Employee", viewPayslip.staff.name],
                ["ID", viewPayslip.staff.id],
                ["Department", viewPayslip.staff.department],
                ["Role", viewPayslip.staff.role],
                ["Period", `${viewPayslip.month} ${viewPayslip.year}`],
                ["Bank", `${viewPayslip.staff.bank} ${viewPayslip.staff.bankAccount}`],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-slate-400">{l}</p>
                  <p className="font-semibold text-slate-900">{v}</p>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Earnings</p>
              <div className="rounded-lg border border-slate-100 divide-y divide-slate-50">
                {[
                  ["Basic Salary",          n(viewPayslip.basicSalary)],
                  ["Housing Allowance",     n(viewPayslip.housingAllowance)],
                  ["Transport Allowance",   n(viewPayslip.transportAllowance)],
                  ["Medical Allowance",     n(viewPayslip.medicalAllowance)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-slate-600">{l}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 font-bold">
                  <span>Gross Pay</span>
                  <span>{n(viewPayslip.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Deductions</p>
              <div className="rounded-lg border border-slate-100 divide-y divide-slate-50">
                {[
                  ["Pension (8%)",      n(viewPayslip.pensionDeduction)],
                  ["Income Tax (7.5%)", n(viewPayslip.taxDeduction)],
                  ["NHF (2.5%)",        n(viewPayslip.nhfDeduction)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-slate-600">{l}</span>
                    <span className="font-semibold text-red-600">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 font-bold text-red-700">
                  <span>Total Deductions</span>
                  <span>{n(viewPayslip.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net pay */}
            <div className="rounded-xl bg-emerald-50 px-4 py-3 flex justify-between items-center">
              <span className="font-bold text-emerald-900">NET PAY</span>
              <span className="text-2xl font-bold text-emerald-700">{n(viewPayslip.netPay)}</span>
            </div>

            {/* YTD */}
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Year-to-Date (Jan – {viewPayslip.month} {viewPayslip.year})</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[["YTD Gross", n(viewPayslip.ytdGross)], ["YTD Net", n(viewPayslip.ytdNetPay)], ["YTD Tax", n(viewPayslip.ytdTax)]].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-slate-400">{l}</p>
                    <p className="font-bold text-slate-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setViewPayslip(null)}>Close</Button>
            <Button variant="outline" size="md" onClick={() => downloadPayslip(viewPayslip)}>⬇ Download</Button>
            <Button size="md" onClick={() => { printPayslip(viewPayslip); setViewPayslip(null); }}>🖨 Print</Button>
            {!sentTo.has(viewPayslip.staff.id) && (
              <Button size="md" onClick={() => { handleSend(viewPayslip); setViewPayslip(null); }}>Send to Profile</Button>
            )}
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
