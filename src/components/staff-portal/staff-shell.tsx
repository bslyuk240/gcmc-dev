"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import type { HMSSession } from "@/lib/auth/session";

// â”€â”€â”€ nav items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAV = [
  { href: "/staff/dashboard",    label: "Dashboard",    icon: HomeIcon },
  { href: "/staff/my-rota",      label: "My Rota",      icon: CalIcon },
  { href: "/staff/attendance",   label: "Attendance",   icon: ClockIcon },
  { href: "/staff/leave",        label: "Leave",        icon: PlaneIcon },
  { href: "/staff/payslips",     label: "Payslips",     icon: MoneyIcon },
  { href: "/staff/chat",         label: "Chat to HR",   icon: ChatIcon },
  { href: "/staff/notifications",label: "Notifications",icon: BellIcon },
  { href: "/staff/profile",      label: "Profile",      icon: UserIcon },
];

// Mobile bottom nav is staff-specific and includes the sidebar toggle.
const MOBILE_NAV = [
  { kind: "menu" as const, label: "Menu",     icon: MenuIcon },
  { kind: "link" as const, href: "/staff/dashboard", label: "Home",    icon: HomeIcon },
  { kind: "link" as const, href: "/staff/attendance", label: "Clock In", icon: ClockIcon },
  { kind: "link" as const, href: "/staff/my-rota",    label: "Rota",    icon: CalIcon },
  { kind: "link" as const, href: "/staff/chat",       label: "Chat to HR", icon: ChatIcon },
];

const DEPT_LABELS: Record<string, string> = {
  frontdesk: "Front Desk", doctors: "Doctors", nurses: "Nurses Bay",
  pharmacy: "Pharmacy", lab: "Laboratory", accounts: "Accounts",
  store: "Store", admin: "Admin", hr: "HR", it: "IT",
};

// â”€â”€â”€ SVG Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function CalIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function ClockIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function PlaneIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
    </svg>
  );
}
function MoneyIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function WorkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function StaffIdentityCard({
  href,
  initials,
  name,
  deptLabel,
  avatarUrl,
  compact = false,
}: {
  href: string;
  initials: string;
  name: string;
  deptLabel: string;
  avatarUrl?: string | null;
  compact?: boolean;
}) {
  const hasAvatar = Boolean(avatarUrl?.trim());

  return (
    <Link
      href={href}
      className={cn(
        "relative block overflow-hidden border shadow-sm transition hover:shadow-md",
        hasAvatar ? "border-indigo-200" : "border-indigo-100 bg-indigo-50",
        compact ? "mx-4 mt-4 rounded-xl p-3" : "mx-3 mt-4 rounded-xl p-3",
      )}
    >
      {hasAvatar ? (
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-90"
            style={{ backgroundImage: `url(${avatarUrl})` }}
          />
          <div className="absolute inset-0 bg-indigo-950/45" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-indigo-50" />
      )}

      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-black",
            hasAvatar
              ? "border-white/30 bg-white/20 text-white shadow-sm"
              : "border-indigo-100 bg-indigo-600 text-white",
          )}
        >
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-bold", hasAvatar ? "text-white" : "text-slate-900")}>{name}</p>
          <p className={cn("text-[11px] font-medium", hasAvatar ? "text-white/85" : "text-indigo-600")}>{deptLabel}</p>
        </div>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={hasAvatar ? "white" : "currentColor"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={hasAvatar ? "shrink-0 text-white/90" : "shrink-0 text-slate-300"}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}

