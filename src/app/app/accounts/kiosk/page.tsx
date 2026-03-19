"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { addKioskSale, updateKioskSaleStatus, type KioskSale } from "@/lib/data/accounts-store";

const KIOSK_ITEMS = [
  "Bottled Water (500ml)", "Milo Drink", "Bread & Butter", "Rice & Stew",
  "Jollof Rice", "Soft Drinks", "Snacks / Biscuits", "Plantain Chips",
  "Yogurt Cup", "Fresh Juice", "Chocolate Bar", "Fruit Pack",
];

export default function KioskRevenuePage() {
  const { kioskSales, metrics } = useAccountsStore();
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Kiosk Attendant";

  const [showReport, setShowReport] = useState(false);
  const [confirmSale, setConfirmSale] = useState<KioskSale | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New sale report form — default date to today
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [cashRevenue, setCashRevenue] = useState("");
  const [mobileRevenue, setMobileRevenue] = useState("");
  const [itemsSold, setItemsSold] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalRevenue = (parseFloat(cashRevenue) || 0) + (parseFloat(mobileRevenue) || 0);

  function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!cashRevenue && !mobileRevenue) {
      setToast({ message: "Enter at least cash or mobile revenue.", type: "error" });
      return;
    }
    setSubmitting(true);
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const displayDate = new Date(reportDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    setTimeout(() => {
      addKioskSale({
        id: `KSK-${Date.now()}`,
        date: displayDate,
        totalRevenue,
        cashRevenue: parseFloat(cashRevenue) || 0,
        mobileRevenue: parseFloat(mobileRevenue) || 0,
        itemsSold: parseInt(itemsSold) || 0,
        reportedBy: staffName,
        reportedAt: `${now} · ${displayDate}`,
        status: "Pending",
        notes: reportNotes || undefined,
      });
      setToast({ message: `Daily sales report submitted. ₦${totalRevenue.toFixed(2)} pending Accounts confirmation.`, type: "success" });
      setShowReport(false);
      setCashRevenue(""); setMobileRevenue(""); setItemsSold(""); setReportNotes("");
      setSubmitting(false);
    }, 500);
  }

  function handleConfirm(sale: KioskSale) {
    updateKioskSaleStatus(sale.id, "Confirmed");
    setConfirmSale(null);
    setToast({ message: `₦${sale.totalRevenue.toFixed(2)} kiosk revenue for ${sale.date} confirmed in Accounts.`, type: "success" });
  }

  const totalMTD = kioskSales.filter((k) => k.status === "Confirmed").reduce((s, k) => s + k.totalRevenue, 0);
  const pendingConfirm = kioskSales.filter((k) => k.status === "Pending" && k.totalRevenue > 0);

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiosk Revenue"
        description="Daily kiosk sales are reported here and confirmed by Accounts."
        action={
          <Button onClick={() => setShowReport(true)}>+ Report Today&apos;s Sales</Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today's Revenue", value: `₦${metrics.kioskRevenueToday.toFixed(0)}`, sub: "Confirmed", color: "text-emerald-700" },
          { label: "MTD Revenue", value: `₦${totalMTD.toFixed(0)}`, sub: "Total confirmed", color: "text-slate-900" },
          { label: "Pending Confirmation", value: pendingConfirm.length, sub: `₦${pendingConfirm.reduce((s, k) => s + k.totalRevenue, 0).toFixed(0)} pending`, color: "text-amber-600" },
          { label: "Total Reports", value: kioskSales.filter((k) => k.totalRevenue > 0).length, sub: "Sales reports", color: "text-slate-700" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Revenue chart by day */}
      {kioskSales.filter((k) => k.totalRevenue > 0).length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-4">Daily Revenue Trend</h3>
          <div className="flex items-end gap-3 h-24">
            {kioskSales.filter((k) => k.totalRevenue > 0).slice(0, 7).reverse().map((k) => {
              const maxRev = Math.max(...kioskSales.map((s) => s.totalRevenue), 1);
              const pct = Math.max(8, (k.totalRevenue / maxRev) * 100);
              return (
                <div key={k.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-700">₦{k.totalRevenue.toFixed(0)}</span>
                  <div
                    className={`w-full rounded-t-lg transition-all ${k.status === "Confirmed" ? "bg-emerald-500" : "bg-amber-400"}`}
                    style={{ height: `${pct}%` }}
                  />
                  <span className="text-[10px] text-slate-500 text-center leading-tight">{k.date.split(",")[0]}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Confirmed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending</span>
          </div>
        </Card>
      )}

      {/* Sales records table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Sales Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Date", "Total Revenue", "Cash", "Mobile Money", "Items Sold", "Reported By", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kioskSales.map((sale) => (
                <tr key={sale.id} className={`hover:bg-slate-50 ${sale.status === "Pending" && sale.totalRevenue > 0 ? "bg-amber-50/20" : ""}`}>
                  <td className="px-5 py-3 font-semibold text-slate-900">{sale.date}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{sale.totalRevenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-600">₦{sale.cashRevenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-600">₦{sale.mobileRevenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-600">{sale.itemsSold}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{sale.reportedBy || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sale.status === "Confirmed" ? "bg-emerald-100 text-emerald-700" : sale.totalRevenue > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {sale.totalRevenue === 0 ? "Not reported" : sale.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {sale.status === "Pending" && sale.totalRevenue > 0 && (
                      <Button size="sm" onClick={() => setConfirmSale(sale)}>
                        Confirm Revenue
                      </Button>
                    )}
                    {sale.status === "Confirmed" && (
                      <span className="text-xs font-semibold text-emerald-700">✓ Confirmed</span>
                    )}
                    {sale.totalRevenue === 0 && (
                      <Button size="sm" variant="outline" onClick={() => setShowReport(true)}>Report Now</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sample kiosk items */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-900 mb-3">Kiosk Menu / Items</h3>
        <div className="flex flex-wrap gap-2">
          {KIOSK_ITEMS.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{item}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Items sold during the day are tallied and reported to Accounts at end of shift.</p>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Kiosk attendant sells items → reports daily total here → Accounts confirms the revenue → appears in financial reports.
      </div>

      {/* Report modal */}
      <Modal open={showReport} onClose={() => !submitting && setShowReport(false)} title="Report Daily Sales">
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Date *</label>
            <input type="date" required value={reportDate} onChange={(e) => setReportDate(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Cash Revenue (₦)</label>
              <input type="number" min="0" step="0.01" value={cashRevenue}
                onChange={(e) => setCashRevenue(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Mobile Money (₦)</label>
              <input type="number" min="0" step="0.01" value={mobileRevenue}
                onChange={(e) => setMobileRevenue(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Total Items Sold</label>
            <input type="number" min="0" value={itemsSold} onChange={(e) => setItemsSold(e.target.value)} placeholder="e.g. 87" className={inputCls} />
          </div>
          {totalRevenue > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
              <span className="text-sm font-semibold text-emerald-800">Total Revenue</span>
              <span className="text-xl font-bold text-emerald-900">₦{totalRevenue.toFixed(2)}</span>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
            <textarea rows={2} value={reportNotes} onChange={(e) => setReportNotes(e.target.value)}
              placeholder="Any notes about the day…" className={`${inputCls} resize-none`} />
          </div>
          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            ✓ This report will appear in Accounts for confirmation and financial recording.
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowReport(false)} disabled={submitting}>Cancel</Button>
            <Button size="md" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Sales Report"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Confirm revenue modal */}
      {confirmSale && (
        <Modal open={true} onClose={() => setConfirmSale(null)} title="Confirm Kiosk Revenue">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-semibold">{confirmSale.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cash</span><span>₦{confirmSale.cashRevenue.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Mobile Money</span><span>₦{confirmSale.mobileRevenue.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Items Sold</span><span>{confirmSale.itemsSold}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-slate-600">Total</span><span className="font-bold text-xl text-slate-900">₦{confirmSale.totalRevenue.toFixed(2)}</span></div>
            </div>
            <p className="text-xs text-slate-500">Confirming records this revenue in the hospital&apos;s financial accounts.</p>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setConfirmSale(null)}>Cancel</Button>
            <Button size="md" onClick={() => handleConfirm(confirmSale)}>Confirm &amp; Record Revenue</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
