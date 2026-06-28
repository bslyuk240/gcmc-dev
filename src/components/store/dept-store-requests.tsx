"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { StoreCatalogPicker } from "@/components/store/store-catalog-picker";
import {
  displayReqStatus,
  fetchStoreRequisitions,
  submitStoreRequisition,
} from "@/lib/store/client";
import type { StoreItem, StoreRequisition } from "@/modules/store/types";

type Props = {
  /** The department key used in the stock_requests.dept column */
  dept: string;
  /** Display name shown in headings */
  deptLabel: string;
  /** Suggested items for the autocomplete datalist */
  suggestedItems?: string[];
  /** The name shown as requestedBy when submitting */
  requestedBy?: string;
};

const UNITS = ["Box", "Pack", "Roll", "Piece", "Bottle", "Set", "Pair", "Litre", "Sheet", "Bag", "Units"];

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-sky-50 text-sky-700",
  Rejected: "bg-red-50 text-red-700",
  Fulfilled: "bg-emerald-50 text-emerald-700",
};

const URGENCY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-orange-50 text-orange-700",
  Critical: "bg-red-50 text-red-700",
};

const STATUS_INFO: Record<string, string> = {
  Pending: "Awaiting review by Store",
  Approved: "Approved — Store will arrange delivery",
  Fulfilled: "Delivered by Store",
  Rejected: "Not fulfilled — see notes for reason",
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function mapReq(r: StoreRequisition) {
  const line = r.lines[0];
  return {
    id: r.id,
    item: line?.itemName ?? "Items",
    qty: line?.qtyRequested ?? 0,
    unit: line?.unit ?? "Units",
    dept: r.department,
    requestedBy: r.requestedBy,
    urgency: r.urgency as "Routine" | "Urgent" | "Critical",
    status: displayReqStatus(r.status) as "Pending" | "Approved" | "Rejected" | "Fulfilled",
    notes: r.notes,
    createdAt: r.createdAt,
    isNonCatalog: line?.lineType === "non_catalog",
  };
}

type DeptRequest = ReturnType<typeof mapReq>;

function newReqId(requests: DeptRequest[]): string {
  const nums = requests.map((r) => parseInt(r.id.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  return `REQ-${nums.length > 0 ? Math.max(...nums) + 1 : 1000}`;
}

function MobileMeta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

export function DeptStoreRequests({ dept, deptLabel, suggestedItems = [], requestedBy = "Staff" }: Props) {
  const [requests, setRequests] = useState<DeptRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | DeptRequest["status"]>("All");
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Form
  const [requestMode, setRequestMode] = useState<"catalog" | "non_catalog">("catalog");
  const [catalogItem, setCatalogItem] = useState<StoreItem | null>(null);
  const [item, setItem] = useState("");
  const [justification, setJustification] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("Pack");
  const [urgency, setUrgency] = useState<DeptRequest["urgency"]>("Routine");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStoreRequisitions({ department: dept })
      .then((all) => setRequests(all.map(mapReq)))
      .finally(() => setLoading(false));
  }, [dept]);

  const filtered = filter === "All" ? requests : requests.filter((r) => r.status === filter);

  const counts = {
    Pending: requests.filter((r) => r.status === "Pending").length,
    Approved: requests.filter((r) => r.status === "Approved").length,
    Fulfilled: requests.filter((r) => r.status === "Fulfilled").length,
    Rejected: requests.filter((r) => r.status === "Rejected").length,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isCatalog = requestMode === "catalog";
    if (isCatalog && !catalogItem) return;
    if (!isCatalog && (!item.trim() || !justification.trim())) return;
    if (!qty) return;
    setSubmitting(true);
    const reqId = newReqId(requests);
    const itemName = isCatalog ? catalogItem!.name : item.trim();
    const lineUnit = isCatalog ? catalogItem!.unit : unit;
    const optimistic: DeptRequest = {
      id: reqId,
      item: itemName,
      qty: parseInt(qty) || 1,
      unit: lineUnit,
      dept,
      requestedBy,
      urgency,
      status: "Pending",
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      isNonCatalog: !isCatalog,
    };
    setRequests((prev) => [optimistic, ...prev]);
    setToast({ message: `Request ${reqId} submitted to Store.`, type: "success" });
    setShowNew(false);
    setCatalogItem(null); setItem(""); setJustification(""); setQty(""); setUnit("Pack"); setUrgency("Routine"); setNotes(""); setRequestMode("catalog");
    setSubmitting(false);
    try {
      await submitStoreRequisition({
        id: reqId,
        department: dept,
        requestedBy,
        urgency,
        notes: notes.trim() || undefined,
        lines: [{
          itemName,
          qty: parseInt(qty) || 1,
          unit: lineUnit,
          itemId: isCatalog ? catalogItem!.id : undefined,
          lineType: isCatalog ? "catalog" : "non_catalog",
          justification: isCatalog ? undefined : justification.trim(),
        }],
      });
    } catch {
      setToast({ message: "Failed to save request.", type: "error" });
    }
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Store Requests"
        description={`Request consumables and supplies from the Store. All requests are reviewed and fulfilled by the Store team.`}
        action={<Button size="md" onClick={() => setShowNew(true)}>+ New Request</Button>}
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {(["Pending", "Approved", "Fulfilled", "Rejected"] as const).map((s) => (
          <Card
            key={s}
            className={`cursor-pointer p-5 transition ${filter === s ? "ring-2 ring-[var(--accent)]" : "hover:border-slate-300"}`}
            onClick={() => setFilter(filter === s ? "All" : s)}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{loading ? "—" : counts[s]}</p>
            <p className="mt-1 text-xs text-slate-400">{STATUS_INFO[s]}</p>
          </Card>
        ))}
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800">
        <strong>How it works:</strong> Pick an item from the store catalog when possible. For one-off or new items, use <strong>Not in catalog</strong> — Store will link, add to catalog, or send to procurement.
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">
            {filter === "All" ? "All Requests" : `${filter} Requests`}
            <span className="ml-2 text-sm font-normal text-slate-400">({loading ? "…" : filtered.length})</span>
          </h3>
          {filter !== "All" && (
            <button type="button" onClick={() => setFilter("All")} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-500">No {filter === "All" ? "" : filter.toLowerCase() + " "}requests yet.</p>
            {filter === "All" && (
              <button type="button" onClick={() => setShowNew(true)} className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline">
                Submit your first request →
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((req) => (
                <div key={req.id} className="space-y-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{req.item}</p>
                      {req.isNonCatalog && (
                        <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">Non-catalog</span>
                      )}
                      <p className="font-mono text-[10px] text-slate-400">{req.id}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[req.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <MobileMeta label="Qty" value={`${req.qty} ${req.unit}`} />
                    <MobileMeta label="Urgency" value={req.urgency} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <MobileMeta label="Date" value={fmtDate(req.createdAt)} />
                    <MobileMeta label="Requested By" value={req.requestedBy} />
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{req.notes ?? "—"}</div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {["Ref", "Item", "Qty", "Urgency", "Date", "Status", "Notes"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{req.id}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{req.item}</td>
                    <td className="px-5 py-3 text-slate-600">{req.qty} {req.unit}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${URGENCY_STYLES[req.urgency] ?? "bg-slate-100 text-slate-600"}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmtDate(req.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[req.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-[200px] truncate text-xs text-slate-500">{req.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>

      {/* New request modal */}
      <Modal open={showNew} onClose={() => !submitting && setShowNew(false)} title="New Store Request">
        <form id="dept-req-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={requestMode === "catalog" ? "primary" : "secondary"} onClick={() => setRequestMode("catalog")}>
              From catalog
            </Button>
            <Button type="button" size="sm" variant={requestMode === "non_catalog" ? "primary" : "secondary"} onClick={() => setRequestMode("non_catalog")}>
              Not in catalog
            </Button>
          </div>
          {requestMode === "catalog" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catalog item <span className="text-red-500">*</span></label>
              <StoreCatalogPicker
                value={catalogItem}
                onChange={(picked) => {
                  setCatalogItem(picked);
                  if (picked) setUnit(picked.unit);
                }}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item description <span className="text-red-500">*</span></label>
                <input
                  required
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="Describe the item you need"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Why is this needed? <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Clinical/operational justification for this one-off request"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input required type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 50" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} disabled={requestMode === "catalog" && !!catalogItem}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
            <div className="flex gap-3">
              {(["Routine", "Urgent", "Critical"] as const).map((u) => (
                <label key={u} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${urgency === u ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent-foreground)]" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                  <input type="radio" name="urgency" value={u} checked={urgency === u} onChange={() => setUrgency(u)} className="sr-only" />
                  {u}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional context, reason for urgency…" className={`${inputCls} resize-none`} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)} disabled={submitting}>Cancel</Button>
          <Button size="md" type="submit" form="dept-req-form" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
