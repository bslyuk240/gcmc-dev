"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/lib/hooks/use-notification-store";
import {
  onNewNotification,
  markAllReadForDept,
  getToastedIds,
  addToastedId,
  notifMatchesDept,
  NOTIF_ICONS,
  SEVERITY_BG,
  SEVERITY_RING,
  SEVERITY_BADGE,
  type AppNotification,
} from "@/lib/data/notification-store";
import { getDepartmentFromPath } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

// ─── Mini toast that floats in from the top-right ────────────────────────────
function NotifToast({
  notif,
  onDismiss,
}: {
  notif: AppNotification;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // slide in
    const t1 = setTimeout(() => setVisible(true), 50);
    // auto-dismiss after 4.5s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "fixed right-4 top-16 z-9999 w-[calc(100vw-2rem)] max-w-xs rounded-xl border shadow-xl transition-all duration-300",
        SEVERITY_BG[notif.severity],
        visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0",
      )}
      style={{ borderLeft: "4px solid" }}
    >
      <div className={cn("rounded-xl border-l-4 px-4 py-3", SEVERITY_RING[notif.severity], SEVERITY_BG[notif.severity])}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl shrink-0">
            {NOTIF_ICONS[notif.category]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900 truncate">{notif.title}</p>
              <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", SEVERITY_BADGE[notif.severity])}>
                {notif.severity}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{notif.body}</p>
          </div>
          <button
            onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
            className="ml-1 shrink-0 text-slate-400 hover:text-slate-700 text-lg leading-none"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function NotificationBell() {
  const pathname = usePathname();
  // Derive current department from URL: /app/nurses/... → "nurses"
  const currentDept = getDepartmentFromPath(pathname) ?? "admin";

  const { notifications, unreadCount, markRead: markReadFn } = useNotificationStore(currentDept);
  const [open, setOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState<AppNotification | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Prevent SSR/client hydration mismatch — unreadCount comes from localStorage
  useEffect(() => { setMounted(true); }, []);

  // Show toast for unread notifications that haven't been toasted yet (on mount)
  useEffect(() => {
    const toasted = getToastedIds();
    const fresh = notifications.filter((n) => !n.isRead && !toasted.includes(n.id));
    if (fresh.length > 0) {
      // Show toast for the most recent one
      const newest = fresh[0];
      setToastNotif(newest);
      addToastedId(newest.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // Subscribe to new live notifications (pushed during session)
  // Only show toast if the notification targets this department
  useEffect(() => {
    return onNewNotification((notif) => {
      if (notifMatchesDept(notif, currentDept)) {
        setToastNotif(notif);
        addToastedId(notif.id);
      }
    });
  }, [currentDept]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleItemClick = useCallback((notif: AppNotification) => {
    markReadFn(notif.id);
    setOpen(false);
  }, [markReadFn]);

  const handleMarkAll = useCallback(() => {
    markAllReadForDept(currentDept);
  }, [currentDept]);

  const dismissToast = useCallback(() => setToastNotif(null), []);

  // Sort: unread first, then by category urgency
  const sorted = [...notifications].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    const sev = { urgent: 0, warning: 1, info: 2, success: 3 };
    return sev[a.severity] - sev[b.severity];
  });

  return (
    <>
      {/* Toast */}
      {toastNotif && (
        <NotifToast notif={toastNotif} onDismiss={dismissToast} />
      )}

      {/* Bell button */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label={`Notifications${mounted && unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {mounted && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            ref={dropdownRef}
            className={cn(
              "absolute right-0 top-full z-50 mt-2",
              "w-[calc(100vw-2rem)] max-w-sm sm:w-96",
              "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl",
              // on very small screens, shift left to stay in viewport
              "right-0",
            )}
            role="dialog"
            aria-label="Notifications panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                {mounted && unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {mounted && unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
              {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <span className="text-4xl">🔔</span>
                  <p className="mt-2 text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sorted.map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.href}
                      onClick={() => handleItemClick(notif)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                        "border-l-4",
                        !notif.isRead ? SEVERITY_RING[notif.severity] : "border-l-transparent",
                        !notif.isRead ? "bg-opacity-30" : "",
                      )}
                    >
                      {/* Category icon */}
                      <div className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg",
                        SEVERITY_BG[notif.severity],
                      )}>
                        {NOTIF_ICONS[notif.category]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm leading-snug",
                            notif.isRead ? "font-medium text-slate-600" : "font-bold text-slate-900",
                          )}>
                            {notif.title}
                          </p>
                          <span className={cn(
                            "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                            SEVERITY_BADGE[notif.severity],
                          )}>
                            {notif.severity}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{notif.body}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{notif.createdAt}</p>
                      </div>

                      {/* Unread dot */}
                      {!notif.isRead && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-4 py-3">
              <Link
                href="/app/notifications"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                View all notifications →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
