"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import {
  STORE_UPDATED_EVENT,
  createPurchaseOrder,
  createStoreSupplier,
  deleteStoreSupplier,
  displayPOStatus,
  fetchPurchaseOrders,
  fetchStoreSuppliers,
  money,
  submitPOPayment,
  updatePurchaseOrderStatus,
} from "@/lib/store/client";
import type { PurchaseOrder, StoreSupplier } from "@/modules/store/types";

function newPoId(orders: PurchaseOrder[]) {
  const nums = orders.map((o) => parseInt(o.id.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  return `PO-${nums.length ? Math.max(...nums) + 1 : 1000}`;
}

export function StoreProcurementClient() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<StoreSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [showNew, setShowNew] = useState(false);
  const [payTarget, setPayTarget] = useState<PurchaseOrder | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [newSupplier, setNewSupplier] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newCost, setNewCost] = useState("");
  const [newExpected, setNewExpected] = useState("");

  const [supName, setSupName] = useState("");
  const [supCategory, setSupCategory] = useState("General Supplies");
  const [supContact, setSupContact] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supLead, setSupLead] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, s] = await Promise.all([fetchPurchaseOrders(), fetchStoreSuppliers()]);
      setOrders(o);
      setSuppliers(s);
      if (!newSupplier && s[0]) setNewSupplier(s[0].name);
    } finally {
      setLoading(false);
    }
  }, [newSupplier]);

  useEffect(() => {
    load();
    window.addEventListener(STORE_UPDATED_EVENT, load);
    return () => window.removeEventListener(STORE_UPDATED_EVENT, load);
  }, [load]);

  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    try {
      const qty = parseFloat(newQty) || 1;
      const unitCost = parseFloat(newCost) || 0;
      await createPurchaseOrder({
        id: newPoId(orders),
        supplier: newSupplier,
        requestedBy: "Store Manager",
        expectedDate: newExpected || undefined,
        description: `${newItemName} × ${qty}`,
        lines: [{ itemName: newItemName, qty, unitCost, unit: "Units" }],
      });
      setToast({ message: "Purchase order created.", type: "success" });
      setShowNew(false);
      setNewItemName(""); setNewQty("1"); setNewCost(""); setNewExpected("");
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed.", type: "error" });
    }
  }

  async function advancePO(order: PurchaseOrder) {
    const next: Record<string, string> = {
      draft: "pending_approval",
      approved: "sent",
      sent: "confirmed",
    };
    const status = next[order.status];
    if (!status) return;
    try {
      await updatePurchaseOrderStatus({ poId: order.id, status });
      setToast({ message: `${order.id} → ${displayPOStatus(status)}`, type: "success" });
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Update failed.", type: "error" });
    }
  }

  async function handlePayment() {
    if (!payTarget) return;
    try {
      await submitPOPayment(payTarget.id, { amount: payTarget.value, supplier: payTarget.supplier });
      setToast({ message: `Payment request submitted for ${payTarget.id}.`, type: "success" });
      setPayTarget(null);
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Payment submit failed.", type: "error" });
    }
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createStoreSupplier({
        name: supName,
        category: supCategory,
        contact: supContact,
        phone: supPhone,
        lead: supLead,
      });
      setToast({ message: "Supplier added.", type: "success" });
      setSupName(""); setSupContact(""); setSupPhone(""); setSupLead("");
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed.", type: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Procurement" description="Purchase orders, supplier master, and GRN handoff to stock ledger." />
        <Link href={`${INTERNAL_PREFIX}/store/procurement/grn`}>
          <Button variant="secondary">Goods Receipt (GRN)</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "orders" ? "primary" : "secondary"} size="sm" onClick={() => setTab("orders")}>Orders</Button>
        <Button variant={tab === "suppliers" ? "primary" : "secondary"} size="sm" onClick={() => setTab("suppliers")}>Suppliers</Button>
      </div>

      {tab === "orders" ? (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setShowNew(true)}>New PO</Button>
          </div>
          {loading ? <p className="text-sm text-slate-400">Loading…</p> : orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{order.id} · {order.supplier}</h3>
                  <p className="text-sm text-slate-600">{displayPOStatus(order.status)} · {money(order.value)}</p>
                  <ul className="mt-2 text-sm text-slate-700">
                    {order.lines.map((line) => (
                      <li key={line.id}>{line.itemName} — {line.qtyReceived}/{line.qtyOrdered} @ {money(line.unitCost)}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status === "draft" && <Button size="sm" onClick={() => advancePO(order)}>Submit for approval</Button>}
                  {order.status === "approved" && <Button size="sm" onClick={() => advancePO(order)}>Mark sent</Button>}
                  {order.status === "sent" && <Button size="sm" onClick={() => advancePO(order)}>Confirm with supplier</Button>}
                  {["confirmed", "partially_received"].includes(order.status) && (
                    <Link href={`${INTERNAL_PREFIX}/store/procurement/grn?po=${order.id}`}>
                      <Button size="sm" variant="secondary">Receive goods</Button>
                    </Link>
                  )}
                  {order.status === "received" && !order.paymentSubmitted && (
                    <Button size="sm" onClick={() => setPayTarget(order)}>Submit payment</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </>
      ) : (
        <Card className="space-y-4 p-4">
          <form onSubmit={handleAddSupplier} className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Name" value={supName} onChange={(e) => setSupName(e.target.value)} required />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Category" value={supCategory} onChange={(e) => setSupCategory(e.target.value)} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Contact email" value={supContact} onChange={(e) => setSupContact(e.target.value)} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Phone" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Lead time" value={supLead} onChange={(e) => setSupLead(e.target.value)} />
            <Button type="submit">Add supplier</Button>
          </form>
          <ul className="space-y-2">
            {suppliers.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{s.name} · {s.category}</span>
                <Button size="sm" variant="secondary" onClick={() => deleteStoreSupplier(s.id).then(load)}>Remove</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New purchase order">
        <form onSubmit={handleCreatePO} className="space-y-3">
          <select className="w-full rounded-lg border px-3 py-2 text-sm" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)}>
            {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Item description" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Unit cost ₦" value={newCost} onChange={(e) => setNewCost(e.target.value)} />
          </div>
          <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" value={newExpected} onChange={(e) => setNewExpected(e.target.value)} />
          <ModalFooter>
            <Button variant="secondary" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit">Create draft</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Submit payment to Accounts">
        <p className="text-sm text-slate-600">Submit supplier payment request for {payTarget?.id} ({money(payTarget?.value ?? 0)})?</p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
          <Button onClick={handlePayment}>Submit</Button>
        </ModalFooter>
      </Modal>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
