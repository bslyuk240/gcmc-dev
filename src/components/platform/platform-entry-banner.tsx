"use client";

import Link from "next/link";
import { useSession } from "@/modules/rbac/session-context";
import { departmentThemes } from "@/lib/constants/navigation";

export function PlatformEntryBanner() {
  const { session } = useSession();

  if (!session?.platform_entry) {
    return null;
  }

  const deptLabel =
    session.department === "non_clinical"
      ? "Staff Self-Service"
      : (departmentThemes[session.department]?.label ?? session.department);

  return (
    <div
      role="status"
      className="shrink-0 border-b border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0">
          <span className="font-semibold">Platform operator mode</span>
          <span className="text-slate-300">
            {" "}
            — You entered{" "}
            <span className="font-semibold text-white">{session.hospital_slug}</span>
            {" · "}
            {deptLabel} portal. Actions are logged.
          </span>
        </p>
        <Link
          href={`/platform/hospitals/${session.hospital_id}`}
          className="platform-btn shrink-0 rounded-none bg-white/15 px-3 py-1 text-xs font-semibold !text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
        >
          Exit to platform console →
        </Link>
      </div>
    </div>
  );
}
