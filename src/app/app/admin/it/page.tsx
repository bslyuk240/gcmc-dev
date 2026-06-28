"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { updateITTicket } from "@/lib/data/admin-store";

const SYSTEMS: { name: string; status: string; uptime: string; color: string }[] = [];

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  Urgent: "bg-orange-50 text-orange-700",
  High: "bg-amber-50 text-amber-700",
  Normal: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-100 text-slate-500",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AdminITMonitorPage() {
  const { itTickets, metrics } = useAdminStore();
  const [escalateTarget, setEscalateTarget] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const openTickets = itTickets.filter((t) => t.status === "Open" || t.status === "In Progress");
  const resolved = itTickets.filter((t) => t.status === "Resolved" || t.status === "Closed");
  const degradedSystems = SYSTEMS.filter((s) => s.status !== "Operational");
  const target = itTickets.find((t) => t.id === (escalateTarget ?? closeTarget));

  function handleEscalate() {
    if (!escalateTarget) return;
    void updateITTicket(escalateTarget, { priority: "Critical" })
      .then(() => {
        setToast({ message: `Ticket escalated to Critical.`, type: "info" });
        setEscalateTarget(null);
      })
      .catch((error: Error) => {
        setToast({ message: error.message, type: "error" });
      });
  }

  function handleClose() {
    if (!closeTarget) return;
    void updateITTicket(closeTarget, { status: "Closed" })
      .then(() => {
        setToast({ message: `Ticket closed.`, type: "success" });
        setCloseTarget(null);
      })
      .catch((error: Error) => {
        setToast({ message: error.message, type: "error" });
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="IT Monitor" description="System health, open support tickets, access issues, and technical incident oversight." />
      </div>

      {(metrics.criticalITTickets > 0 || degradedSystems.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {metrics.criticalITTickets > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-sm font-bold text-red-800">{metrics.criticalITTickets} critical/urgent ticket{metrics.criticalITTickets > 1 ? "s" : ""} require immediate attention.</span>
            </div>
          )}
          {degradedSystems.map((s) => (
            <div key={s.name} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-sm font-bold text-amber-800">{s.name}: {s.status} ({s.uptime} uptime)</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Open Tickets", value: openTickets.length, color: openTickets.length > 3 ? "text-amber-600" : "text-slate-900" },
          { label: "Critical / Urgent", value: metrics.criticalITTickets, color: metrics.criticalITTickets > 0 ? "text-red-700" : "text-slate-500" },
          { label: "Resolved Today", value: resolved.length, color: "text-emerald-700" },
          { label: "System Health", value: SYSTEMS.length ? `${SYSTEMS.filter((s) => s.status === "Operational").length}/${SYSTEMS.length}` : "—", color: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Active IT Tickets</h3>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {itTickets.map((t) => (
                <Card key={t.id} className={`p-4 ${t.priority === "Critical" ? "border-red-200 bg-red-50/30" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{t.title}</p>
                      <p className="text-xs font-mono text-slate-500">{t.ticketRef ?? t.id}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <MobileMeta label="Department" value={t.department} />
                    <MobileMeta label="Priority" value={t.priority} />
                    <MobileMeta label="Assigned To" value={t.assignedTo} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    {(t.status === "Open" || t.status === "In Progress") && t.priority !== "Critical" && (
                      <Button size="sm" variant="outline" onClick={() => setEscalateTarget(t.id)}>Escalate</Button>
                    )}
                    {t.status === "Resolved" && (
                      <Button size="sm" variant="ghost" onClick={() => setCloseTarget(t.id)}>Close</Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Ticket ID", "Issue", "Department", "Priority", "Assigned To", "Status", "Admin Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itTickets.map((t) => (
                    <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "Critical" ? "bg-red-50/20" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">{t.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[180px]">{t.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{t.department}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{t.assignedTo}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(t.status === "Open" || t.status === "In Progress") && t.priority !== "Critical" && (
                          <Button size="sm" variant="outline" onClick={() => setEscalateTarget(t.id)}>Escalate</Button>
                        )}
                        {(t.status === "Resolved") && (
                          <Button size="sm" variant="ghost" onClick={() => setCloseTarget(t.id)}>Close</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* System status */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">System Status</h3>
            <div className="space-y-2">
              {SYSTEMS.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    <span className="text-xs text-slate-700">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${s.status === "Operational" ? "text-emerald-700" : "text-amber-600"}`}>{s.status}</span>
                    <span className="text-[10px] text-slate-400">{s.uptime}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-2">Admin Insight</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{SYSTEMS.filter((s) => s.status === "Operational").length} of {SYSTEMS.length} systems fully operational.</li>
              {degradedSystems.length > 0 && <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{degradedSystems.map((s) => s.name).join(", ")} degraded.</li>}
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />{openTickets.length} tickets open — {metrics.criticalITTickets} critical.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={!!escalateTarget} onClose={() => setEscalateTarget(null)} title="Escalate Ticket to Critical">
        {target && <p className="text-sm text-slate-700">Escalate <strong>{target.id}</strong> ({target.title}) to <strong>Critical</strong> priority? IT will be notified immediately.</p>}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setEscalateTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleEscalate}>Escalate to Critical</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!closeTarget} onClose={() => setCloseTarget(null)} title="Close Ticket">
        {target && <p className="text-sm text-slate-700">Close ticket <strong>{target.id}</strong> ({target.title})?</p>}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setCloseTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleClose}>Close Ticket</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
