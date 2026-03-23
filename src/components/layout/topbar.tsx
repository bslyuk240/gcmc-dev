"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { DeptSearch } from "@/components/layout/dept-search";
import { Icon } from "@/components/ui/icon";
import { departmentThemes, findNavigationItem } from "@/lib/constants/navigation";
import { useSession } from "@/modules/rbac/session-context";
import { formatStaffDisplayId } from "@/lib/staff-id";
import { cn } from "@/lib/utils/cn";

const ROLE_LABELS: Record<string, string> = {
  admin: "System Administrator",
  hod: "Head of Department",
  hr_manager: "HR Manager",
  hr_staff: "HR Officer",
  doctor: "Medical Officer",
  nurse: "Registered Nurse",
  pharmacist: "Pharmacist",
  pharmacy_assistant: "Pharmacy Assistant",
  lab_scientist: "Lab Scientist",
  accountant: "Accountant",
  front_desk_staff: "Front Desk Officer",
  store_keeper: "Store Keeper",
  it_staff: "IT Officer",
  viewer: "Viewer",
};

export function Topbar() {
  const { session } = useSession();
  const pathname = usePathname() ?? "";
  const item = findNavigationItem(pathname);
  const theme = departmentThemes[item?.department ?? "dashboard"];
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const staffBasic = {
    name: session?.full_name ?? "Staff Member",
    designation: ROLE_LABELS[session?.role ?? ""] ?? (session?.role ?? "Staff"),
    staffId: session
      ? formatStaffDisplayId({
          id: session.staff_id,
          name: session.full_name,
          department: session.department,
        })
      : "STA.XX0000",
    email: session?.email ?? "",
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    if (!profileOpen) return;

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [profileOpen]);

  function handleOpenMobileMenu() {
    window.dispatchEvent(new Event("hms:open-mobile-sidebar"));
  }

  function handleLogout() {
    setProfileOpen(false);
  }

  const initials = staffBasic.name
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0] ?? "")
    .join("")
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-10 hidden h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:h-16 sm:px-6 xl:flex">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={handleOpenMobileMenu}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 active:opacity-70 xl:hidden"
          aria-label="Open menu"
          style={{ touchAction: "manipulation" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 sm:flex">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-bold uppercase tracking-tight text-slate-700">
            {theme.label}
          </span>
        </div>

        <span className="text-sm font-bold text-slate-800 sm:hidden">{theme.label}</span>

        <DeptSearch />
      </div>

      <div className="ml-3 flex items-center gap-2 sm:ml-4 sm:gap-3">
        <NotificationBell />

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className={cn(
              "flex items-center gap-2 rounded-lg py-1.5 pr-1 transition sm:gap-3 sm:pl-2",
              profileOpen ? "bg-slate-100" : "hover:bg-slate-50",
            )}
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-none text-slate-900">{staffBasic.name}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-tight text-slate-500">
                {staffBasic.designation}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-(--accent)/20 bg-accent/10 text-xs font-bold text-accent-foreground sm:h-9 sm:w-9 sm:text-sm">
              {initials}
            </div>
            <Icon
              name="chevron"
              className={cn("h-3.5 w-3.5 text-slate-400 transition sm:h-4 sm:w-4", profileOpen && "rotate-180")}
            />
          </button>

          {profileOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-3 shadow-lg"
              role="menu"
            >
              <div className="px-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent-foreground">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{staffBasic.name}</p>
                    <p className="text-[11px] font-medium text-slate-500">{staffBasic.designation}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>
                    ID: <span className="font-medium text-slate-700">{staffBasic.staffId}</span>
                  </p>
                  {staffBasic.email ? <p className="truncate">{staffBasic.email}</p> : null}
                </div>
              </div>

              <div className="border-t border-slate-100 px-2 pt-2">
                <Link
                  href="/staff/login?next=/staff/dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Icon name="patients" className="h-4 w-4 text-slate-500" />
                  Staff Portal
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    handleLogout();
                    await fetch("/logout", { method: "POST" });
                    window.location.replace("/login");
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 20H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
