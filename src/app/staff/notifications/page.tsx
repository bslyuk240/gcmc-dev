"use client";

import { useState, useEffect } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";

type Notif = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  createdAt: string;
  read: boolean;
  targetDepartment?: string;
};

const TYPE_STYLES: Record<Notif["type"], { dot: string; bg: string }> = {
  info:    { dot: "bg-sky-500",     bg: "" },
  warning: { dot: "bg-amber-500",   bg: "bg-amber-50" },
  success: { dot: "bg-emerald-500", bg: "bg-emerald-50/30" },
  error:   { dot: "bg-red-500",     bg: "bg-red-50/30" },
};

const FALLBACK_NOTIFS: Notif[] = [
  { id: "fn1", title: "Rota Updated",         message: "Your rota for next week has been published by HR.",                    type: "info",    createdAt: "10:30", read: false },
  { id: "fn2", title: "Leave Approved",        message: "Your Annual Leave for Apr 7–11 has been approved.",                   type: "success", createdAt: "09:15", read: false },
  { id: "fn3", title: "Payslip Ready",         message: "Your March 2026 payslip is now available.",                           type: "success", createdAt: "08:00", read: true  },
  { id: "fn4", title: "Policy Update",         message: "The hospital infection control policy has been updated. Please review.", type: "warning", createdAt: "Yesterday", read: true },
  { id: "fn5", title: "Meeting Reminder",      message: "Department briefing tomorrow at 08:00 in the conference room.",       type: "info",    createdAt: "Yesterday", read: true },
];

export default function StaffNotificationsPage() {
  const session = useHMSSession();
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hms_notifications");
      if (raw) {
        const all = JSON.parse(raw) as Array<{
          id: string; title: string; message: string;
          type?: string; createdAt?: string; read?: boolean; targetDepartment?: string;
        }>;
        const mine = all
          .filter((n) => !n.targetDepartment || n.targetDepartment === session?.department)
          .map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: (n.type as Notif["type"]) ?? "info",
            createdAt: n.createdAt ?? "",
            read: !!n.read,
            targetDepartment: n.targetDepartment,
          }));
        setNotifs(mine.length > 0 ? mine : FALLBACK_NOTIFS);
      } else {
        setNotifs(FALLBACK_NOTIFS);
      }
    } catch {
      setNotifs(FALLBACK_NOTIFS);
    }
  }, [session?.department]);

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const raw = localStorage.getItem("hms_notifications");
      if (raw) {
        const all = JSON.parse(raw) as Notif[];
        const updated = all.map((n) => ({ ...n, read: true }));
        localStorage.setItem("hms_notifications", JSON.stringify(updated));
      }
    } catch { /* ignore */ }
  }

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: `${unread} Unread`,  color: unread > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500" },
          { label: `${notifs.filter((n) => n.type === "warning" || n.type === "error").length} Alerts`, color: "bg-amber-100 text-amber-700" },
          { label: `${notifs.length} Total`, color: "bg-slate-100 text-slate-600" },
        ].map((c) => (
          <span key={c.label} className={`rounded-full px-3 py-1 text-xs font-bold ${c.color}`}>{c.label}</span>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {notifs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No notifications.
          </div>
        )}
        {notifs.map((n) => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`w-full rounded-2xl border text-left px-4 py-3.5 transition ${
              !n.read ? "border-indigo-200 bg-white shadow-sm" : `border-slate-100 ${TYPE_STYLES[n.type].bg}`
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Type dot */}
              <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                !n.read ? TYPE_STYLES[n.type].dot : "bg-slate-200"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                    {n.title}
                  </p>
                  <span className="shrink-0 text-[10px] text-slate-400">{n.createdAt}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{n.message}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
