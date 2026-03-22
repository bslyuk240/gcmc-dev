"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils/cn";
import {
  INTERNAL_PREFIX,
  departmentHomePaths,
  getDepartmentFromPath,
} from "@/lib/constants/navigation";
import type { DepartmentKey } from "@/lib/constants/navigation";
import { useNotificationStore } from "@/lib/hooks/use-notification-store";

function getHomeHref(dept: DepartmentKey): string {
  if (dept === "profile" || dept === "notifications" || dept === "support") {
    return departmentHomePaths.dashboard;
  }

  return departmentHomePaths[dept] ?? `${INTERNAL_PREFIX}/profile`;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ active: boolean }>;
  activeTest: (pathname: string) => boolean;
  badge?: number;
};

export function BottomNav() {
  const pathname = usePathname();
  const dept = getDepartmentFromPath(pathname);
  const homeHref = getHomeHref(dept);
  const notifHref = `${INTERNAL_PREFIX}/notifications`;
  const chatHref = `${INTERNAL_PREFIX}/it/chat`;
  const { unreadCount } = useNotificationStore(dept);

  const navItems: NavItem[] = [
    {
      href: homeHref,
      label: "Home",
      Icon: HomeIcon,
      activeTest: (p) =>
        p === homeHref || (p.startsWith(`${homeHref}/`) && !p.startsWith(notifHref)),
    },
    {
      href: notifHref,
      label: "Alerts",
      Icon: BellIcon,
      activeTest: (p) => p === notifHref || p.startsWith(`${notifHref}/`),
      badge: unreadCount,
    },
    {
      href: chatHref,
      label: "Chat",
      Icon: ChatIcon,
      activeTest: (p) => p === chatHref || p.startsWith(`${chatHref}/`),
    },
    {
      href: `${INTERNAL_PREFIX}/profile`,
      label: "Profile",
      Icon: UserIcon,
      activeTest: (p) => p === `${INTERNAL_PREFIX}/profile` || p.startsWith(`${INTERNAL_PREFIX}/profile/`),
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
          const NavIcon = item.Icon;
          const isActive = item.activeTest(pathname);
          const className = cn(
            "flex flex-1 select-none flex-col items-center gap-0.5 py-2.5 text-center",
            "active:opacity-70",
            isActive ? "text-blue-600" : "text-slate-400",
          );

          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={true}
              className={className}
              style={{ touchAction: "manipulation" }}
            >
              <div className="relative">
                <NavIcon active={isActive} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={cn("text-[10px] font-semibold", isActive ? "text-blue-600" : "")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
