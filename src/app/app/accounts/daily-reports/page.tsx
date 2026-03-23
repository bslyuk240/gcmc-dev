"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";

type DateLike = string | undefined;
type RangePreset = "today" | "week" | "month" | "custom";

const money = (value: number) => `NGN ${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateOnly = (value?: string) => (value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "-";
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const toInputDate = () => {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const startOfWeekInput = () => {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return toInputDateFromDate(start);
};

const startOfMonthInput = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return toInputDateFromDate(start);
};

const toInputDateFromDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const parseDate = (value?: string, endOfDay = false) => {
  if (!value) return undefined;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const within = (value: DateLike, start?: Date, end?: Date) => {
  if (!value) return false;
  const ts = new Date(value).getTime();
  return !Number.isNaN(ts) && (!start || ts >= start.getTime()) && (!end || ts <= end.getTime());
};

const filterRange = <T,>(items: T[], getTs: (item: T) => DateLike, start?: Date, end?: Date) => items.filter((item) => within(getTs(item), start, end));
const sumBy = <T,>(items: T[], pick: (item: T) => number) => items.reduce((sum, item) => sum + pick(item), 0);

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AccountsDailyReportsPage() {
  const { frontDeskCharges, consultationFees, labCharges, nursingCharges, supplierPayments, payrollBatches, kioskSales } = useAccountsStore();
  const { bills: pharmacyBills } = usePharmacyStore();
  const [startDate, setStartDate] = useState(toInputDate);
  const [endDate, setEndDate] = useState(toInputDate);
  const [preset, setPreset] = useState<RangePreset>("today");

  const range = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate, true);
    if (start && end && start > end) return { start: parseDate(endDate), end: parseDate(startDate, true) };
    return { start, end };
  }, [startDate, endDate]);

  const frontDesk = useMemo(() => filterRange(frontDeskCharges, (x) => x.paidAt ?? x.createdAt, range.start, range.end), [frontDeskCharges, range]);
  const consultation = useMemo(() => filterRange(consultationFees, (x) => x.paidAt ?? x.consultedAt, range.start, range.end), [consultationFees, range]);
  const lab = useMemo(() => filterRange(labCharges, (x) => x.paidAt ?? x.completedAt, range.start, range.end), [labCharges, range]);
  const nursing = useMemo(() => filterRange(nursingCharges, (x) => x.paidAt ?? x.performedAt, range.start, range.end), [nursingCharges, range]);
  const pharmacy = useMemo(() => filterRange(pharmacyBills, (x) => x.paidAt ?? x.dispensedAt, range.start, range.end), [pharmacyBills, range]);
  const kiosk = useMemo(() => filterRange(kioskSales, (x) => x.reportedAt ?? x.date, range.start, range.end), [kioskSales, range]);
  const suppliers = useMemo(() => filterRange(supplierPayments, (x) => x.paidAt ?? x.submittedAt, range.start, range.end), [supplierPayments, range]);
  const payroll = useMemo(() => filterRange(payrollBatches, (x) => x.paidAt ?? x.approvedAt ?? x.preparedAt, range.start, range.end), [payrollBatches, range]);

  const frontDeskPaid = frontDesk.filter((x) => x.status === "Paid");
  const consultationPaid = consultation.filter((x) => x.status === "Paid");
  const labPaid = lab.filter((x) => x.status === "Paid");
  const nursingPaid = nursing.filter((x) => x.status === "Paid");
  const pharmacyPaid = pharmacy.filter((x) => x.billStatus === "Paid");
  const kioskConfirmed = kiosk.filter((x) => x.status === "Confirmed");
  const supplierPaid = suppliers.filter((x) => x.status === "Paid");
  const payrollPaid = payroll.filter((x) => x.status === "Paid");

  const revenueInRange =
    sumBy(frontDeskPaid, (x) => x.amount) +
    sumBy(consultationPaid, (x) => x.fee) +
    sumBy(labPaid, (x) => x.amount) +
    sumBy(nursingPaid, (x) => x.amount) +
    sumBy(pharmacyPaid, (x) => x.totalCost) +
    sumBy(kioskConfirmed, (x) => x.totalRevenue);
  const outflowInRange = sumBy(supplierPaid, (x) => x.amount) + sumBy(payrollPaid, (x) => x.totalAmount);
  const totalPending =
    sumBy(frontDesk.filter((x) => x.status !== "Paid"), (x) => x.amount) +
    sumBy(consultation.filter((x) => x.status !== "Paid"), (x) => x.fee) +
    sumBy(lab.filter((x) => x.status !== "Paid"), (x) => x.amount) +
    sumBy(nursing.filter((x) => x.status !== "Paid"), (x) => x.amount) +
    sumBy(pharmacy.filter((x) => x.billStatus !== "Paid"), (x) => x.totalCost);
  const openQueues = frontDesk.filter((x) => x.status !== "Paid").length + consultation.filter((x) => x.status !== "Paid").length + lab.filter((x) => x.status !== "Paid").length + nursing.filter((x) => x.status !== "Paid").length + pharmacy.filter((x) => x.billStatus !== "Paid").length;

  const rangeLabel = useMemo(() => (startDate === endDate ? formatDateOnly(startDate) : `${formatDateOnly(startDate)} to ${formatDateOnly(endDate)}`), [startDate, endDate]);

  function applyPreset(nextPreset: RangePreset) {
    const today = toInputDate();
    if (nextPreset === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (nextPreset === "week") {
      setStartDate(startOfWeekInput());
      setEndDate(today);
    } else if (nextPreset === "month") {
      setStartDate(startOfMonthInput());
      setEndDate(today);
    }
    setPreset(nextPreset);
  }

  const reportSources = useMemo(
    () =>
      [
        { label: "Front Desk", count: frontDeskPaid.length, total: sumBy(frontDeskPaid, (x) => x.amount), href: "/app/accounts/receive-payment" },
        { label: "Consultation", count: consultationPaid.length, total: sumBy(consultationPaid, (x) => x.fee), href: "/app/accounts/consultation-fees" },
        { label: "Lab", count: labPaid.length, total: sumBy(labPaid, (x) => x.amount), href: "/app/accounts/lab-billing" },
        { label: "Nursing", count: nursingPaid.length, total: sumBy(nursingPaid, (x) => x.amount), href: "/app/accounts/nursing-billing" },
        { label: "Pharmacy", count: pharmacyPaid.length, total: sumBy(pharmacyPaid, (x) => x.totalCost), href: "/app/accounts/pharmacy-billing" },
        { label: "Kiosk", count: kioskConfirmed.length, total: sumBy(kioskConfirmed, (x) => x.totalRevenue), href: "/app/accounts/kiosk" },
        { label: "Supplier Payments", count: supplierPaid.length, total: sumBy(supplierPaid, (x) => x.amount), href: "/app/accounts/supplier-payments" },
        { label: "Payroll", count: payrollPaid.length, total: sumBy(payrollPaid, (x) => x.totalAmount), href: "/app/accounts/payroll" },
      ].sort((a, b) => b.total - a.total),
    [consultationPaid, frontDeskPaid, kioskConfirmed, labPaid, nursingPaid, payrollPaid, pharmacyPaid, supplierPaid],
  );

  const activityRows = useMemo(() => {
    const rows = [
      ...frontDesk.map((x) => ({ source: "Front Desk", name: x.patientName, detail: x.description, amount: x.amount, time: x.paidAt ?? x.createdAt, status: x.status })),
      ...consultation.map((x) => ({ source: "Consultation", name: x.patientName, detail: x.consultationType, amount: x.fee, time: x.paidAt ?? x.consultedAt, status: x.status })),
      ...lab.map((x) => ({ source: "Lab", name: x.patientName, detail: x.testName, amount: x.amount, time: x.paidAt ?? x.completedAt, status: x.status })),
      ...nursing.map((x) => ({ source: "Nursing", name: x.patientName, detail: x.procedureType, amount: x.amount, time: x.paidAt ?? x.performedAt, status: x.status })),
      ...pharmacy.map((x) => ({ source: "Pharmacy", name: x.patientName, detail: x.source, amount: x.totalCost, time: x.paidAt ?? x.dispensedAt, status: x.billStatus })),
      ...kiosk.map((x) => ({ source: "Kiosk", name: x.reportedBy, detail: `${x.itemsSold} items sold`, amount: x.totalRevenue, time: x.reportedAt ?? x.date, status: x.status })),
      ...suppliers.map((x) => ({ source: "Supplier", name: x.supplier, detail: x.description, amount: x.amount, time: x.paidAt ?? x.submittedAt, status: x.status })),
      ...payroll.map((x) => ({ source: "Payroll", name: x.preparedBy, detail: x.period, amount: x.totalAmount, time: x.paidAt ?? x.approvedAt ?? x.preparedAt, status: x.status })),
    ];
    return rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [consultation, frontDesk, kiosk, lab, nursing, payroll, pharmacy, suppliers]);

  function printPdfReport() {
    const titleRange = startDate === endDate ? formatDateOnly(startDate) : `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`;
    const generatedAt = formatDateTime(new Date().toISOString());
    const sourceCards = reportSources.map((row) => `<section class="src"><div><b>${escapeHtml(row.label)}</b><div class="muted">${row.count} receipts confirmed</div></div><div class="amt">${escapeHtml(money(row.total))}</div></section>`).join("");
    const snapshotRowsData: Array<[string, number]> = [
      ["Front Desk pending", sumBy(frontDesk.filter((x) => x.status !== "Paid"), (x) => x.amount)],
      ["Consultation pending", sumBy(consultation.filter((x) => x.status !== "Paid"), (x) => x.fee)],
      ["Lab pending", sumBy(lab.filter((x) => x.status !== "Paid"), (x) => x.amount)],
      ["Nursing pending", sumBy(nursing.filter((x) => x.status !== "Paid"), (x) => x.amount)],
      ["Pharmacy pending", sumBy(pharmacy.filter((x) => x.billStatus !== "Paid"), (x) => x.totalCost)],
      ["Supplier disbursements", sumBy(supplierPaid, (x) => x.amount)],
      ["Payroll disbursements", sumBy(payrollPaid, (x) => x.totalAmount)],
    ];
    const snapshotRows = snapshotRowsData
      .map(([label, value]) => `<div class="snap"><span>${escapeHtml(label)}</span><strong>${escapeHtml(money(value))}</strong></div>`)
      .join("");
    const activityHtml = activityRows
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.detail)}</td><td>${escapeHtml(money(item.amount))}</td><td>${escapeHtml(formatDateTime(item.time))}</td><td><span class="badge ${item.status === "Paid" || item.status === "Confirmed" ? "ok" : item.status === "Pending" || item.status === "Billed" ? "warn" : "muted-b"}">${escapeHtml(item.status)}</span></td></tr>`,
      )
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GCMC Financial Report</title><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#eef2f7;color:#0f172a}.sheet{padding:20px;background:linear-gradient(180deg,#f8fbff 0%,#eef2f7 100%);min-height:100vh}.page{background:#fff;border:1px solid #dbe3ee;border-radius:20px;overflow:hidden}.head{display:flex;justify-content:space-between;gap:20px;padding:24px 28px;border-bottom:1px solid #e2e8f0}.brand{display:flex;gap:14px;align-items:center}.logo{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#0f9d58,#0ea5e9);color:#fff;display:grid;place-items:center;font-weight:800}.muted{color:#64748b}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 28px 0}.card{border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:#fff;min-height:108px}.label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b}.val{margin-top:8px;font-size:24px;font-weight:800}.wrap{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;padding:16px 28px 0}.panel{border:1px solid #e2e8f0;border-radius:18px;padding:18px;background:#fff}.srcs{display:grid;gap:10px;margin-top:14px}.src{border:1px solid #e2e8f0;border-radius:14px;padding:14px;display:flex;justify-content:space-between;gap:10px}.amt{font-weight:800}.snaps{display:grid;gap:8px;margin-top:14px}.snap{display:flex;justify-content:space-between;padding:11px 12px;border-radius:12px;background:#f8fafc}.tablewrap{padding:16px 28px 28px}table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#fff}th,td{padding:12px 14px;border-bottom:1px solid #eef2f7;text-align:left;font-size:13px}th{background:#f8fafc;color:#64748b;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase}.ok{background:#dcfce7;color:#15803d}.warn{background:#fef3c7;color:#b45309}.muted-b{background:#e2e8f0;color:#475569}.footer{display:flex;justify-content:space-between;padding:0 28px 24px;color:#64748b;font-size:12px}</style></head><body><div class="sheet"><div class="page"><div class="head"><div class="brand"><div class="logo">GC</div><div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;">Group Christian Medical Centre</div><h1 style="margin:4px 0 0;font-size:24px;">Financial Report</h1><div class="muted">Live summary of the selected period</div></div></div><div style="text-align:right"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;">Period</div><div style="font-size:18px;font-weight:800">${escapeHtml(titleRange)}</div><div class="muted">Generated ${escapeHtml(generatedAt)}</div></div></div><div class="grid4"><div class="card"><div class="label">Revenue in Range</div><div class="val" style="color:#0f9d58">${escapeHtml(money(revenueInRange))}</div><div class="muted">All live sources</div></div><div class="card"><div class="label">Collected in Range</div><div class="val">${escapeHtml(money(revenueInRange))}</div><div class="muted">Confirmed receipts</div></div><div class="card"><div class="label">Outstanding in Range</div><div class="val" style="color:#d97706">${escapeHtml(money(totalPending))}</div><div class="muted">Pending collection</div></div><div class="card"><div class="label">Open Queues</div><div class="val" style="color:#7c3aed">${openQueues}</div><div class="muted">Items awaiting payment</div></div></div><div class="wrap"><div class="panel"><h2 style="margin:0">Revenue by Source</h2><div class="muted" style="margin-top:6px;font-size:13px;">Confirmed totals from the selected period.</div><div class="srcs">${sourceCards}</div></div><div class="panel"><h2 style="margin:0">Report Snapshot</h2><div class="muted" style="margin-top:6px;font-size:13px;">Current totals across the selected queues.</div><div class="snaps">${snapshotRows}<div class="snap" style="background:#ecfdf5;color:#065f46;font-weight:700;"><span>Total financial activity</span><strong>${escapeHtml(money(revenueInRange + outflowInRange))}</strong></div></div></div></div><div class="tablewrap"><div class="panel" style="padding:0;overflow:hidden;"><div style="padding:16px 18px;border-bottom:1px solid #e2e8f0;"><h2 style="margin:0">Recent Financial Activity</h2><div class="muted" style="margin-top:6px;font-size:13px;">Latest receipts and payments across the selected period.</div></div><table><thead><tr><th>Source</th><th>Name</th><th>Details</th><th>Amount</th><th>Time</th><th>Status</th></tr></thead><tbody>${activityHtml || `<tr><td colspan="6" style="padding:24px;text-align:center;color:#64748b;">No financial activity found for the selected period.</td></tr>`}</tbody></table></div></div><div class="footer"><span>Generated from live Accounts and Pharmacy data.</span><span>${escapeHtml(generatedAt)}</span></div></div></div></body></html>`;

    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.setAttribute("aria-hidden", "true");
    const cleanup = () => frame.remove();
    frame.onload = () =>
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } finally {
          setTimeout(cleanup, 1000);
        }
      }, 250);
    frame.addEventListener("afterprint", cleanup);
    document.body.appendChild(frame);
    frame.srcdoc = html;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description={`Review and print live collections for ${rangeLabel}.`}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-wrap gap-2">
              {(["today", "week", "month", "custom"] as RangePreset[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={preset === item ? "primary" : "outline"}
                  onClick={() => applyPreset(item)}
                  className="capitalize"
                >
                  {item === "today" ? "Today" : item === "week" ? "This Week" : item === "month" ? "This Month" : "Custom"}
                </Button>
              ))}
            </div>
            <div className="grid gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPreset("custom");
                  setStartDate(e.target.value);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPreset("custom");
                  setEndDate(e.target.value);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-emerald-500"
              />
            </div>
            <Button variant="outline" onClick={printPdfReport}>Download PDF</Button>
            <Button asChild><Link href="/app/accounts/receive-payment">Open Collections</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue in Range", value: money(revenueInRange), sub: "All live sources", color: "text-emerald-700" },
          { label: "Collected in Range", value: money(revenueInRange), sub: "Confirmed receipts", color: "text-slate-900" },
          { label: "Outstanding", value: money(totalPending), sub: "Pending collection", color: "text-amber-700" },
          { label: "Open Queues", value: openQueues, sub: "Items awaiting payment", color: "text-violet-700" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Revenue by Source</h3>
          <p className="text-sm text-slate-500">Live totals from the selected period.</p>
          <div className="mt-4 space-y-3">
            {reportSources.map((row) => (
              <div key={row.label} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{row.label}</p>
                    <p className="text-xs text-slate-500">{row.count} receipts confirmed</p>
                  </div>
                  <p className="font-bold text-slate-900">{money(row.total)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (row.total / Math.max(revenueInRange, 1)) * 100)}%` }} />
                  </div>
                  <Button asChild size="sm" variant="ghost" className="ml-3"><Link href={row.href}>Open</Link></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Report Snapshot</h3>
          <p className="mt-1 text-sm text-slate-500">Current totals across the selected queues.</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Front Desk pending</span><span className="font-semibold">{money(sumBy(frontDesk.filter((x) => x.status !== "Paid"), (x) => x.amount))}</span></div>
            <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Consultation pending</span><span className="font-semibold">{money(sumBy(consultation.filter((x) => x.status !== "Paid"), (x) => x.fee))}</span></div>
            <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Lab pending</span><span className="font-semibold">{money(sumBy(lab.filter((x) => x.status !== "Paid"), (x) => x.amount))}</span></div>
            <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Nursing pending</span><span className="font-semibold">{money(sumBy(nursing.filter((x) => x.status !== "Paid"), (x) => x.amount))}</span></div>
            <div className="flex justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Pharmacy pending</span><span className="font-semibold">{money(sumBy(pharmacy.filter((x) => x.billStatus !== "Paid"), (x) => x.totalCost))}</span></div>
            <div className="flex justify-between rounded-xl bg-emerald-50 px-4 py-3"><span className="font-semibold text-emerald-800">Total financial activity</span><span className="font-bold text-emerald-900">{money(revenueInRange + outflowInRange)}</span></div>
          </div>
        </Card>
      </div>

      <div className="space-y-3 lg:hidden">
        {activityRows.map((item, index) => (
          <Card key={`${item.source}-${index}`} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{item.source}</p>
                <p className="text-xs text-slate-500">{item.name}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  item.status === "Paid" || item.status === "Confirmed"
                    ? "bg-emerald-50 text-emerald-700"
                    : item.status === "Pending" || item.status === "Billed"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.status}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <MobileMeta label="Details" value={item.detail} />
              <MobileMeta label="Amount" value={money(item.amount)} />
              <MobileMeta label="Time" value={formatDateTime(item.time)} />
            </div>
          </Card>
        ))}
        {activityRows.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-400">No financial activity found for the selected period.</Card>
        )}
      </div>

      <Card className="hidden overflow-hidden p-0 lg:block">
        <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">Recent Financial Activity</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Source", "Name", "Details", "Amount", "Time", "Status"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityRows.length ? activityRows.map((item, index) => (
                <tr key={`${item.source}-${index}`} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{item.source}</td>
                  <td className="px-5 py-3 text-slate-700">{item.name}</td>
                  <td className="px-5 py-3 text-slate-500">{item.detail}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{money(item.amount)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDateTime(item.time)}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.status === "Paid" || item.status === "Confirmed" ? "bg-emerald-100 text-emerald-700" : item.status === "Pending" || item.status === "Billed" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.status}</span></td>
                </tr>
              )) : (
                <tr><td className="px-5 py-6 text-center text-sm text-slate-400" colSpan={6}>No financial activity found for the selected period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
