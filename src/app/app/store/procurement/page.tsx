"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { addSupplierPayment, getSupplierPayments } from "@/lib/data/accounts-store";

type OrderStatus = "Draft" | "Sent" | "Confirmed" | "Received" | "Cancelled";

type PurchaseOrder = {
  id: string;
  supplier: string;
  items: number;
  totalCost: number;
  raised: string;
  expected: string;
  status: OrderStatus;
  raisedBy: string;
  description?: string;
  paymentSubmitted?: boolean;
};

const INITIAL_ORDERS: PurchaseOrder[] = [
  { id: "PO-1143", supplier: "MedSupply Co.", items: 2, totalCost: 760, raised: "Mar 14, 2026", expected: "Mar 21, 2026", status: "Draft", raisedBy: "Store Manager" },
  { id: "PO-1142", supplier: "MedSupply Co.", items: 4, totalCost: 2840, raised: "Mar 12, 2026", expected: "Mar 19, 2026", status: "Confirmed", raisedBy: "Store Manager" },
  { id: "PO-1141", supplier: "SafeGuard Ltd.", items: 2, totalCost: 1260, raised: "Mar 11, 2026", expected: "Mar 18, 2026", status: "Sent", raisedBy: "Store Manager" },
  { id: "PO-1140", supplier: "ClinTech Ghana", items: 3, totalCost: 3500, raised: "Mar 10, 2026", expected: "Mar 17, 2026", status: "Received", raisedBy: "Store Manager", paymentSubmitted: true },
  { id: "PO-1139", supplier: "MedEquip Co.", items: 1, totalCost: 680, raised: "Mar 9, 2026", expected: "Mar 16, 2026", status: "Received", raisedBy: "Admin", paymentSubmitted: true },
  { id: "PO-1138", supplier: "PrintPro", items: 2, totalCost: 420, raised: "Mar 8, 2026", expected: "Mar 15, 2026", status: "Cancelled", raisedBy: "Store Manager" },
  { id: "PO-1137", supplier: "SafeGuard Ltd.", items: 5, totalCost: 1900, raised: "Mar 5, 2026", expected: "Mar 12, 2026", status: "Received", raisedBy: "Store Manager", paymentSubmitted: true },
];