// â”€â”€â”€ Shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function StaffPortalShell({
  session,
  children,
}: {
  session: HMSSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [notifCount, setNotifCount] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const openSidebar = () => setMobileSidebarOpen(true);
    window.addEventListener("hms:open-mobile-sidebar", openSidebar);
    return () => window.removeEventListener("hms:open-mobile-sidebar", openSidebar);
  }, []);

  useEffect(() => {
    const run = () => {
      try {
        const raw = localStorage.getItem("hms_notifications");
        if (raw) {
          const all = JSON.parse(raw) as Array<{ read?: boolean; targetDepartment?: string }>;
          const mine = all.filter(
            (n) => !n.read && (!n.targetDepartment || n.targetDepartment === session.department),
          );
          setNotifCount(mine.length);
        }
      } catch { /* ignore */ }
    };
    const id = setTimeout(run, 0);
    return () => clearTimeout(id);
  }, [session.department, pathname]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    const id = setTimeout(() => setMobileSidebarOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  const initials = session.full_name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const deptLabel = DEPT_LABELS[session.department] ?? session.department;
  const avatarUrl = session.avatar_url?.trim() ?? null;

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* â•â• DESKTOP SIDEBAR (hidden on mobile) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:min-h-0 lg:flex-col lg:overflow-hidden">
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm">

          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 leading-tight">Staff Portal</p>
              <p className="text-[10px] text-slate-400 leading-tight">GCMC Self-Service</p>
            </div>
          </div>

          {/* Staff info card */}
          <StaffIdentityCard
            href="/staff/profile"
            initials={initials}
            name={session.full_name}
            deptLabel={deptLabel}
            avatarUrl={avatarUrl}
          />

          {/* Navigation */}
          <nav className="mt-4 flex-1 overflow-y-auto overscroll-contain px-3 space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Menu</p>
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const isNotif = item.href === "/staff/notifications";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon active={active} />
                  <span className="flex-1">{item.label}</span>
                  {isNotif && notifCount > 0 && (
                    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      active ? "bg-white text-indigo-600" : "bg-red-500 text-white"
                    }`}>
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="p-3 mt-2 space-y-1 border-t border-slate-100">
            <Link
              href={`/app/${session.department}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <WorkIcon />
              <span>Work Portal</span>
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition"
	              onClick={async () => {
	                await fetch("/staff/logout", { method: "POST" });
	                window.location.replace("/staff/login");
	              }}
            >
              <LogoutIcon />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* â•â• MOBILE SIDEBAR OVERLAY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 flex h-full min-h-0 w-72 flex-col overflow-hidden bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                </div>
                <span className="text-sm font-black text-slate-900">Staff Portal</span>
              </div>
              <button onClick={() => setMobileSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Staff card */}
              <StaffIdentityCard
                href="/staff/profile"
                initials={initials}
                name={session.full_name}
                deptLabel={deptLabel}
                avatarUrl={avatarUrl}
                compact
              />

              {/* Nav */}
              <nav className="mt-4 flex-1 overflow-y-auto overscroll-contain px-3 space-y-0.5">
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const isNotif = item.href === "/staff/notifications";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon active={active} />
                      <span className="flex-1">{item.label}</span>
                      {isNotif && notifCount > 0 && (
                        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                          active ? "bg-white text-indigo-600" : "bg-red-500 text-white"
                        }`}>{notifCount > 9 ? "9+" : notifCount}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 space-y-1">
              <Link href={`/app/${session.department}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 transition">
                <WorkIcon /><span>Work Portal</span>
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition"
	                onClick={async () => {
	                  await fetch("/staff/logout", { method: "POST" });
	                  window.location.replace("/staff/login");
	                }}
              >
                <LogoutIcon /><span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* â•â• MAIN CONTENT AREA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="flex flex-1 flex-col lg:pl-64">

        {/* â”€â”€ Mobile top header (hidden on desktop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* â”€â”€ Desktop top bar (hidden on mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <header className="hidden lg:flex sticky top-0 z-20 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
          <div>
            <p className="text-base font-bold text-slate-900">
              {NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ?? "Staff Portal"}
            </p>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/staff/notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <BellIcon active={pathname === "/staff/notifications"} />
              {notifCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white shrink-0">
                {initials}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">{session.full_name}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{deptLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* â”€â”€ Page content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <main className="flex-1 p-4 pb-28 lg:p-6 lg:pb-6">
          {children}
        </main>
        {/* —— Mobile bottom navigation —— */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white lg:hidden"
          aria-label="Staff mobile navigation"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex">
            {MOBILE_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.kind === "menu"
                  ? mobileSidebarOpen
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const baseClass =
                "flex flex-1 select-none flex-col items-center gap-0.5 py-2.5 text-center active:opacity-70";
              const activeClass = isActive ? "text-indigo-600" : "text-slate-400";

              if (item.kind === "menu") {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setMobileSidebarOpen(true)}
                    className={cn(baseClass, activeClass)}
                    style={{ touchAction: "manipulation" }}
                  >
                    <Icon active={isActive} />
                    <span className={cn("text-[10px] font-semibold", isActive ? "text-indigo-600" : "")}>{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(baseClass, activeClass)}
                  style={{ touchAction: "manipulation" }}
                >
                  <Icon active={isActive} />
                  <span className={cn("text-[10px] font-semibold", isActive ? "text-indigo-600" : "")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}



