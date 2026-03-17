"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { appConfig } from "@/lib/config/app";
import {
  getDepartmentFromPath,
  getSidebarSections,
  findNavigationItem,
} from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";
import { logoutStaffAction } from "@/server/actions/auth/logout";

export function Sidebar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const current = findNavigationItem(pathname);
  const department = getDepartmentFromPath(pathname);
  const sections = getSidebarSections(department);

  return (
    <aside className="hidden h-full w-60 shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col xl:sticky xl:top-0 xl:self-start">
      <div className="shrink-0 bg-white px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Icon name="hospital" className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-slate-900">
              {appConfig.appName}
            </h1>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
              Internal Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {sections.map((section, sectionIndex) => (
          <div key={section.section} className={cn(sectionIndex > 0 && "mt-4")}>
            {sectionIndex > 0 ? (
              <div className="px-4 pb-2 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  {section.section}
                </span>
              </div>
            ) : null}

            <div className="space-y-1">
              {(() => {
                // Only the most specific matching item in this section is active (longest href that matches).
                const matchingHref = section.items
                  .filter((i) => i.href && (pathname === i.href || pathname.startsWith(`${i.href}/`)))
                  .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0]?.href;
                return section.items.map((item) => {
                  const isActive = !!item.href && item.href === matchingHref;
                  const isProfileSection = section.section === "Profile";

                const className = cn(
                  "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? isProfileSection
                      ? "bg-orange-500 font-semibold text-white"
                      : "bg-[color-mix(in_srgb,var(--accent)_10%,white)] font-semibold text-accent-foreground"
                    : item.href
                      ? isProfileSection
                        ? "font-medium text-slate-600 hover:bg-blue-50 hover:text-slate-950"
                        : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      : "cursor-default font-medium text-slate-400",
                );

                const content = (
                  <>
                    <Icon
                      name={item.icon as React.ComponentProps<typeof Icon>["name"]}
                      className={cn(
                        isActive
                          ? isProfileSection
                            ? "text-white"
                            : "text-accent-foreground"
                          : item.href
                            ? "text-slate-500 group-hover:text-accent-foreground"
                            : "text-slate-400",
                      )}
                    />
                    <span>{item.label}</span>
                    {!item.href ? (
                      <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Planned
                      </span>
                    ) : null}
                  </>
                );

                return item.href ? (
                  <Link key={`${section.section}-${item.label}`} href={item.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <div key={`${section.section}-${item.label}`} className={className}>
                    {content}
                  </div>
                );
              });
              })()}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-200 bg-white p-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-700">
              All systems online
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {current?.label ?? "Workspace"} active
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => logoutStaffAction())}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-60"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isPending ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
