"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { appConfig } from "@/lib/config/app";
import {
  findNavigationItem,
  getDepartmentFromPath,
  getSidebarSections,
} from "@/lib/constants/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import { logoutStaffAction } from "@/server/actions/auth/logout";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";

/** Labels that are only visible to HODs, HR, and Admin */
const HOD_ONLY_LABELS = new Set(["Rota Management", "Leave Requests", "Staff Performance"]);
const HOD_ALLOWED_ROLES = new Set(["hod", "hr_manager", "hr_staff", "admin"]);

function SidebarInner({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const session = useHMSSession();
  const current = findNavigationItem(pathname);
  const department = getDepartmentFromPath(pathname);
  const rawSections = getSidebarSections(department);
  const { frontDeskCharges, consultationFees, labCharges, nursingCharges } = useAccountsStore();
  const { bills } = usePharmacyStore();
  const isAccountsSection = department === "accounts";
  const frontDeskQueued = frontDeskCharges.filter((charge) => charge.status === "Billed").length;
  const pharmacyQueued = bills.filter((bill) => bill.billStatus === "Pending").length;
  const consultationQueued = consultationFees.filter((fee) => fee.status === "Pending").length;
  const labQueued = labCharges.filter((charge) => charge.status === "Pending").length;
  const nursingQueued = nursingCharges.filter((charge) => charge.status === "Pending").length;
  const receivePaymentQueued = frontDeskQueued + consultationQueued + labQueued + nursingQueued + pharmacyQueued;

  // Hide HOD-only items from staff who are not HOD / HR / Admin
  const isHodAllowed = HOD_ALLOWED_ROLES.has(session?.role ?? "");
  const sections = rawSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => isHodAllowed || !HOD_ONLY_LABELS.has(item.label)),
  }));

  return (
    <>
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

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
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
                const matchingHref = section.items
                  .filter((item) => item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
                  .sort((left, right) => (right.href?.length ?? 0) - (left.href?.length ?? 0))[0]?.href;

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
                      {isAccountsSection ? (
                        <>
                          {item.label === "Receive Payment" && receivePaymentQueued > 0 ? (
                            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {receivePaymentQueued} due
                            </span>
                          ) : null}
                          {item.label === "Consultation Fees" && consultationQueued > 0 ? (
                            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {consultationQueued} due
                            </span>
                          ) : null}
                          {item.label === "Lab Billing" && labQueued > 0 ? (
                            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {labQueued} due
                            </span>
                          ) : null}
                          {item.label === "Nursing Billing" && nursingQueued > 0 ? (
                            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {nursingQueued} due
                            </span>
                          ) : null}
                          {item.label === "Pharmacy Billing" && pharmacyQueued > 0 ? (
                            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {pharmacyQueued} due
                            </span>
                          ) : null}
                        </>
                      ) : null}
                      {!item.href ? (
                        <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Planned
                        </span>
                      ) : null}
                    </>
                  );

                  return item.href ? (
                    <Link
                      key={`${section.section}-${item.label}`}
                      href={item.href}
                      className={className}
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
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isPending ? "Logging out..." : "Logout"}
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen min-h-0 w-60 shrink-0 overflow-hidden border-r border-slate-200 bg-white xl:sticky xl:top-0 xl:flex xl:self-start">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
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
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close menu"
      />

      <aside className="absolute inset-y-0 left-0 flex h-full min-h-0 w-72 max-w-[86vw] flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <Icon name="hospital" className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-900">{appConfig.appName}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SidebarInner pathname={pathname} onNavigate={onClose} />
        </div>
      </aside>
    </div>
  );
}
