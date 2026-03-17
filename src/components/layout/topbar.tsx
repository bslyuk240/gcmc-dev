"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { departmentThemes, findNavigationItem, INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import { verifyProfileAccessAction } from "@/server/actions/auth/verify-profile-access";
import { NotificationBell } from "@/components/layout/notification-bell";
import { DeptSearch } from "@/components/layout/dept-search";

// Placeholder – replace with session when wired
const staffBasic = {
  name: "Sarah Jenkins",
  designation: "Profile Lead",
  staffId: "HSP.9042",
  email: "sarah.jenkins@hospital.org",
  department: "Front Desk",
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const item = findNavigationItem(pathname);
  const theme = departmentThemes[item?.department ?? "dashboard"];
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingProfileHref, setPendingProfileHref] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:h-16 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
        {/* Department badge — desktop only */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 sm:flex">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-bold uppercase tracking-tight text-slate-700">
            {theme.label}
          </span>
        </div>

        {/* Mobile: show dept name as plain text */}
        <span className="text-sm font-bold text-slate-800 sm:hidden">{theme.label}</span>

        {/* Search — hidden on mobile, visible from sm */}
        <DeptSearch />
      </div>

      <div className="ml-3 flex items-center gap-2 sm:ml-4 sm:gap-3">
        {/* Notification bell — always visible */}
        <NotificationBell />

        {/* Settings — desktop only */}
        <div className="hidden items-center border-r border-slate-200 pr-2 sm:flex">
          <button className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
            <Icon name="settings" className="h-4 w-4" />
          </button>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2 rounded-lg py-1.5 pr-1 transition sm:gap-3 sm:pl-2",
              profileOpen ? "bg-slate-100" : "hover:bg-slate-50",
            )}
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-none text-slate-900">
                {staffBasic.name}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-tight text-slate-500">
                {staffBasic.designation}
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-(--accent)/20 bg-accent/10 text-xs font-bold text-accent-foreground sm:h-9 sm:w-9 sm:text-sm">
              {staffBasic.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <Icon name="chevron" className={cn("h-3.5 w-3.5 text-slate-400 transition sm:h-4 sm:w-4", profileOpen && "rotate-180")} />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-3 shadow-lg"
              role="menu"
            >
              <div className="border-b border-slate-100 px-4 pb-3">
                <p className="text-sm font-bold text-slate-900">{staffBasic.name}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-tight text-slate-500">{staffBasic.designation}</p>
                <p className="mt-2 text-xs text-slate-600">ID: {staffBasic.staffId}</p>
                <p className="mt-0.5 text-xs text-slate-600">{staffBasic.email}</p>
                <p className="mt-0.5 text-xs text-slate-600">{staffBasic.department}</p>
              </div>
              <div className="px-2 pt-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setPendingProfileHref(`${INTERNAL_PREFIX}/profile`);
                    setPasswordModalOpen(true);
                    setPassword("");
                    setPasswordError(null);
                    setProfileOpen(false);
                  }}
                >
                  <Icon name="patients" className="h-4 w-4 text-slate-500" />
                  My profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setPendingProfileHref(`${INTERNAL_PREFIX}/profile/settings`);
                    setPasswordModalOpen(true);
                    setPassword("");
                    setPasswordError(null);
                    setProfileOpen(false);
                  }}
                >
                  <Icon name="settings" className="h-4 w-4 text-slate-500" />
                  Settings
                </button>
              </div>
            </div>
          )}
        </div>

        <Modal
          open={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setPendingProfileHref(null);
            setPassword("");
            setPasswordError(null);
          }}
          title="Confirm your password"
        >
          <p className="text-sm text-slate-600">
            Enter your password to access your full profile and settings.
          </p>
          <div className="mt-4">
            <label htmlFor="profile-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="profile-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(null);
              }}
              placeholder="Enter your password"
              className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
              autoComplete="current-password"
              disabled={verifying}
            />
            {passwordError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {passwordError}
              </p>
            )}
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordModalOpen(false);
                setPendingProfileHref(null);
                setPassword("");
                setPasswordError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={verifying || !password.trim()}
              onClick={async () => {
                setVerifying(true);
                setPasswordError(null);
                const result = await verifyProfileAccessAction(password);
                setVerifying(false);
                if (result.success && pendingProfileHref) {
                  setPasswordModalOpen(false);
                  setPendingProfileHref(null);
                  setPassword("");
                  router.push(pendingProfileHref);
                } else {
                  setPasswordError(result.error ?? "Invalid password. Please try again.");
                }
              }}
            >
              {verifying ? "Verifying…" : "Continue"}
            </Button>
          </ModalFooter>
        </Modal>

      </div>
    </header>
  );
}