const SUPPLIERS = [
  { name: "MedSupply Co.", contact: "procurement@medsupply.gh", phone: "+233 24 000 1001", lead: "5–7 days", category: "General Supplies" },
  { name: "SafeGuard Ltd.", contact: "orders@safeguard.gh", phone: "+233 24 000 1002", lead: "5–8 days", category: "PPE" },
  { name: "ClinTech Ghana", contact: "supply@clintech.gh", phone: "+233 24 000 1003", lead: "7–10 days", category: "Medical Devices" },
  { name: "MedEquip Co.", contact: "sales@medequip.gh", phone: "+233 24 000 1004", lead: "7–14 days", category: "Equipment" },
  { name: "PrintPro", contact: "orders@printpro.gh", phone: "+233 24 000 1005", lead: "3–5 days", category: "Stationery & Admin" },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-sky-50 text-sky-700",
  Confirmed: "bg-violet-50 text-violet-700",
  Received: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

const SUPPLIER_NAMES = SUPPLIERS.map((s) => s.name);
const ITEM_DESCRIPTIONS = [
  "N95 Respirators × 200", "Gauze Bandages × 500", "IV Cannulas × 100",
  "Surgical Gloves × 50 boxes", "Medical Waste Bags × 100", "Lab Reagents × 30",
  "Surgical Instruments set", "Ultrasound Gel × 20 bottles",
];

export default function StoreProcurementPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(INITIAL_ORDERS);
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [showNew, setShowNew] = useState(false);
  const [payTarget, setPayTarget] = useState<PurchaseOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New order form
  const [newSupplier, setNewSupplier] = useState(SUPPLIER_NAMES[0]);
  const [newItems, setNewItems] = useState("1");
  const [newCost, setNewCost] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [submittingNew, setSubmittingNew] = useState(false);

  const totalSpend = orders.filter((o) => o.status === "Received").reduce((s, o) => s + o.totalCost, 0);
  const pending = orders.filter((o) => o.status === "Sent" || o.status === "Confirmed");

  function handleNewOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingNew(true);
    setTimeout(() => {
      const seq = orders.length + 1137;
      const newOrder: PurchaseOrder = {
        id: `PO-${seq}`,
        supplier: newSupplier,
        items: parseInt(newItems) || 1,
        totalCost: parseFloat(newCost) || 0,
        raised: "Mar 15, 2026",
        expected: newExpected || "Mar 22, 2026",
        status: "Draft",
        raisedBy: "Store Manager",
        description: newDesc || `${newItems} item(s) from ${newSupplier}`,
      };
      setOrders((prev) => [newOrder, ...prev]);
      setToast({ message: `Purchase Order ${newOrder.id} created as Draft.`, type: "success" });
      setShowNew(false);
      setNewSupplier(SUPPLIER_NAMES[0]); setNewItems("1"); setNewCost(""); setNewDesc(""); setNewExpected("");
      setSubmittingNew(false);
    }, 500);
  }

  function advanceStatus(order: PurchaseOrder) {
    const next: Record<string, OrderStatus> = { Draft: "Sent", Sent: "Confirmed", Confirmed: "Received" };
    const newStatus = next[order.status] as OrderStatus;
    if (!newStatus) return;
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: newStatus } : o));

    // When received, prompt to submit payment to Accounts
    if (newStatus === "Received") {
      setToast({ message: `${order.id} marked as Received. Submit payment request to Accounts.`, type: "info" });
    } else {
      setToast({ message: `${order.id} status updated to ${newStatus}.`, type: "success" });
    }
  }

  function handleSubmitPayment() {
    if (!payTarget) return;

    // Check if already submitted
    const existing = getSupplierPayments().find((p) => p.poId === payTarget.id);
    if (existing) {
      setToast({ message: `Payment for ${payTarget.id} already submitted to Accounts.`, type: "info" });
      setPayTarget(null);
      return;
    }

    addSupplierPayment({
      id: `SP-${Date.now()}`,
      poId: payTarget.id,
      supplier: payTarget.supplier,
      amount: payTarget.totalCost,
      description: payTarget.description || `${payTarget.items} items from ${payTarget.supplier}`,
      items: payTarget.items,
      submittedBy: "Store Manager",
      submittedAt: "Mar 15, 2026",
      dueDate: "Mar 22, 2026",
      status: "Pending",
    });

    setOrders((prev) => prev.map((o) => o.id === payTarget.id ? { ...o, paymentSubmitted: true } : o));
    setToast({ message: `Payment request ₦${payTarget.totalCost.toLocaleString()} sent to Accounts for ${payTarget.supplier}.`, type: "success" });
    setPayTarget(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Procurement"
        description="Manage purchase orders and supplier payments. Received orders trigger payment requests to Accounts."
        action={
          <Button size="md" onClick={() => setShowNew(true)}>+ New Order</Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Orders (MTD)</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{orders.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting Delivery</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{pending.length}</p>
          <p className="mt-1 text-sm text-slate-500">₦{pending.reduce((s, o) => s + o.totalCost, 0).toLocaleString()} in transit</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MTD Spend (Received)</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">₦{totalSpend.toLocaleString()}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {(["orders", "suppliers"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-md px-5 py-2 text-sm font-semibold capitalize transition ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            {t === "orders" ? "Purchase Orders" : "Suppliers"}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-500">
              When a PO is <strong>Received</strong>, click &quot;Submit Payment&quot; to send a payment request to Accounts.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {["PO #", "Supplier", "Items", "Total Cost", "Date Raised", "Expected", "Status", "Accounts Payment", "Actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-600">{o.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{o.supplier}</td>
                    <td className="px-5 py-3 text-slate-600">{o.items}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">₦{o.totalCost.toLocaleString()}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-600">{o.raised}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-600">{o.expected}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      {o.paymentSubmitted ? (
                        <span className="text-xs font-semibold text-emerald-700">✓ Submitted</span>
                      ) : o.status === "Received" ? (
                        <span className="text-xs text-amber-600 font-medium">Pending submission</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setViewOrder(o)}
                          className="text-xs font-medium text-[var(--accent)] hover:underline">View</button>
                        {o.status !== "Received" && o.status !== "Cancelled" && (
                          <Button size="sm" variant="outline" onClick={() => advanceStatus(o)}>
                            {o.status === "Draft" ? "Send" : o.status === "Sent" ? "Confirm" : "Mark Received"}
                          </Button>
                        )}
                        {o.status === "Received" && !o.paymentSubmitted && (
                          <Button size="sm" onClick={() => setPayTarget(o)}>
                            Submit Payment
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "suppliers" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPLIERS.map((s) => (
            <Card key={s.name} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.category}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {s.contact}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {s.phone}
                </div>
                <p className="text-xs text-slate-400">Lead time: {s.lead}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Contact</button>
                <button type="button" onClick={() => { setShowNew(true); setNewSupplier(s.name); }}
                  className="flex-1 rounded-lg bg-[var(--accent)]/10 py-1.5 text-xs font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent)]/20">New PO</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New order modal */}
      <Modal open={showNew} onClose={() => !submittingNew && setShowNew(false)} title="New Purchase Order">
        <form onSubmit={handleNewOrder} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Supplier *</label>
            <select required value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} className={inputCls}>
              {SUPPLIER_NAMES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">No. of Items *</label>
              <input type="number" min="1" required value={newItems} onChange={(e) => setNewItems(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Total Cost (₦) *</label>
              <input type="number" min="0" step="0.01" required value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="e.g. 2500" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
            <input type="text" list="desc-opts" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="e.g. N95 Respirators × 200" className={inputCls} />
            <datalist id="desc-opts">{ITEM_DESCRIPTIONS.map((d) => <option key={d} value={d} />)}</datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Expected Delivery</label>
            <input type="date" value={newExpected} onChange={(e) => setNewExpected(e.target.value)} className={inputCls} />
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)} disabled={submittingNew}>Cancel</Button>
            <Button size="md" type="submit" disabled={submittingNew}>{submittingNew ? "Creating…" : "Create Purchase Order"}</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Submit payment modal */}
      {payTarget && (
        <Modal open={true} onClose={() => setPayTarget(null)} title={`Submit Supplier Payment — ${payTarget.id}`}>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span className="font-semibold">{payTarget.supplier}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Items</span><span>{payTarget.items}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Description</span><span className="text-right text-xs">{payTarget.description || "Goods received"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-semibold">Amount</span><span className="font-bold text-lg text-slate-900">₦{payTarget.totalCost.toLocaleString()}</span></div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              ✓ This will appear in Accounts as a supplier payment request for approval and processing.
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button size="md" onClick={handleSubmitPayment}>Submit Payment Request to Accounts</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* View order modal */}
      {viewOrder && (
        <Modal open={true} onClose={() => setViewOrder(null)} title={`Purchase Order — ${viewOrder.id}`}>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              {[
                ["PO Number", viewOrder.id],
                ["Supplier", viewOrder.supplier],
                ["Items", String(viewOrder.items)],
                ["Total Cost", `₦${viewOrder.totalCost.toLocaleString()}`],
                ["Date Raised", viewOrder.raised],
                ["Expected", viewOrder.expected],
                ["Raised By", viewOrder.raisedBy],
                ["Status", viewOrder.status],
                ["Payment to Accounts", viewOrder.paymentSubmitted ? "✓ Submitted" : "Not yet submitted"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <ModalFooter>
            <Button size="md" type="button" onClick={() => setViewOrder(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
