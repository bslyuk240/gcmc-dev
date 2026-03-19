"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  INTERNAL_PREFIX,
  getDepartmentFromPath,
  departmentHomePaths,
} from "@/lib/constants/navigation";
import type { DepartmentKey } from "@/lib/constants/navigation";

function getHomeHref(dept: DepartmentKey): string {
  return departmentHomePaths[dept] ?? `${INTERNAL_PREFIX}/profile`;
}

function getChatHref(dept: DepartmentKey): string {
  if (
    dept === "profile" ||
    dept === "notifications" ||
    dept === "dashboard" ||
    dept === "support"
  )
    return "/staff/chat";
  if (dept === "it") return `${INTERNAL_PREFIX}/it/chat`;
  if (dept === "hr") return `${INTERNAL_PREFIX}/hr/chat`;
  return `${INTERNAL_PREFIX}/${dept}/chat`;
}

// ── Inline SVG icons — consistent with staff portal style ──────────────────
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const dept = getDepartmentFromPath(pathname);

  const homeHref = getHomeHref(dept);
  const chatHref = getChatHref(dept);
  const notifHref = `${INTERNAL_PREFIX}/notifications`;

  const navItems = [
    {
      href: homeHref,
      label: "Home",
      Icon: HomeIcon,
      activeTest: (p: string) =>
        p === homeHref ||
        (p.startsWith(`${homeHref}/`) && !p.startsWith(notifHref)),
    },
    {
      href: notifHref,
      label: "Alerts",
      Icon: BellIcon,
      activeTest: (p: string) => p === notifHref || p.startsWith(`${notifHref}/`),
    },
    {
      href: chatHref,
      label: "Chat",
      Icon: ChatIcon,
      activeTest: (p: string) => p === chatHref || p.startsWith(`${chatHref}/`),
    },
    {
      href: `${INTERNAL_PREFIX}/profile`,
      label: "Profile",
      Icon: UserIcon,
      activeTest: (p: string) => p === `${INTERNAL_PREFIX}/profile` || p.startsWith(`${INTERNAL_PREFIX}/profile/`),
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white xl:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex">
        {navItems.map((item) => {
          const isActive = item.activeTest(pathname);
          const NavIcon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex flex-1 select-none flex-col items-center gap-0.5 py-2.5 text-center",
                "active:opacity-70",
                isActive ? "text-blue-600" : "text-slate-400",
              )}
              style={{ touchAction: "manipulation" }}
            >
              <NavIcon active={isActive} />
              <span className={cn(
                "text-[10px] font-semibold",
                isActive ? "text-blue-600" : "",
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
