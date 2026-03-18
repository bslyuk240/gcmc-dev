"use client";

import { useHMSSession } from "@/modules/rbac/hooks";
import { useNotificationStore } from "@/lib/hooks/use-notification-store";

const TYPE_STYLES: Record<string, { dot: string; bg: string }> = {
  info: { dot: "bg-sky-500", bg: "" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50" },
  success: { dot: "bg-emerald-500", bg: "bg-emerald-50/30" },
  urgent: { dot: "bg-red-500", bg: "bg-red-50/30" },
};

export default function StaffNotificationsPage() {
  const session = useHMSSession();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore(session?.department ?? "");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: `${unreadCount} Unread`, color: unreadCount > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500" },
          { label: `${notifications.filter((n) => n.severity === "warning" || n.severity === "urgent").length} Alerts`, color: "bg-amber-100 text-amber-700" },
          { label: `${notifications.length} Total`, color: "bg-slate-100 text-slate-600" },
        ].map((chip) => (
          <span key={chip.label} className={`rounded-full px-3 py-1 text-xs font-bold ${chip.color}`}>{chip.label}</span>
        ))}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No notifications found in Supabase for this staff portal.
          </div>
        )}
        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => markRead(notification.id)}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
              !notification.isRead ? "border-indigo-200 bg-white shadow-sm" : `border-slate-100 ${TYPE_STYLES[notification.severity].bg}`
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  !notification.isRead ? TYPE_STYLES[notification.severity].dot : "bg-slate-200"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold ${!notification.isRead ? "text-slate-900" : "text-slate-600"}`}>
                    {notification.title}
                  </p>
                  <span className="shrink-0 text-[10px] text-slate-400">{notification.createdAt}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{notification.body}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
