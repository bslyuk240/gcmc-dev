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
import { useHMSSession } from "@/modules/rbac/hooks";

function getHomeHref(dept: DepartmentKey) {
  return departmentHomePaths[dept] ?? INTERNAL_PREFIX;
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

function MenuIcon({ active }: { active: boolean }) {
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
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
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

type NavItem = {
  label: string;
  Icon: ComponentType<{ active: boolean }>;
  activeTest?: (pathname: string) => boolean;
  href?: string;
  onClick?: () => void;
  badge?: number;
};

export function BottomNav() {
  const pathname = usePathname() ?? "";
  const session = useHMSSession();
  const dept = getDepartmentFromPath(pathname);
  const homeDept = session?.department ?? dept;
  const homeHref = getHomeHref(homeDept);
  const notifHref = `${INTERNAL_PREFIX}/notifications`;
  const chatHref = `${INTERNAL_PREFIX}/chat`;
  const { unreadCount } = useNotificationStore(dept);

  const navItems: NavItem[] = [
    {
      label: "Menu",
      Icon: MenuIcon,
      onClick: () => {
        window.dispatchEvent(new Event("hms:open-mobile-sidebar"));
      },
    },
    {
      href: homeHref,
      label: "Home",
      Icon: HomeIcon,
      activeTest: (p) =>
        p === homeHref || (p.startsWith(`${homeHref}/`) && !p.startsWith(notifHref)),
    },
    {
      href: notifHref,
      label: "Notifications",
      Icon: BellIcon,
      activeTest: (p) => p === notifHref || p.startsWith(`${notifHref}/`),
      badge: unreadCount,
    },
    {
      href: chatHref,
      label: "Chat to IT",
      Icon: ChatIcon,
      activeTest: (p) => p === chatHref || p.startsWith(`${chatHref}/`),
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
          const isActive = item.activeTest?.(pathname) ?? false;
          const className = cn(
            "flex flex-1 select-none flex-col items-center gap-0.5 py-2.5 text-center",
            "active:opacity-70",
            isActive ? "text-blue-600" : "text-slate-400",
          );

          const content = (
            <>
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
            </>
          );

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={className}
                style={{ touchAction: "manipulation" }}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              prefetch={true}
              className={className}
              style={{ touchAction: "manipulation" }}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
