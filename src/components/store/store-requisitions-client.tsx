"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { StoreCatalogPicker } from "@/components/store/store-catalog-picker";
import {
  STORE_UPDATED_EVENT,
  createCatalogFromLine,
  displayReqStatus,
  fetchStoreRequisitions,
  issueStoreRequisition,
  linkRequisitionLine,
  markLineProcurement,
  updateStoreRequisitionStatus,
} from "@/lib/store/client";
import type { RequisitionLine, StoreItem, StoreRequisition } from "@/modules/store/types";

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-sky-50 text-sky-700",
  partially_issued: "bg-violet-50 text-violet-700",
  fulfilled: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const LINE_TYPE_STYLES: Record<string, string> = {
  catalog: "bg-slate-100 text-slate-600",
  non_catalog: "bg-orange-50 text-orange-700",
};

function issuableLine(line: RequisitionLine) {
  return line.lineStatus !== "procurement" &&
    line.qtyIssued < line.qtyRequested &&
    (line.lineType === "catalog" || Boolean(line.itemId || line.storeInventoryId));
}

export function StoreRequisitionsClient() {
  const [requisitions, setRequisitions] = useState<StoreRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("open");
  const [actionTarget, setActionTarget] = useState<{ req: StoreRequisition; action: "approve" | "reject" | "fulfill" } | null>(null);
  const [lineAction, setLineAction] = useState<{
    req: StoreRequisition;
    line: RequisitionLine;
    action: "link" | "create" | "procure";
  } | null>(null);
  const [linkItem, setLinkItem] = useState<StoreItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequisitions(await fetchStoreRequisitions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(STORE_UPDATED_EVENT, load);
    return () => window.removeEventListener(STORE_UPDATED_EVENT, load);
  }, [load]);

  const filtered = requisitions.filter((r) => {
    if (filter === "All") return true;
    if (filter === "open") return ["submitted", "approved", "partially_issued"].includes(r.status);
    if (filter === "non_catalog") return r.lines.some((l) => l.lineType === "non_catalog" && l.lineStatus === "pending");
    return r.status === filter;
  });

  async function handleAction() {
    if (!actionTarget) return;
    const { req, action } = actionTarget;
    try {
      if (action === "approve") {
        await updateStoreRequisitionStatus({ requisitionId: req.id, status: "approved" });
        setToast({ message: `${req.id} approved.`, type: "success" });
      } else if (action === "reject") {
        await updateStoreRequisitionStatus({ requisitionId: req.id, status: "rejected", notes: rejectNotes });
        setToast({ message: `${req.id} rejected.`, type: "info" });
      } else {
        const issues = req.lines
          .filter(issuableLine)
          .map((line) => ({
            lineId: line.id,
            qty: Math.max(0, line.qtyRequested - line.qtyIssued),
          }))
          .filter((i) => i.qty > 0);
        if (!issues.length) {
          setToast({ message: "No issuable catalog lines — link non-catalog items or mark for procurement first.", type: "error" });
          return;
        }
        await issueStoreRequisition({ requisitionId: req.id, issues });
        setToast({
          message: `${req.id} issued — store stock updated${req.requisitionType === "pharmacy_restock" ? ", pharmacy updated" : ""}.`,
          type: "success",
        });
      }
      setActionTarget(null);
      setRejectNotes("");
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Action failed.", type: "error" });
    }
  }

  async function handleLineAction() {
    if (!lineAction) return;
    try {
      if (lineAction.action === "link") {
        if (!linkItem) throw new Error("Select a catalog item to link.");
        await linkRequisitionLine({ lineId: lineAction.line.id, itemId: linkItem.id });
        setToast({ message: `Linked to ${linkItem.name}. You can now issue stock.`, type: "success" });
      } else if (lineAction.action === "create") {
        const result = await createCatalogFromLine({ lineId: lineAction.line.id, category: "General" });
        setToast({ message: `Catalog item ${result.itemId} created and linked.`, type: "success" });
      } else {
        const result = await markLineProcurement({
          lineId: lineAction.line.id,
          requisitionId: lineAction.req.id,
          createPo: true,
        });
        setToast({
          message: result.poId
            ? `Marked for procurement — draft PO ${result.poId} created.`
            : "Marked for procurement.",
          type: "success",
        });
      }
      setLineAction(null);
      setLinkItem(null);
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Action failed.", type: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Requisitions" description="Catalog issues from stock; non-catalog lines need link, new SKU, or procurement." />

      <div className="flex flex-wrap gap-2">
        {["open", "non_catalog", "submitted", "approved", "fulfilled", "rejected", "All"].map((f) => (
          <Button key={f} variant={filter === f ? "primary" : "secondary"} size="sm" onClick={() => setFilter(f)}>
            {f === "open" ? "Open queue" : f === "non_catalog" ? "Non-catalog review" : f === "All" ? "All" : displayReqStatus(f)}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading requisitions…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-sm text-slate-500">No requisitions in this view.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{req.id}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[req.status] ?? ""}`}>
                      {displayReqStatus(req.status)}
                    </span>
                    {req.requisitionType === "pharmacy_restock" && (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">Pharmacy</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {req.department} · {req.requestedBy} · {req.urgency}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {req.lines.map((line) => (
                      <li key={line.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-800">{line.itemName}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LINE_TYPE_STYLES[line.lineType] ?? ""}`}>
                            {line.lineType === "non_catalog" ? "Non-catalog" : "Catalog"}
                          </span>
                          {line.lineStatus === "procurement" && (
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Procurement</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {line.qtyIssued}/{line.qtyRequested} {line.unit}
                          {line.itemId ? ` · SKU ${line.itemId}` : ""}
                        </p>
                        {line.justification && (
                          <p className="mt-1 text-xs text-slate-600">Justification: {line.justification}</p>
                        )}
                        {line.lineType === "non_catalog" && line.lineStatus === "pending" && !line.itemId && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setLineAction({ req, line, action: "link" })}>Link to SKU</Button>
                            <Button size="sm" variant="secondary" onClick={() => setLineAction({ req, line, action: "create" })}>Add to catalog</Button>
                            <Button size="sm" variant="secondary" onClick={() => setLineAction({ req, line, action: "procure" })}>Send to procurement</Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {req.notes && <p className="mt-2 text-xs text-slate-500">{req.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {req.status === "submitted" && (
                    <>
                      <Button size="sm" onClick={() => setActionTarget({ req, action: "approve" })}>Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => setActionTarget({ req, action: "reject" })}>Reject</Button>
                    </>
                  )}
                  {["approved", "partially_issued"].includes(req.status) && req.lines.some(issuableLine) && (
                    <Button size="sm" onClick={() => setActionTarget({ req, action: "fulfill" })}>Issue stock</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!actionTarget} onClose={() => setActionTarget(null)} title={
        actionTarget?.action === "approve" ? "Approve requisition"
        : actionTarget?.action === "reject" ? "Reject requisition"
        : "Issue stock"
      }>
        {actionTarget?.action === "reject" ? (
          <textarea
            className="w-full rounded-lg border border-slate-200 p-3 text-sm"
            placeholder="Reason for rejection"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
          />
        ) : actionTarget?.action === "fulfill" ? (
          <ul className="space-y-1 text-sm text-slate-600">
            {actionTarget.req.lines.filter(issuableLine).map((line) => (
              <li key={line.id}>· {line.itemName} × {line.qtyRequested - line.qtyIssued} {line.unit}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Approve {actionTarget?.req.id} for fulfillment?</p>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button onClick={handleAction}>Confirm</Button>
        </ModalFooter>
      </Modal>

      <Modal
        open={!!lineAction}
        onClose={() => { setLineAction(null); setLinkItem(null); }}
        title={
          lineAction?.action === "link" ? "Link to existing catalog item"
          : lineAction?.action === "create" ? "Add to catalog"
          : "Send to procurement"
        }
      >
        {lineAction?.action === "link" ? (
          <StoreCatalogPicker value={linkItem} onChange={setLinkItem} />
        ) : lineAction?.action === "create" ? (
          <p className="text-sm text-slate-600">
            Create a new catalog SKU for <strong>{lineAction.line.itemName}</strong> and link this line. Stock starts at zero until GRN.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Mark <strong>{lineAction?.line.itemName}</strong> for procurement and create a draft PO for buyer follow-up.
          </p>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setLineAction(null); setLinkItem(null); }}>Cancel</Button>
          <Button onClick={handleLineAction}>Confirm</Button>
        </ModalFooter>
      </Modal>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
