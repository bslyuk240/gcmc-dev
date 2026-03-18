"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";

type Priority = "Critical" | "High" | "Medium" | "Low";
type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type Category = "Network" | "Access" | "Software" | "Hardware" | "Email" | "System" | "Other";

type Ticket = {
  id: string;
  category: Category;
  priority: Priority;
  title: string;
  dept: string;
  assignee: string;
  age: string;
  status: TicketStatus;
};

const INITIAL: Ticket[] = [];

const TEAM = ["Unassigned"];
const DEPARTMENTS = ["IT", "HR", "Admin", "Nurses", "Doctors", "Front Desk", "Pharmacy", "Accounts", "Store"];

const PRIORITY_STYLES: Record<Priority, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-100 text-slate-500",
};

const NAV_ITEMS = ["My Queue", "Unassigned", "Team Tickets", "Escalated", "Resolved", "All Tickets"];

export default function ItTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL);
  const [activeNav, setActiveNav] = useState("All Tickets");
  const [showNew, setShowNew] = useState(false);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Other");
  const [newPriority, setNewPriority] = useState<Priority>("Medium");
  const [newDept, setNewDept] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("Unassigned");

  const displayed = tickets.filter((t) => {
    if (activeNav === "My Queue") return t.assignee === "Kwame IT" && (t.status === "Open" || t.status === "In Progress");
    if (activeNav === "Unassigned") return t.assignee === "Unassigned";
    if (activeNav === "Team Tickets") return t.status === "Open" || t.status === "In Progress";
    if (activeNav === "Escalated") return t.priority === "Critical";
    if (activeNav === "Resolved") return t.status === "Resolved" || t.status === "Closed";
    return true;
  });

  function handleNewTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newDept) return;
    const ticket: Ticket = {
      id: `#TK-${4023 + tickets.length}`,
      category: newCategory,
      priority: newPriority,
      title: newTitle,
      dept: newDept,
      assignee: newAssignee,
      age: "just now",
      status: "Open",
    };
    setTickets((prev) => [ticket, ...prev]);
    setToast({ message: `Ticket ${ticket.id} created successfully.`, type: "success" });
    setShowNew(false);
    setNewTitle(""); setNewCategory("Other"); setNewPriority("Medium"); setNewDept(""); setNewDescription(""); setNewAssignee("Unassigned");
  }

  function resolveTicket(ticket: Ticket) {
    setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: "Resolved" } : t));
    setToast({ message: `${ticket.id} marked as resolved.`, type: "success" });
    setDetailTicket(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Support Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Manage ticket intake, assignment, and resolution across departments.</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ New Ticket</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">Views</p>
          <div className="mt-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveNav(item)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${activeNav === item ? "bg-[var(--accent)] text-white font-bold" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">Quick Stats</p>
            <div className="mt-2 space-y-1">
              {[
                { label: "Open", count: tickets.filter((t) => t.status === "Open").length, color: "text-sky-600" },
                { label: "In Progress", count: tickets.filter((t) => t.status === "In Progress").length, color: "text-violet-600" },
                { label: "Critical", count: tickets.filter((t) => t.priority === "Critical").length, color: "text-red-600" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between px-3 py-1 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-bold ${color}`}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Ticket list */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">{activeNav} <span className="ml-1 text-sm font-normal text-slate-400">({displayed.length})</span></h3>
            </div>
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
                    <tr
                      key={t.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setDetailTicket(t)}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{t.id}</td>
                      <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span></td>
                      <td className="px-5 py-3 font-medium text-slate-900 max-w-[240px]">{t.title}</td>
                      <td className="px-5 py-3 text-slate-600">{t.category}</td>
                      <td className="px-5 py-3 text-slate-600">{t.dept}</td>
                      <td className="px-5 py-3 text-slate-600">{t.assignee}</td>
                      <td className="px-5 py-3 text-slate-400">{t.age}</td>
                      <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span></td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        {(t.status === "Open" || t.status === "In Progress") && (
                          <Button size="sm" variant="ghost" onClick={() => resolveTicket(t)}>Resolve</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayed.length === 0 && <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">No tickets in this view.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* New ticket modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Support Ticket" className="max-w-xl">
        <form id="new-ticket-form" onSubmit={handleNewTicket} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Brief description of the issue" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Category)} className={inputCls}>
                {(["Network", "Access", "Software", "Hardware", "Email", "System", "Other"] as Category[]).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)} className={inputCls}>
                {(["Low", "Medium", "High", "Critical"] as Priority[]).map((p) => <option key={p}>{p}</option>)}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
              <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className={inputCls}>
                {TEAM.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Steps to reproduce, affected users, error messages…" className={`${inputCls} resize-none`} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button size="md" type="submit" form="new-ticket-form">Create Ticket</Button>
        </ModalFooter>
      </Modal>

      {/* Ticket detail modal */}
      {detailTicket && (
        <Modal open={true} onClose={() => setDetailTicket(null)} title={`${detailTicket.id} — Detail`} className="max-w-xl">
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PRIORITY_STYLES[detailTicket.priority]}`}>{detailTicket.priority}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[detailTicket.status]}`}>{detailTicket.status}</span>
            </div>
            <p className="font-semibold text-slate-900 text-base">{detailTicket.title}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div><span className="font-medium text-slate-700">Category:</span> {detailTicket.category}</div>
              <div><span className="font-medium text-slate-700">Department:</span> {detailTicket.dept}</div>
              <div><span className="font-medium text-slate-700">Assigned:</span> {detailTicket.assignee}</div>
              <div><span className="font-medium text-slate-700">Age:</span> {detailTicket.age}</div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setDetailTicket(null)}>Close</Button>
            {(detailTicket.status === "Open" || detailTicket.status === "In Progress") && (
              <>
                <Button
                  size="md"
                  variant="outline"
                  onClick={() => {
                    setTickets((prev) => prev.map((t) => t.id === detailTicket.id ? { ...t, status: "In Progress" } : t));
                    setDetailTicket((prev) => prev ? { ...prev, status: "In Progress" } : null);
                  }}
                >
                  Mark In Progress
                </Button>
                <Button size="md" onClick={() => resolveTicket(detailTicket)}>Resolve</Button>
              </>
            )}
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
