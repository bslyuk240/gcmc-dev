"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import type { ITTicket, ITTicketCategory, ITTicketPriority, ITTicketStatus } from "@/lib/it/types";

const DEPARTMENTS = ["IT", "HR", "Admin", "Nurses", "Doctors", "Front Desk", "Pharmacy", "Accounts", "Store"];

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  Urgent: "bg-orange-100 text-orange-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Normal: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<ITTicketStatus, string> = {
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-100 text-slate-500",
};

const NAV_ITEMS = ["My Queue", "Unassigned", "Team Tickets", "Escalated", "Resolved", "All Tickets"];

function ticketAge(openedAt: string) {
  const diff = Date.now() - new Date(openedAt).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function ItTicketsPage() {
  const session = useHMSSession();
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState("All Tickets");
  const [showNew, setShowNew] = useState(false);
  const [detailTicket, setDetailTicket] = useState<ITTicket | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ITTicketCategory>("Other");
  const [newPriority, setNewPriority] = useState<ITTicketPriority>("Medium");
  const [newDept, setNewDept] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("Unassigned");
  const teamOptions = session?.full_name ? ["Unassigned", session.full_name] : ["Unassigned"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/it/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const myName = session?.full_name ?? "";
  const displayed = tickets.filter((t) => {
    if (activeNav === "My Queue") return myName && t.assignedTo === myName && (t.status === "Open" || t.status === "In Progress");
    if (activeNav === "Unassigned") return t.assignedTo === "Unassigned";
    if (activeNav === "Team Tickets") return t.status === "Open" || t.status === "In Progress";
    if (activeNav === "Escalated") return t.priority === "Critical" || t.priority === "Urgent";
    if (activeNav === "Resolved") return t.status === "Resolved" || t.status === "Closed";
    return true;
  });

  async function patchTicket(ticketId: string, body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/it/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, ...body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not update ticket.");
      await load();
      return data.ticket as ITTicket;
    } finally {
      setSaving(false);
    }
  }

  async function handleNewTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newDept) return;
    setSaving(true);
    try {
      const res = await fetch("/api/it/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          department: newDept,
          priority: newPriority,
          assignedToName: newAssignee,
          assignedToId: newAssignee !== "Unassigned" && session ? session.staff_id : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not create ticket.");
      setToast({ message: `Ticket ${data.ticket.ticketRef} created successfully.`, type: "success" });
      setShowNew(false);
      setNewTitle(""); setNewCategory("Other"); setNewPriority("Medium"); setNewDept(""); setNewDescription(""); setNewAssignee("Unassigned");
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Could not create ticket.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function resolveTicket(ticket: ITTicket) {
    try {
      await patchTicket(ticket.id, { status: "Resolved" });
      setToast({ message: `${ticket.ticketRef} marked as resolved.`, type: "success" });
      setDetailTicket(null);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Could not update ticket.", type: "error" });
    }
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Support Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Hospital-internal helpdesk — track staff access, devices, and technical issues.</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ New Ticket</Button>
      </div>

      <div className="xl:hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => (
            <button key={item} type="button" onClick={() => setActiveNav(item)}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition ${activeNav === item ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:block">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">Views</p>
          <div className="mt-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button key={item} type="button" onClick={() => setActiveNav(item)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${activeNav === item ? "bg-[var(--accent)] text-white font-bold" : "text-slate-600 hover:bg-slate-100"}`}>
                {item}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-3">
          <Card className="overflow-hidden p-0 shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="font-bold text-slate-900">{activeNav} <span className="ml-1 text-sm font-normal text-slate-400">({displayed.length})</span></h3>
            </div>
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">Loading tickets...</div>
            ) : displayed.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No tickets in this view.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["ID", "Priority", "Title", "Category", "Department", "Assignee", "Age", "Status", ""].map((h) => (
                        <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayed.map((t) => (
                      <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailTicket(t)}>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{t.ticketRef}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PRIORITY_STYLES[t.priority] ?? "bg-slate-100"}`}>{t.priority}</span></td>
                        <td className="max-w-[240px] px-5 py-3 font-medium text-slate-900">{t.title}</td>
                        <td className="px-5 py-3 text-slate-600">{t.category}</td>
                        <td className="px-5 py-3 text-slate-600">{t.department}</td>
                        <td className="px-5 py-3 text-slate-600">{t.assignedTo}</td>
                        <td className="px-5 py-3 text-slate-400">{ticketAge(t.openedAt)}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span></td>
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          {(t.status === "Open" || t.status === "In Progress") && (
                            <Button size="sm" variant="ghost" disabled={saving} onClick={() => void resolveTicket(t)}>Resolve</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Support Ticket" className="max-w-xl">
        <form id="new-ticket-form" onSubmit={(e) => void handleNewTicket(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
            <input required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Brief description of the issue" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ITTicketCategory)} className={inputCls}>
                {(["Network", "Access", "Software", "Hardware", "Email", "System", "Other"] as ITTicketCategory[]).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as ITTicketPriority)} className={inputCls}>
                {(["Low", "Medium", "High", "Critical"] as ITTicketPriority[]).map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Department *</label>
              <select required value={newDept} onChange={(e) => setNewDept(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assign To</label>
              <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className={inputCls}>
                {teamOptions.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={`${inputCls} resize-none`} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button size="md" type="submit" form="new-ticket-form" disabled={saving}>{saving ? "Creating…" : "Create Ticket"}</Button>
        </ModalFooter>
      </Modal>

      {detailTicket && (
        <Modal open={true} onClose={() => setDetailTicket(null)} title={`${detailTicket.ticketRef} — Detail`} className="max-w-xl">
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PRIORITY_STYLES[detailTicket.priority] ?? ""}`}>{detailTicket.priority}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[detailTicket.status]}`}>{detailTicket.status}</span>
            </div>
            <p className="text-base font-semibold text-slate-900">{detailTicket.title}</p>
            {detailTicket.description && <p className="text-slate-600">{detailTicket.description}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div><span className="font-medium text-slate-700">Category:</span> {detailTicket.category}</div>
              <div><span className="font-medium text-slate-700">Department:</span> {detailTicket.department}</div>
              <div><span className="font-medium text-slate-700">Assigned:</span> {detailTicket.assignedTo}</div>
              <div><span className="font-medium text-slate-700">Opened by:</span> {detailTicket.openedBy}</div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setDetailTicket(null)}>Close</Button>
            {(detailTicket.status === "Open" || detailTicket.status === "In Progress") && (
              <>
                <Button size="md" variant="outline" disabled={saving} onClick={() => void patchTicket(detailTicket.id, { status: "In Progress" }).then((updated) => updated && setDetailTicket(updated))}>
                  Mark In Progress
                </Button>
                <Button size="md" disabled={saving} onClick={() => void resolveTicket(detailTicket)}>Resolve</Button>
              </>
            )}
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
