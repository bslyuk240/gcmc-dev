"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";
import {
  INTERNAL_PREFIX,
  getDepartmentFromPath,
  departmentHomePaths,
} from "@/lib/constants/navigation";
import type { DepartmentKey } from "@/lib/constants/navigation";

/**
 * Returns the correct chat href for the current department.
 * - profile pages → HR chat
 * - IT → IT chat inbox
 * - HR → HR chat inbox
 * - all other departments → /app/{dept}/chat
 */
function getChatHref(dept: DepartmentKey): string {
  if (dept === "profile" || dept === "notifications") return `${INTERNAL_PREFIX}/profile/chat`;
  if (dept === "it") return `${INTERNAL_PREFIX}/it/chat`;
  if (dept === "hr") return `${INTERNAL_PREFIX}/hr/chat`;
  if (dept === "dashboard") return `${INTERNAL_PREFIX}/profile/chat`;
  if (dept === "support") return `${INTERNAL_PREFIX}/profile/chat`;
  // Every real department has its own /app/{dept}/chat page
  return `${INTERNAL_PREFIX}/${dept}/chat`;
}

/**
 * Returns the home href for the current department.
 * Falls back to /app/profile if the dept is unknown.
 */
function getHomeHref(dept: DepartmentKey): string {
  return departmentHomePaths[dept] ?? `${INTERNAL_PREFIX}/profile`;
}

export function BottomNav() {
  const pathname = usePathname();
  const dept = getDepartmentFromPath(pathname);

  const homeHref = getHomeHref(dept);
  const chatHref = getChatHref(dept);

  const navItems = [
    {
      href: homeHref,
      label: "Home",
      icon: "dashboard" as const,
      // active if on the dept root or any sub-page (but not chat/notifications/profile)
      activeTest: (p: string) =>
        p === homeHref ||
        (p.startsWith(homeHref + "/") &&
          !p.startsWith(`${INTERNAL_PREFIX}/profile`) &&
          !p.startsWith(`${INTERNAL_PREFIX}/notifications`)),
    },
    {
      href: chatHref,
      label: "Chat",
      icon: "support" as const,
      activeTest: (p: string) => p === chatHref || p.startsWith(chatHref + "/"),
    },
    {
      href: `${INTERNAL_PREFIX}/notifications`,
      label: "Alerts",
      icon: "bell" as const,
      activeTest: (p: string) =>
        p === `${INTERNAL_PREFIX}/notifications` ||
        p.startsWith(`${INTERNAL_PREFIX}/notifications/`) ||
        p === `${INTERNAL_PREFIX}/profile/notifications`,
    },
    {
      href: `${INTERNAL_PREFIX}/profile`,
      label: "Profile",
      icon: "settings" as const,
      activeTest: (p: string) =>
        p === `${INTERNAL_PREFIX}/profile` ||
        p.startsWith(`${INTERNAL_PREFIX}/profile/`),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card xl:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around py-1.5">
        {navItems.map((item) => {
          const isActive = item.activeTest(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-4 py-1.5 text-[10px] font-semibold transition",
                isActive
                  ? "text-accent-foreground"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Icon
                name={item.icon}
                className={cn(
                  "h-5 w-5 transition",
                  isActive ? "text-accent-foreground" : "text-slate-400",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
