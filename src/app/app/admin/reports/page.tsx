"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { fetchInvoices, fetchPayments, type InvoiceRecord, type PaymentRecord } from "@/lib/supabase/db";

function money(value: number) {
  return `NGN ${value.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function AdminReportsPage() {
  const { frontDeskCharges, consultationFees, supplierPayments, payrollBatches, kioskSales, labCharges, nursingCharges, metrics } =
    useAccountsStore();
  const { bills: pharmacyBills, metrics: pharmacyMetrics } = usePharmacyStore();
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRecord[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    let alive = true;
    const loadInvoices = async () => {
      try {
        const [rows, payments] = await Promise.all([fetchInvoices(), fetchPayments()]);
        if (!alive) return;
        setInvoiceRows(rows);
        setInvoicePayments(payments);
      } catch (error) {
        if (!alive) return;
        console.error("[admin-reports] invoice load failed:", error);
      }
    };
    void loadInvoices();
    const refresh = () => { void loadInvoices(); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    return () => { alive = false; window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh); };
  }, []);

  const invoiceRevenueToday = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return invoicePayments
      .filter((p) => p.paidAt.startsWith(todayIso))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [invoicePayments]);

  const invoicePendingBalance = useMemo(
    () => invoiceRows
      .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + Math.max(0, inv.amountDue - inv.amountPaid), 0),
    [invoiceRows],
  );

  const invoicePendingCount = useMemo(
    () => invoiceRows.filter((inv) => inv.status !== "paid" && inv.status !== "cancelled").length,
    [invoiceRows],
  );

  const sources = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return [
      { label: "Front Desk",        total: frontDeskCharges.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0),       count: frontDeskCharges.filter((i) => i.status === "Paid").length },
      { label: "Consultation",      total: consultationFees.filter((i) => i.status === "Paid").reduce((s, i) => s + i.fee, 0),          count: consultationFees.filter((i) => i.status === "Paid").length },
      { label: "Lab",               total: labCharges.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0),             count: labCharges.filter((i) => i.status === "Paid").length },
      { label: "Nursing",           total: nursingCharges.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0),         count: nursingCharges.filter((i) => i.status === "Paid").length },
      { label: "Pharmacy",          total: pharmacyBills.filter((i) => i.billStatus === "Paid").reduce((s, i) => s + i.totalCost, 0),   count: pharmacyBills.filter((i) => i.billStatus === "Paid").length },
      { label: "Invoices",          total: invoiceRevenueToday,                                                                          count: invoicePayments.filter((p) => p.paidAt.startsWith(todayIso)).length },
      { label: "Kiosk",             total: kioskSales.filter((i) => i.status === "Confirmed").reduce((s, i) => s + i.totalRevenue, 0),  count: kioskSales.filter((i) => i.status === "Confirmed").length },
      { label: "Supplier Payments", total: supplierPayments.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0),       count: supplierPayments.filter((i) => i.status === "Paid").length },
      { label: "Payroll",           total: payrollBatches.filter((i) => i.status === "Paid").reduce((s, i) => s + i.totalAmount, 0),    count: payrollBatches.filter((i) => i.status === "Paid").length },
    ]
      .filter((s) => s.total > 0 || s.count > 0)
      .sort((a, b) => b.total - a.total);
  }, [consultationFees, frontDeskCharges, invoicePayments, invoiceRevenueToday, kioskSales, labCharges, nursingCharges, payrollBatches, pharmacyBills, supplierPayments]);

  const recentActivity = useMemo(() => {
    const items = [
      ...frontDeskCharges.slice(0, 3).map((i) => ({ source: "Front Desk", name: i.patientName, detail: i.description, amount: i.amount, time: i.paidAt ?? i.createdAt, status: i.status })),
      ...consultationFees.slice(0, 3).map((i) => ({ source: "Consultation", name: i.patientName, detail: i.consultationType, amount: i.fee, time: i.paidAt ?? i.consultedAt, status: i.status })),
      ...labCharges.slice(0, 2).map((i) => ({ source: "Lab", name: i.patientName, detail: i.testName, amount: i.amount, time: i.paidAt ?? i.completedAt, status: i.status })),
      ...nursingCharges.slice(0, 2).map((i) => ({ source: "Nursing", name: i.patientName, detail: i.procedureType, amount: i.amount, time: i.paidAt ?? i.performedAt, status: i.status })),
      ...pharmacyBills.slice(0, 2).map((i) => ({ source: "Pharmacy", name: i.patientName, detail: i.source, amount: i.totalCost, time: i.paidAt ?? i.dispensedAt, status: i.billStatus })),
      ...invoicePayments.slice(0, 2).map((i) => ({ source: "Invoice", name: invoiceRows.find((r) => r.id === i.invoiceId)?.invoiceNumber ?? i.invoiceId, detail: i.paymentMethod, amount: i.amount, time: i.paidAt, status: "Paid" })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 12);
    return items;
  }, [consultationFees, frontDeskCharges, invoicePayments, invoiceRows, labCharges, nursingCharges, pharmacyBills]);

  const revenueToday    = metrics.revenueToday + pharmacyMetrics.revenueCollected + invoiceRevenueToday;
  const collectedToday  = metrics.frontDeskPaidToday + metrics.labPaidToday + metrics.nursingPaidToday + metrics.kioskRevenueToday + pharmacyMetrics.revenueCollected + invoiceRevenueToday;
  const pendingTotal    = metrics.frontDeskPendingValue + metrics.consultationPendingValue + metrics.supplierPendingValue + metrics.payrollPendingValue + metrics.labPendingValue + metrics.nursingPendingValue + pharmacyMetrics.pendingBillValue + invoicePendingBalance;
  const openQueues      = metrics.frontDeskPendingCount + metrics.consultationPendingCount + metrics.labPendingCount + metrics.nursingPendingCount + pharmacyMetrics.pendingBills + invoicePendingCount;
  const maxSource       = Math.max(...sources.map((s) => s.total), 1);

  // ─── PDF Generator ────────────────────────────────────────────────────────
  function downloadPDF() {
    const now   = new Date();
    const today = formatDate(now);
    const ts    = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const sourceRows = sources
      .map((s) => `
        <tr>
          <td>${s.label}</td>
          <td>${s.count} receipt${s.count !== 1 ? "s" : ""}</td>
          <td style="text-align:right;font-weight:700;color:#065f46">${money(s.total)}</td>
        </tr>`)
      .join("");

    const activityRows = recentActivity
      .map((item) => `
        <tr>
          <td><span class="badge">${item.source}</span></td>
          <td>${item.name}</td>
          <td style="color:#64748b">${item.detail ?? "—"}</td>
          <td style="text-align:right;font-weight:600">${money(item.amount)}</td>
          <td style="color:#64748b">${formatDateTime(item.time)}</td>
          <td><span class="status ${item.status === "Paid" || item.status === "Confirmed" ? "status-paid" : item.status === "Pending" || item.status === "Billed" ? "status-pending" : "status-other"}">${item.status}</span></td>
        </tr>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>GCMC Financial Report — ${today}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;color:#0f172a;background:#fff;padding:0}
  /* ── Header ── */
  .header{background:linear-gradient(135deg,#0f766e 0%,#0d9488 50%,#0891b2 100%);color:#fff;padding:40px 48px 36px;display:flex;align-items:flex-start;justify-content:space-between}
  .header-left h1{font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px}
  .header-left p{font-size:13px;opacity:0.85;font-weight:500}
  .header-right{text-align:right}
  .header-right .report-label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.7;margin-bottom:4px}
  .header-right .report-date{font-size:13px;font-weight:600}
  .header-right .report-time{font-size:12px;opacity:0.75;margin-top:2px}
  .org-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;margin-bottom:16px}
  .org-badge .dot{width:8px;height:8px;border-radius:50%;background:#34d399}
  .org-badge span{font-size:12px;font-weight:600;opacity:0.95}
  /* ── Body ── */
  .body{padding:40px 48px}
  /* ── KPI Strip ── */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:36px}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;position:relative;overflow:hidden}
  .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
  .kpi.revenue::before{background:#10b981}
  .kpi.collected::before{background:#3b82f6}
  .kpi.pending::before{background:#f59e0b}
  .kpi.queues::before{background:#8b5cf6}
  .kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px}
  .kpi-value{font-size:20px;font-weight:800;color:#0f172a;line-height:1}
  .kpi.revenue .kpi-value{color:#059669}
  .kpi.pending .kpi-value{color:#d97706}
  .kpi.queues .kpi-value{color:#7c3aed}
  .kpi-sub{font-size:11px;color:#94a3b8;margin-top:6px}
  /* ── Section heading ── */
  .section-title{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px}
  .section-sub{font-size:12px;color:#64748b;margin-bottom:16px}
  /* ── Sources table ── */
  .sources{margin-bottom:36px}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;padding:10px 14px;text-align:left;border-bottom:2px solid #e2e8f0;background:#f8fafc}
  td{padding:11px 14px;font-size:12.5px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  tr:hover td{background:#fafbfc}
  .source-bar-cell{width:200px}
  .bar-track{background:#e2e8f0;border-radius:999px;height:6px}
  .bar-fill{border-radius:999px;height:6px;background:linear-gradient(90deg,#10b981,#0d9488)}
  /* ── Activity table ── */
  .activity{margin-bottom:36px}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:#e0f2fe;color:#0369a1}
  .status{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
  .status-paid{background:#dcfce7;color:#166534}
  .status-pending{background:#fef9c3;color:#854d0e}
  .status-other{background:#f1f5f9;color:#475569}
  /* ── Summary box ── */
  .summary-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:36px}
  .summary-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #d1fae5;font-size:12.5px}
  .summary-row:last-child{border-bottom:none}
  .summary-row .label{color:#374151}
  .summary-row .val{font-weight:700;color:#065f46}
  /* ── Footer ── */
  .footer{border-top:1px solid #e2e8f0;padding:20px 48px;display:flex;align-items:center;justify-content:space-between}
  .footer-left{font-size:11px;color:#94a3b8}
  .footer-right{font-size:11px;color:#94a3b8;text-align:right}
  .footer-brand{font-weight:700;color:#0d9488}
  @media print{
    @page{margin:0;size:A4}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<!-- Header -->
<div class="header">
  <div class="header-left">
    <div class="org-badge"><span class="dot"></span><span>GCMC — Group Christian Medical Centre</span></div>
    <h1>Financial Summary Report</h1>
    <p>Hospital-wide revenue, collections, and operational financial status</p>
  </div>
  <div class="header-right">
    <div class="report-label">Generated</div>
    <div class="report-date">${today}</div>
    <div class="report-time">at ${ts}</div>
  </div>
</div>

<div class="body">
  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi revenue">
      <div class="kpi-label">Revenue Today</div>
      <div class="kpi-value">${money(revenueToday)}</div>
      <div class="kpi-sub">Billing + pharmacy + invoices</div>
    </div>
    <div class="kpi collected">
      <div class="kpi-label">Collected Today</div>
      <div class="kpi-value">${money(collectedToday)}</div>
      <div class="kpi-sub">Confirmed receipts</div>
    </div>
    <div class="kpi pending">
      <div class="kpi-label">Pending Total</div>
      <div class="kpi-value">${money(pendingTotal)}</div>
      <div class="kpi-sub">Outstanding balances</div>
    </div>
    <div class="kpi queues">
      <div class="kpi-label">Open Queues</div>
      <div class="kpi-value">${openQueues}</div>
      <div class="kpi-sub">Items awaiting payment</div>
    </div>
  </div>

  <!-- Revenue by Source -->
  <div class="sources">
    <div class="section-title">Revenue by Source</div>
    <div class="section-sub">Confirmed receipts broken down by department and channel</div>
    <table>
      <thead>
        <tr>
          <th>Source</th>
          <th>Receipts</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${sourceRows || `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:20px">No revenue recorded yet today.</td></tr>`}</tbody>
    </table>
  </div>

  <!-- Financial Summary -->
  <div class="section-title">Financial Position Summary</div>
  <div class="section-sub">Key balances across all accounts modules</div>
  <div class="summary-box">
    <div class="summary-row"><span class="label">Invoice pending balance</span><span class="val">${money(invoicePendingBalance)}</span></div>
    <div class="summary-row"><span class="label">Pharmacy revenue collected</span><span class="val">${money(pharmacyMetrics.revenueCollected)}</span></div>
    <div class="summary-row"><span class="label">Payroll pending approval</span><span class="val">${money(metrics.payrollPendingValue)}</span></div>
    <div class="summary-row"><span class="label">Supplier payables outstanding</span><span class="val">${money(metrics.supplierPendingValue)}</span></div>
  </div>

  <!-- Recent Activity -->
  <div class="activity">
    <div class="section-title">Recent Financial Activity</div>
    <div class="section-sub">Latest transactions across all departments (up to 12 most recent)</div>
    <table>
      <thead>
        <tr>
          <th>Source</th>
          <th>Name</th>
          <th>Details</th>
          <th style="text-align:right">Amount</th>
          <th>Time</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${activityRows || `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">No financial activity found yet.</td></tr>`}</tbody>
    </table>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-left">
    <span class="footer-brand">GCMC HMS</span> — Hospital Management System<br/>
    Confidential · For internal administrative use only
  </div>
  <div class="footer-right">
    Report generated ${today} at ${ts}<br/>
    System Reports · Admin Portal
  </div>
</div>

<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  // ─── Report topics (static info — no links) ──────────────────────────────
  const reportTopics = [
    { title: "Daily Finance",          description: "Live collections, pending balances, and source totals.",             color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    { title: "Collections Queue",      description: "Open invoices and department charges awaiting payment.",             color: "bg-sky-50 border-sky-200 text-sky-700" },
    { title: "Payroll Oversight",      description: "Department payroll batches, approvals, and disbursement status.",    color: "bg-violet-50 border-violet-200 text-violet-700" },
    { title: "Inventory & Pharmacy",   description: "Bills, restocks, and stock pressure across pharmacy operations.",   color: "bg-orange-50 border-orange-200 text-orange-700" },
    { title: "HR & Staffing",          description: "Leave, onboarding, and payroll preparation activity.",              color: "bg-blue-50 border-blue-200 text-blue-700" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Reports"
        description="Live financial, pharmacy, and operational summaries for hospital administration."
        action={
          <Button onClick={downloadPDF}>
            ↓ Download PDF Report
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue Today",   value: money(revenueToday),   sub: "Billing + pharmacy + invoices", color: "text-emerald-700" },
          { label: "Collected Today", value: money(collectedToday), sub: "Confirmed receipts",            color: "text-slate-900" },
          { label: "Pending Total",   value: money(pendingTotal),   sub: "Outstanding balances",          color: "text-amber-700" },
          { label: "Open Queues",     value: openQueues,            sub: "Items awaiting payment",        color: "text-violet-700" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Report topics */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Report Areas</h3>
          <p className="mt-1 text-sm text-slate-500">Financial and operational reporting modules covered in the PDF download.</p>
          <div className="mt-4 space-y-3">
            {reportTopics.map((r) => (
              <div key={r.title} className={`rounded-2xl border p-4 ${r.color}`}>
                <p className="font-semibold">{r.title}</p>
                <p className="mt-0.5 text-sm opacity-80">{r.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue by Source */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Revenue by Source</h3>
          <p className="mt-1 text-sm text-slate-500">Live totals from the Accounts and Pharmacy modules.</p>
          <div className="mt-4 space-y-3">
            {sources.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No revenue recorded yet today.</p>
            )}
            {sources.map((source) => (
              <div key={source.label} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{source.label}</p>
                    <p className="text-xs text-slate-500">{source.count} receipt{source.count !== 1 ? "s" : ""} confirmed</p>
                  </div>
                  <p className="font-bold text-slate-900">{money(source.total)}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (source.total / maxSource) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity + Summary */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Recent Financial Activity</h3>
            <p className="mt-0.5 text-xs text-slate-400">Latest transactions across all departments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Source", "Name", "Details", "Amount", "Time", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivity.map((item, i) => (
                  <tr key={`${item.source}-${i}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">{item.source}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{item.detail ?? "—"}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{money(item.amount)}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{formatDateTime(item.time)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        item.status === "Paid" || item.status === "Confirmed" ? "bg-emerald-100 text-emerald-700"
                        : item.status === "Pending" || item.status === "Billed" ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
                {recentActivity.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No financial activity found yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Financial position summary */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Financial Position</h3>
          <p className="mt-1 text-sm text-slate-500">Key balances across all accounts modules.</p>
          <div className="mt-4 space-y-2">
            {[
              { label: "Invoice pending balance",       value: money(invoicePendingBalance),              highlight: invoicePendingBalance > 0 },
              { label: "Pharmacy revenue collected",    value: money(pharmacyMetrics.revenueCollected),   highlight: false },
              { label: "Payroll pending approval",      value: money(metrics.payrollPendingValue),        highlight: metrics.payrollPendingValue > 0 },
              { label: "Supplier payables outstanding", value: money(metrics.supplierPendingValue),       highlight: metrics.supplierPendingValue > 0 },
              { label: "Lab billing pending",           value: money(metrics.labPendingValue),            highlight: metrics.labPendingValue > 0 },
              { label: "Nursing charges pending",       value: money(metrics.nursingPendingValue),        highlight: metrics.nursingPendingValue > 0 },
              { label: "Front Desk pending",            value: money(metrics.frontDeskPendingValue),      highlight: metrics.frontDeskPendingValue > 0 },
              { label: "Consultation fees pending",     value: money(metrics.consultationPendingValue),   highlight: metrics.consultationPendingValue > 0 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                <span className="text-slate-600">{row.label}</span>
                <span className={`font-bold ${row.highlight ? "text-amber-700" : "text-slate-900"}`}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Total Revenue Today</p>
            <p className="text-2xl font-bold text-emerald-700">{money(revenueToday)}</p>
            <button
              onClick={downloadPDF}
              className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition"
            >
              ↓ Download Full PDF Report
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
