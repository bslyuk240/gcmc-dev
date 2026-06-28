"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { HrPageHeader, HrCardTitle } from "@/components/hr/hr-ui";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

const SETTINGS_LINKS = [
  { label: "Leave Types & Policies", href: `${INTERNAL_PREFIX}/hr/leave-settings`, desc: "Configure leave types, entitlements, and approval rules." },
  { label: "Roles & Permissions", href: `${INTERNAL_PREFIX}/hr/roles-permissions`, desc: "Manage role-based access for hospital staff." },
  { label: "Onboarding & Exit", href: `${INTERNAL_PREFIX}/hr/onboarding`, desc: "Staff onboarding workflows and offboarding clearance." },
  { label: "Notifications", href: `${INTERNAL_PREFIX}/hr/notifications`, desc: "HR notification preferences and templates." },
  { label: "Payslips", href: `${INTERNAL_PREFIX}/hr/payslips`, desc: "Payslip templates and staff self-service access." },
];

export default function HrSettingsPage() {
  return (
    <div className="space-y-6">
      <HrPageHeader
        title="Settings"
        subtitle="HR configuration — leave policies, salary structures, shifts, and notifications."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <HrCardTitle title="HR Settings" />
          <div className="divide-y divide-slate-100">
            {SETTINGS_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col gap-0.5 px-5 py-4 transition hover:bg-slate-50"
              >
                <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                <span className="text-xs text-slate-500">{item.desc}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-800">Default working days</h3>
          <p className="mt-1 text-xs text-slate-500">Mon – Fri (hospital standard)</p>
          <div className="mt-4 flex flex-wrap gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <span
                key={d}
                className={`rounded-none px-2 py-1 text-xs font-semibold ${
                  i < 5 ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                {d}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Default hours: 8:00 AM – 4:00 PM</p>
          <button
            type="button"
            className="mt-4 w-full rounded-none bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Save Changes
          </button>
        </Card>
      </div>
    </div>
  );
}
