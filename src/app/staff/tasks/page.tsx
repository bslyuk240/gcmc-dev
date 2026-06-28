"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import type { WorkforceTask } from "@/lib/workforce/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
};

export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<WorkforceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workforce/tasks?mine=1");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: WorkforceTask["status"]) {
    const res = await fetch("/api/workforce/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setToast({ message: "Task updated.", type: "success" });
      await load();
    } else {
      setToast({ message: "Update failed.", type: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" description="Assignments from your unit supervisor." />

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No tasks assigned to you.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.unitName} · {t.category.replace("_", " ")}</p>
                  {t.description ? <p className="mt-1 text-sm text-slate-600">{t.description}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[t.status]}`}>
                    {t.status.replace("_", " ")}
                  </span>
                  {t.status === "pending" ? (
                    <Button size="sm" onClick={() => updateStatus(t.id, "in_progress")}>Start</Button>
                  ) : null}
                  {t.status !== "completed" ? (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(t.id, "completed")}>Complete</Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
