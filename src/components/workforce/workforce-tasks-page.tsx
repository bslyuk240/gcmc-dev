"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { fetchMyNcUnit, fetchNonClinicalUnits } from "@/lib/supabase/db";
import { isWorkforceAdmin } from "@/lib/workforce/access";
import type { WorkforceTask, WorkforceTaskCategory, WorkforceTaskPriority } from "@/lib/workforce/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export function WorkforceTasksPage() {
  const session = useHMSSession();
  const { staff } = useHRStore();
  const [tasks, setTasks] = useState<WorkforceTask[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [unitName, setUnitName] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkforceTaskCategory>("general");
  const [priority, setPriority] = useState<WorkforceTaskPriority>("routine");
  const [assigneeId, setAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("All");

  const canAssign = session && (isWorkforceAdmin(session) || session.role === "hod");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (unitName) params.set("unitName", unitName);
      const res = await fetch(`/api/workforce/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [unitName]);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const fetchedUnits = await fetchNonClinicalUnits();
      setUnits(fetchedUnits.map((u) => u.name));
      if (isWorkforceAdmin(session)) {
        setUnitName(fetchedUnits[0]?.name ?? "");
      } else {
        const hodUnit = await fetchMyNcUnit(session.staff_id);
        setUnitName(hodUnit ?? session.department === "non_clinical" ? "" : "");
      }
    })();
  }, [session]);

  useEffect(() => { if (session) void load(); }, [load, session]);

  const unitStaff = staff.filter(
    (s) => s.department === "Non-Clinical Staff" && s.status === "Active" && (!unitName || s.unit === unitName),
  );

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter.toLowerCase());

  async function handleAssign() {
    if (!title.trim() || !unitName) return;
    setSaving(true);
    try {
      const assignee = unitStaff.find((s) => s.id === assigneeId);
      const res = await fetch("/api/workforce/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitName,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          assigneeId: assignee?.id,
          assigneeName: assignee?.name,
        }),
      });
      if (!res.ok) throw new Error("Assign failed");
      setToast({ message: "Task assigned.", type: "success" });
      setShowAssign(false);
      setTitle("");
      setDescription("");
      setAssigneeId("");
      await load();
    } catch {
      setToast({ message: "Could not assign task.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: WorkforceTask["status"]) {
    const res = await fetch("/api/workforce/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setToast({ message: "Task updated.", type: "success" });
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks / Assignments"
        description="Assign and track unit tasks — trips, posts, cleaning zones, and logistics."
        action={canAssign ? <Button onClick={() => setShowAssign(true)}>+ Assign Task</Button> : undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        {isWorkforceAdmin(session!) && units.length > 1 ? (
          <select value={unitName} onChange={(e) => setUnitName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        ) : unitName ? (
          <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-800">{unitName}</span>
        ) : null}
        {["All", "Pending", "In_progress", "Completed", "Overdue"].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-600"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Task", "Assigned To", "Category", "Due", "Status", "Action"].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-5 py-3"><p className="font-medium text-slate-900">{t.title}</p><p className="text-xs text-slate-400">{t.unitName}</p></td>
                <td className="px-5 py-3">{t.assigneeName ?? "Unassigned"}</td>
                <td className="px-5 py-3 capitalize">{t.category.replace("_", " ")}</td>
                <td className="px-5 py-3 text-slate-600">{t.dueAt ? new Date(t.dueAt).toLocaleDateString("en-GB") : "—"}</td>
                <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[t.status]}`}>{t.status.replace("_", " ")}</span></td>
                <td className="px-5 py-3">
                  {t.status !== "completed" ? (
                    <div className="flex gap-2">
                      {t.status === "pending" ? <Button size="sm" variant="ghost" onClick={() => updateStatus(t.id, "in_progress")}>Start</Button> : null}
                      <Button size="sm" onClick={() => updateStatus(t.id, "completed")}>Complete</Button>
                    </div>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No tasks found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Task">
        <div className="space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title *" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value as WorkforceTaskCategory)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {["general", "transport_trip", "security_post", "cleaning_zone", "store_task", "maintenance"].map((c) => (
              <option key={c} value={c}>{c.replace("_", " ")}</option>
            ))}
          </select>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {unitStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowAssign(false)}>Cancel</Button>
          <Button disabled={saving || !title.trim()} onClick={handleAssign}>{saving ? "Saving…" : "Assign"}</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
