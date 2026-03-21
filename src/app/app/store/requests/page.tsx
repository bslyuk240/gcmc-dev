"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { updateRestockStatus } from "@/lib/data/pharmacy-store";
import {
  adjustStoreInventoryQty,
  adjustPharmacyInventoryStock,
  fetchStockRequests,
  insertStockRequest,
  updateStockRequestStatus,
  type StockRequest,
} from "@/lib/supabase/db";

type RequestStatus = StockRequest["status"];
type Urgency = StockRequest["urgency"];

const DEPARTMENTS = ["Nurses", "Doctors", "Pharmacy", "Front Desk", "Accounts", "Store", "IT", "HR", "Admin"];
const UNITS = ["Pack", "Roll", "Box", "Piece", "Bottle", "Pair", "Set", "Litre", "Sheet"];

const STATUS_STYLES: Record<RequestStatus, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-sky-50 text-sky-700",
  Rejected: "bg-red-50 text-red-700",
  Fulfilled: "bg-emerald-50 text-emerald-700",
};

const URGENCY_STYLES: Record<Urgency, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-orange-50 text-orange-700",
  Critical: "bg-red-50 text-red-700",
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function newReqId(requests: StockRequest[]): string {
  const nums = requests
    .map((r) => parseInt(r.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1000;
  return `REQ-${next}`;
}

export default function StoreRequestsPage() {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | RequestStatus>("All");
  const [activeSection, setActiveSection] = useState<"general" | "pharmacy">("general");
  const [actionTarget, setActionTarget] = useState<{ req: StockRequest; action: "approve" | "reject" | "fulfill" } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Pharmacy restock requests from shared store
  const { restockRequests } = usePharmacyStore();
  const [pharmActionTarget, setPharmActionTarget] = useState<{
    id: string; drug: string; qty: number; action: "approve" | "reject" | "fulfill";
    storeInventoryId?: string; inventoryItemId?: string;
  } | null>(null);

  // New request form
  const [newItem, setNewItem] = useState(""); const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("Pack"); const [newDept, setNewDept] = useState("");
  const [newUrgency, setNewUrgency] = useState<Urgency>("Routine"); const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    fetchStockRequests()
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter((r) => filter === "All" || r.status === filter);
  const counts = {
    Pending: requests.filter((r) => r.status === "Pending").length,
    Approved: requests.filter((r) => r.status === "Approved").length,
    Fulfilled: requests.filter((r) => r.status === "Fulfilled").length,
    Rejected: requests.filter((r) => r.status === "Rejected").length,
  };

  const pharmPending = restockRequests.filter((r) => r.status === "Pending").length;

  async function handleAction() {
    if (!actionTarget) return;
    const { req, action } = actionTarget;
    const newStatus: RequestStatus = action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Fulfilled";
    const notes = action === "reject" && rejectNotes ? rejectNotes : req.notes;
    // Optimistic
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: newStatus, notes } : r));
    const msgs: Record<string, string> = { approve: `${req.id} approved.`, reject: `${req.id} rejected.`, fulfill: `${req.id} marked as fulfilled.` };
    setToast({ message: msgs[action], type: action === "reject" ? "info" : "success" });
    setActionTarget(null);
    setRejectNotes("");
    // Persist
    await updateStockRequestStatus(req.id, newStatus, notes);
  }

  function handlePharmAction() {
    if (!pharmActionTarget) return;
    const { id, drug, qty, action, storeInventoryId, inventoryItemId } = pharmActionTarget;
    const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (action === "approve") {
      updateRestockStatus(id, "Approved");
      setToast({ message: `Pharmacy restock for ${drug} approved.`, type: "success" });
    } else if (action === "reject") {
      updateRestockStatus(id, "Rejected");
      setToast({ message: `Pharmacy restock for ${drug} rejected.`, type: "info" });
    } else if (action === "fulfill") {
      updateRestockStatus(id, "Fulfilled", { fulfilledAt: now });
      if (storeInventoryId) {
        adjustStoreInventoryQty(storeInventoryId, -qty).catch(() => {});
      }
      if (inventoryItemId) {
        adjustPharmacyInventoryStock(inventoryItemId, qty).catch(() => {});
      }
      setToast({ message: `${drug} (×${qty}) fulfilled — Store inventory decremented, Pharmacy inventory incremented.`, type: "success" });
    }
    setPharmActionTarget(null);
  }

  async function handleNewRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem || !newQty || !newDept) return;
    const req: StockRequest = {
      id: newReqId(requests),
      item: newItem,
      qty: parseInt(newQty),
      unit: newUnit,
      dept: newDept,
      requestedBy: "Store Manager",
      urgency: newUrgency,
      status: "Pending",
      notes: newNotes || undefined,
      createdAt: new Date().toISOString(),
    };
    // Optimistic
    setRequests((prev) => [req, ...prev]);
    setToast({ message: `Stock request ${req.id} submitted.`, type: "success" });
    setShowNew(false);
    setNewItem(""); setNewQty(""); setNewUnit("Pack"); setNewDept(""); setNewUrgency("Routine"); setNewNotes("");
    // Persist
    await insertStockRequest(req);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Stock Requests"
        description="Department stock requests and pharmacy medication resupply."
        action={<Button size="md" onClick={() => setShowNew(true)}>+ New Request</Button>}
      />

      {/* Section tabs */}
      <div className="flex gap-6 border-b border-slate-200 px-1">
        {([["general", "General Requests"], ["pharmacy", "Pharmacy Resupply"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`border-b-2 pb-3 pt-2 text-sm font-bold transition ${
              activeSection === key
                ? "border-[var(--accent)] text-[var(--accent-foreground)]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            {key === "pharmacy" && pharmPending > 0 && (
              <span className="ml-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pharmPending} pending
              </span>
            )}
          </button>
        ))}
      </div>

      {activeSection === "pharmacy" && (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Pharmacy Medication Resupply Requests</h3>
                <p className="text-xs text-slate-500 mt-0.5">Requests raised by Pharmacy when drug stock falls below reorder levels. Approve → Fulfill to update Pharmacy inventory.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Req ID", "Drug", "Current Stock", "Reorder Level", "Qty Requested", "Urgency", "Requested By", "Date", "Status", "Action"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {restockRequests.map((req) => (
                    <tr key={req.id} className={`hover:bg-slate-50 ${req.status === "Pending" ? "bg-orange-50/30" : ""}`}>
                      <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">{req.id}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{req.drug}</td>
                      <td className={`px-5 py-3 font-bold ${req.currentStock === 0 ? "text-red-600" : req.currentStock <= req.reorderLevel * 0.3 ? "text-red-500" : "text-orange-600"}`}>
                        {req.currentStock}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{req.reorderLevel}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{req.qtyRequested} {req.unit}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${req.urgency === "Critical" ? "bg-red-100 text-red-700" : req.urgency === "Urgent" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{req.requestedBy}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{req.requestedAt}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[req.status as RequestStatus] ?? "bg-slate-100 text-slate-600"}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {req.status === "Pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setPharmActionTarget({ id: req.id, drug: req.drug, qty: req.qtyRequested ?? 0, action: "approve", storeInventoryId: req.storeInventoryId, inventoryItemId: req.inventoryItemId })}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => setPharmActionTarget({ id: req.id, drug: req.drug, qty: req.qtyRequested ?? 0, action: "reject", storeInventoryId: req.storeInventoryId, inventoryItemId: req.inventoryItemId })}>Reject</Button>
                          </div>
                        )}
                        {req.status === "Approved" && (
                          <Button size="sm" variant="secondary" onClick={() => setPharmActionTarget({ id: req.id, drug: req.drug, qty: req.qtyRequested ?? 0, action: "fulfill", storeInventoryId: req.storeInventoryId, inventoryItemId: req.inventoryItemId })}>
                            Mark Fulfilled
                          </Button>
                        )}
                        {req.status === "Fulfilled" && (
                          <span className="text-xs text-emerald-600 font-semibold">✓ Delivered</span>
                        )}
                        {req.status === "Rejected" && (
                          <span className="text-xs text-slate-400">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {restockRequests.length === 0 && (
                    <tr><td colSpan={10} className="px-6 py-10 text-center text-sm text-slate-400">No pharmacy resupply requests yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <strong className="text-slate-700">Flow:</strong> Pharmacy inventory goes below reorder level → Pharmacy clicks &quot;Restock&quot; → appears here → Store approves → Store marks fulfilled → Pharmacy inventory is updated.
          </div>
        </div>
      )}

      {activeSection === "general" && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            {(["Pending", "Approved", "Fulfilled", "Rejected"] as RequestStatus[]).map((s) => (
              <Card
                key={s}
                className={`cursor-pointer p-5 transition ${filter === s ? "ring-2 ring-[var(--accent)]" : "hover:border-slate-300"}`}
                onClick={() => setFilter(filter === s ? "All" : s)}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{loading ? "—" : counts[s]}</p>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                {filter === "All" ? "All Requests" : `${filter} Requests`}
                <span className="ml-2 text-sm font-normal text-slate-400">({loading ? "…" : filtered.length})</span>
              </h3>
              {filter !== "All" && (
                <button type="button" onClick={() => setFilter("All")} className="text-xs font-medium text-slate-500 hover:text-slate-700">Clear filter</button>
              )}
            </div>

            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">Loading requests…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["Ref", "Item", "Qty", "Department", "Requested By", "Date", "Urgency", "Status", "Notes", ""].map((h) => (
                        <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{req.id}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{req.item}</td>
                        <td className="px-5 py-3 text-slate-700">{req.qty} {req.unit}</td>
                        <td className="px-5 py-3 text-slate-600">{req.dept}</td>
                        <td className="px-5 py-3 text-slate-600">{req.requestedBy}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">{fmtDate(req.createdAt)}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${URGENCY_STYLES[req.urgency]}`}>{req.urgency}</span></td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[req.status]}`}>{req.status}</span></td>
                        <td className="px-5 py-3 max-w-[180px] text-xs text-slate-500 truncate">{req.notes ?? "—"}</td>
                        <td className="px-5 py-3">
                          {req.status === "Pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => setActionTarget({ req, action: "approve" })}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => { setActionTarget({ req, action: "reject" }); setRejectNotes(""); }}>Reject</Button>
                            </div>
                          )}
                          {req.status === "Approved" && (
                            <Button size="sm" variant="secondary" onClick={() => setActionTarget({ req, action: "fulfill" })}>Mark Fulfilled</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">No requests in this category.</p>}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Pharmacy action modal */}
      <Modal
        open={!!pharmActionTarget}
        onClose={() => setPharmActionTarget(null)}
        title={
          pharmActionTarget?.action === "approve" ? "Approve Pharmacy Request"
          : pharmActionTarget?.action === "reject" ? "Reject Pharmacy Request"
          : "Confirm Fulfillment"
        }
      >
        {pharmActionTarget && (
          <div className="space-y-3 text-sm">
            {pharmActionTarget.action === "approve" && (
              <p className="text-slate-600">Approve supply of <strong>{pharmActionTarget.qty} units</strong> of <strong>{pharmActionTarget.drug}</strong> to Pharmacy?</p>
            )}
            {pharmActionTarget.action === "fulfill" && (
              <>
                <p className="text-slate-600">Confirm that <strong>{pharmActionTarget.qty} units</strong> of <strong>{pharmActionTarget.drug}</strong> have been physically delivered to Pharmacy?</p>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  ✓ This will: mark the request fulfilled{pharmActionTarget.storeInventoryId ? `, deduct ${pharmActionTarget.qty} from Store inventory` : ""}{pharmActionTarget.inventoryItemId ? `, add ${pharmActionTarget.qty} to Pharmacy inventory` : ""}.
                </div>
              </>
            )}
            {pharmActionTarget.action === "reject" && (
              <p className="text-slate-600">Reject this pharmacy restock request for <strong>{pharmActionTarget.drug}</strong>?</p>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setPharmActionTarget(null)}>Cancel</Button>
          <Button
            size="md"
            className={pharmActionTarget?.action === "reject" ? "bg-red-600 text-white hover:opacity-95" : ""}
            onClick={handlePharmAction}
          >
            {pharmActionTarget?.action === "approve" ? "Approve" : pharmActionTarget?.action === "reject" ? "Reject" : "Confirm Fulfilled"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Action confirmation modal */}
      <Modal open={!!actionTarget} onClose={() => setActionTarget(null)} title={
        actionTarget?.action === "approve" ? "Approve Request" : actionTarget?.action === "reject" ? "Reject Request" : "Mark as Fulfilled"
      }>
        {actionTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">
              {actionTarget.action === "approve" && `Approve stock request ${actionTarget.req.id} for ${actionTarget.req.qty} ${actionTarget.req.unit} of ${actionTarget.req.item}?`}
              {actionTarget.action === "fulfill" && `Confirm that ${actionTarget.req.id} — ${actionTarget.req.qty} ${actionTarget.req.unit} of ${actionTarget.req.item} — has been delivered to ${actionTarget.req.dept}?`}
              {actionTarget.action === "reject" && `Reject stock request ${actionTarget.req.id} from ${actionTarget.req.dept}?`}
            </p>
            {actionTarget.action === "reject" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-slate-400">(optional)</span></label>
                <textarea rows={2} value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Why is this being rejected?" className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-300" />
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button
            size="md"
            className={actionTarget?.action === "reject" ? "bg-red-600 text-white hover:opacity-95" : ""}
            onClick={handleAction}
          >
            {actionTarget?.action === "approve" ? "Approve" : actionTarget?.action === "reject" ? "Reject" : "Mark Fulfilled"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* New request modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Stock Request">
        <form id="new-req-form" onSubmit={handleNewRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name <span className="text-red-500">*</span></label>
            <input required value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="e.g. N95 Respirators" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input required type="number" min="1" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="e.g. 50" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className={inputCls}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
              <select required value={newDept} onChange={(e) => setNewDept(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
              <select value={newUrgency} onChange={(e) => setNewUrgency(e.target.value as Urgency)} className={inputCls}>
                <option>Routine</option>
                <option>Urgent</option>
                <option>Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea rows={2} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Any additional context…" className={`${inputCls} resize-none`} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button size="md" type="submit" form="new-req-form">Submit Request</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
