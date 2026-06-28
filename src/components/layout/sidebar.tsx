"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getDepartmentFromPath,
  getSidebarSections,
  resolveSidebarActiveHref,
} from "@/lib/constants/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useAccountsBillingBadges } from "@/lib/hooks/use-accounts-billing-badges";
import { useTenantBranding } from "@/modules/tenant/tenant-context";

/** Labels that are only visible to HODs, HR, and Admin */
const HOD_ONLY_LABELS = new Set(["Rota Management", "Leave Requests", "Staff Performance"]);
const HOD_ALLOWED_ROLES = new Set(["hod", "hr_manager", "hr_staff", "admin"]);

function SidebarInner({
  pathname,
  onNavigate,
  showBrandHeader = true,
}: {
  pathname: string;
  onNavigate?: () => void;
  showBrandHeader?: boolean;
}) {
  const session = useHMSSession();
  const branding = useTenantBranding();
  const department = getDepartmentFromPath(pathname);
  const rawSections = getSidebarSections(department);
  const isAdminPortal = department === "admin";
  const isHrPortal = department === "hr";
  const isDarkPortal = isAdminPortal || isHrPortal;
  const portalNavClass = isAdminPortal ? "admin-nav-link" : isHrPortal ? "hr-nav-link" : "";
  const portalNavWrap = isAdminPortal ? "admin-sidebar-nav" : isHrPortal ? "hr-sidebar-nav" : "";
  const portalIconClass = isAdminPortal ? "admin-nav-icon" : isHrPortal ? "hr-nav-icon" : "";
  const portalFooterClass = isAdminPortal ? "admin-sidebar-footer" : isHrPortal ? "hr-sidebar-footer" : "";
  const portalBrandClass = isAdminPortal ? "admin-sidebar-brand" : isHrPortal ? "hr-sidebar-brand" : "";
  const portalLogoutClass = isAdminPortal ? "admin-logout" : isHrPortal ? "hr-logout" : "";
  const portalInnerClass = isAdminPortal ? "admin-sidebar-inner" : isHrPortal ? "hr-sidebar-inner" : "";
  const portalLabel = isAdminPortal ? "Admin Portal" : isHrPortal ? "HR Portal" : "Internal Portal";
  const portalAccentBg = isAdminPortal ? "bg-indigo-600" : isHrPortal ? "bg-violet-600" : "";
  const billingBadges = useAccountsBillingBadges(department);

  // Hide HOD-only items from staff who are not HOD / HR / Admin
  const isHodAllowed = HOD_ALLOWED_ROLES.has(session?.role ?? "");
  const isPlatformOperator = session?.platform_entry === true;
  const sections = rawSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => isHodAllowed || !HOD_ONLY_LABELS.has(item.label)),
  }));

  return (
    <>
      {showBrandHeader ? (
        <div className={cn("shrink-0 px-5 py-5", isDarkPortal ? portalBrandClass : "bg-white border-b border-slate-100")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center text-white",
              isDarkPortal ? cn("rounded-none", portalAccentBg) : "rounded-lg bg-accent",
            )}>
              <Icon name="hospital" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className={cn(
                "truncate text-sm font-bold leading-tight",
                isDarkPortal ? "text-white" : "text-slate-900",
              )}>
                {branding.name}
              </h1>
              <p className={cn(
                "mt-0.5 text-[9px] font-bold uppercase tracking-[0.28em]",
                isDarkPortal ? "text-slate-500" : "text-slate-400",
              )}>
                {portalLabel}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <nav className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4", portalNavWrap)}>
        {sections.map((section, sectionIndex) => (
          <div key={section.section} className={cn(sectionIndex > 0 && "mt-4")}>
            {sectionIndex > 0 && !isDarkPortal ? (
              <div className="px-4 pb-2 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  {section.section}
                </span>
              </div>
            ) : null}

            <div className="space-y-1">
              {(() => {
                const matchingHref = resolveSidebarActiveHref(pathname, section.items);

                return section.items.map((item) => {
                  const isActive = !!item.href && item.href === matchingHref;
                  const isProfileSection = section.section === "Profile";

                  const className = cn(
                    "group flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
                    isDarkPortal ? portalNavClass : "rounded-lg",
                    isActive
                      ? isProfileSection
                        ? "bg-orange-500 font-semibold text-white"
                        : isDarkPortal
                          ? "font-semibold"
                          : "bg-[color-mix(in_srgb,var(--accent)_10%,white)] font-semibold text-accent-foreground"
                      : item.href
                        ? isProfileSection
                          ? "font-medium text-slate-600 hover:bg-blue-50 hover:text-slate-950"
                          : isDarkPortal
                            ? "font-medium"
                            : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        : "cursor-default font-medium text-slate-400",
                  );

                  const badgeCount = item.href ? billingBadges[item.href] : undefined;

                  const content = (
                    <>
                      <Icon
                        name={item.icon as React.ComponentProps<typeof Icon>["name"]}
                        className={cn(
                          portalIconClass,
                          isActive
                            ? isProfileSection
                              ? "text-white"
                              : isDarkPortal
                                ? "text-white"
                                : "text-accent-foreground"
                            : item.href
                              ? isDarkPortal
                                ? "text-slate-400 group-hover:text-white"
                                : "text-slate-500 group-hover:text-accent-foreground"
                              : "text-slate-400",
                        )}
                      />
                      <span>{item.label}</span>
                      {!item.href ? (
                        <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Planned
                        </span>
                      ) : badgeCount ? (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      ) : null}
                    </>
                  );

                  return item.href ? (
                    <Link
                      key={`${section.section}-${item.label}`}
                      href={item.href}
                      className={className}
                      data-active={isActive ? "true" : "false"}
                      onClick={onNavigate}
                    >
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

      <div className={cn(
        "shrink-0 border-t p-3 pb-24 xl:pb-3",
        isDarkPortal ? portalFooterClass : "border-slate-200 bg-white",
      )}>
        {!isHrPortal && !isPlatformOperator && (
        <Link
          href="/staff/login?next=/staff/dashboard"
          className={cn(
            "flex w-full items-center justify-center gap-2 border py-2 text-xs font-semibold transition",
            isDarkPortal
              ? "rounded-none border-slate-700 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
              : "rounded-lg border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
          )}
          onClick={onNavigate}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Go to Staff Portal
        </Link>
        )}
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-center gap-2 border py-2 text-xs font-semibold transition",
            isHrPortal || isPlatformOperator ? "mt-0" : "mt-2.5",
            isDarkPortal
              ? cn(portalLogoutClass, "rounded-none border-slate-700 bg-transparent text-slate-300 hover:bg-red-950/30 hover:text-red-300")
              : "rounded-lg border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700",
          )}
          onClick={async () => {
            await fetch("/logout", { method: "POST" });
            window.location.replace("/login");
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const department = getDepartmentFromPath(pathname);
  const isDarkPortal = department === "admin" || department === "hr";

  return (
    <aside className={cn(
      "hidden h-screen min-h-0 w-60 shrink-0 overflow-hidden xl:sticky xl:top-0 xl:flex xl:self-start",
      isDarkPortal
        ? cn(
            department === "admin" && "admin-sidebar",
            department === "hr" && "hr-sidebar",
            "border-r border-slate-800 bg-[#0f172a]",
          )
        : "border-r border-slate-200 bg-white",
    )}>
      <div className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden", isDarkPortal && (department === "admin" ? "admin-sidebar-inner" : "hr-sidebar-inner"))}>
        <SidebarInner pathname={pathname} />
      </div>
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";
  const branding = useTenantBranding();
  const department = getDepartmentFromPath(pathname);
  const isDarkPortal = department === "admin" || department === "hr";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close menu"
      />

      <aside className={cn(
        "absolute inset-y-0 left-0 flex h-full min-h-0 w-72 max-w-[86vw] flex-col overflow-hidden shadow-2xl",
        isDarkPortal ? "border-r border-slate-800 bg-[#0f172a]" : "bg-white",
      )}>
        <div className={cn(
          "flex items-center justify-between px-5 py-4",
          isDarkPortal ? "border-b border-slate-800" : "border-b border-slate-100",
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center text-white",
              isDarkPortal ? cn("rounded-none", department === "admin" ? "bg-indigo-600" : "bg-violet-600") : "rounded-lg bg-accent",
            )}>
              <Icon name="hospital" className="h-4 w-4" />
            </div>
            <span className={cn("text-sm font-bold", isDarkPortal ? "text-white" : "text-slate-900")}>{branding.name}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-none p-1.5",
              isDarkPortal ? "text-slate-400 hover:bg-white/10 hover:text-white" : "rounded-lg text-slate-400 hover:bg-slate-100",
            )}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SidebarInner pathname={pathname} onNavigate={onClose} showBrandHeader={false} />
        </div>
      </aside>
    </div>
  );
}
