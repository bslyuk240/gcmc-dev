"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useHMSSession } from "@/modules/rbac/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";

type ReqStatus = "pending" | "approved" | "rejected" | "received";

type RestockRequest = {
  id: string;
  item: string;
  qty: number;
  unit: string;
  urgency: "Routine" | "Urgent" | "Critical";
  requestedBy: string;
  date: string;
  status: ReqStatus;
  notes?: string;
};

const INITIAL: RestockRequest[] = [];

const STATUS_BADGE: Record<ReqStatus, "warning" | "success" | "destructive" | "neutral"> = {
  pending: "warning", approved: "success", rejected: "destructive", received: "neutral",
};

const URGENCY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-orange-50 text-orange-700",
  Critical: "bg-red-50 text-red-700",
};

export default function PharmacyRestockRequestsPage() {
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Pharmacist";
  const [requests, setRequests] = useState<RestockRequest[]>(INITIAL);
  const [showNew, setShowNew] = useState(false);
  const [viewReq, setViewReq] = useState<RestockRequest | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [newItem, setNewItem] = useState(""); const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("Packs"); const [newUrgency, setNewUrgency] = useState<"Routine" | "Urgent" | "Critical">("Routine");
  const [newNotes, setNewNotes] = useState(""); const [newRequester, setNewRequester] = useState("");

  function handleNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem || !newQty) return;
    const req: RestockRequest = {
      id: `REQ-P${String(requests.length + 5).padStart(3, "0")}`,
      item: newItem, qty: parseInt(newQty), unit: newUnit,
      urgency: newUrgency, requestedBy: newRequester,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), status: "pending", notes: newNotes || undefined,
    };
    setRequests((prev) => [req, ...prev]);
    setToast({ message: `Restock request ${req.id} submitted.`, type: "success" });
    setShowNew(false);
    setNewItem(""); setNewQty(""); setNewUnit("Packs"); setNewUrgency("Routine"); setNewNotes(""); setNewRequester(staffName);
  }

  function markReceived(req: RestockRequest) {
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "received" } : r));
    setToast({ message: `${req.id} marked as received.`, type: "success" });
    setViewReq(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restock Requests"
        description="Request and track stock replenishment from the store."
        action={<Button onClick={() => { setNewRequester(staffName); setShowNew(true); }}>+ New Request</Button>}
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Requests <span className="text-sm font-normal text-slate-400">({requests.length})</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Ref", "Item", "Qty", "Urgency", "Requested By", "Date", "Status", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.item}</td>
                  <td className="px-5 py-3 text-slate-600">{row.qty} {row.unit}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${URGENCY_STYLES[row.urgency]}`}>{row.urgency}</span></td>
                  <td className="px-5 py-3 text-slate-600">{row.requestedBy}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">{row.date}</td>
                  <td className="px-5 py-3"><StatusBadge variant={STATUS_BADGE[row.status]}>{row.status}</StatusBadge></td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => setViewReq(row)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New request modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Restock Request">
        <form id="restock-form" onSubmit={handleNew} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item / Drug <span className="text-red-500">*</span></label>
            <input required value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="e.g. Amoxicillin 500mg" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input required type="number" min="1" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="e.g. 100" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className={inputCls}>
                {["Packs", "Boxes", "Bottles", "Vials", "Ampoules", "Sachets"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
              <select value={newUrgency} onChange={(e) => setNewUrgency(e.target.value as "Routine" | "Urgent" | "Critical")} className={inputCls}>
                <option>Routine</option><option>Urgent</option><option>Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
              <input value={newRequester} onChange={(e) => setNewRequester(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea rows={2} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Current stock level, reason for urgency…" className={`${inputCls} resize-none`} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button size="md" type="submit" form="restock-form">Submit Request</Button>
        </ModalFooter>
      </Modal>

      {/* View detail modal */}
      {viewReq && (
        <Modal open={true} onClose={() => setViewReq(null)} title={`${viewReq.id} — Detail`}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge variant={STATUS_BADGE[viewReq.status]}>{viewReq.status}</StatusBadge>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${URGENCY_STYLES[viewReq.urgency]}`}>{viewReq.urgency}</span>
            </div>
            {[["Item", viewReq.item], ["Quantity", `${viewReq.qty} ${viewReq.unit}`], ["Requested By", viewReq.requestedBy], ["Date", viewReq.date]].map(([label, val]) => (
              <div key={label} className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-medium">{val}</span></div>
            ))}
            {viewReq.notes && <div className="rounded-lg bg-slate-50 p-3 text-slate-600">{viewReq.notes}</div>}
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setViewReq(null)}>Close</Button>
            {viewReq.status === "approved" && (
              <Button size="md" onClick={() => markReceived(viewReq)}>Mark as Received</Button>
            )}
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
