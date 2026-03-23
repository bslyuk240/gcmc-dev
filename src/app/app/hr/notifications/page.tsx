"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useNotificationStore } from "@/lib/hooks/use-notification-store";
import { useHMSSession } from "@/modules/rbac/hooks";

const TYPE_STYLES: Record<string, { dot: string; bg: string }> = {
  info: { dot: "bg-sky-500", bg: "" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50" },
  success: { dot: "bg-emerald-500", bg: "bg-emerald-50/30" },
  urgent: { dot: "bg-red-500", bg: "bg-red-50/30" },
};

export default function HRNotificationsPage() {
  const session = useHMSSession();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore(session?.department ?? "hr");

  return (
    <div className="space-y-5">
      <PageHeader
        title="HR Notifications"
        description="Track staff leave, onboarding, payroll, attendance, and internal escalations from one inbox."
        action={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Mark all read
            </button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          { label: `${unreadCount} Unread`, color: unreadCount > 0 ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500" },
          { label: `${notifications.filter((n) => n.severity === "warning" || n.severity === "urgent").length} Alerts`, color: "bg-amber-100 text-amber-700" },
          { label: `${notifications.length} Total`, color: "bg-slate-100 text-slate-600" },
        ].map((chip) => (
          <span key={chip.label} className={`rounded-full px-3 py-1 text-xs font-bold ${chip.color}`}>
            {chip.label}
          </span>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">HR Notification Feed</h3>
            <p className="mt-1 text-sm text-slate-500">Notifications targeted to HR from leave, payroll, staff actions, and internal systems.</p>
          </div>

          <div className="space-y-2 p-4">
            {notifications.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                No notifications found in Supabase for HR yet.
              </div>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markRead(notification.id)}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                  !notification.isRead ? "border-violet-200 bg-white shadow-sm" : `border-slate-100 ${TYPE_STYLES[notification.severity].bg}`
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
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Quick Links</h3>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { label: "Leave Management", href: `${INTERNAL_PREFIX}/hr/leave-management` },
                { label: "Payroll", href: `${INTERNAL_PREFIX}/hr/payroll` },
                { label: "Attendance", href: `${INTERNAL_PREFIX}/hr/attendance` },
                { label: "Staff Directory", href: `${INTERNAL_PREFIX}/hr/staff-directory` },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Routing Notes</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• HR sees notifications targeted to the HR department.</li>
              <li>• The shared notification bell and staff inbox use the same Supabase source of truth.</li>
              <li>• Admin users still see all notifications from the global feed.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
