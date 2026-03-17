import Link from "next/link";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Match screenshot: Dr. Julianne Smith, Senior Neurologist, etc.
const staff = {
  name: "Dr. Julianne Smith",
  designation: "Senior Neurologist",
  staffId: "HSP.9042",
  department: "Neurology Dept.",
  hired: "Jan 12, 2018",
  supervisor: "Dr. Marcus Chen",
  lastLogin: "2 mins ago",
  branch: "Central Hospital",
  avatar: null as string | null,
};

const summaryCards = [
  {
    title: "LEAVE SUMMARY",
    value: "12 Days",
    description: "Remaining annual leave balance",
    progress: 60,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "ATTENDANCE",
    value: "98.4%",
    description: "On-time arrival this month",
    trend: "+2.1% from last month",
    trendUp: true,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "DOCUMENTS",
    value: "24 Files",
    description: "Verified compliance documents",
    link: "Manage Repository",
    linkHref: `${INTERNAL_PREFIX}/profile/documents`,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "TRAINING",
    value: "2 Due",
    description: "Required certifications expiring soon",
    alert: "⚠️ Action required by Friday",
    alertRed: true,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" strokeWidth="2" />
        <path d="M10 21a2 2 0 0 0 4 0" strokeWidth="2" />
      </svg>
    ),
  },
];

const recentActivity = [
  { icon: "login", text: "Authenticated via Workstation #402", time: "Today, 08:32 AM" },
  { icon: "document", text: "Annual Medical License Renewal (2024-2025)", time: "Yesterday, 02:15 PM" },
  { icon: "training", text: "Advanced Patient Privacy & HIPAA Compliance", time: "2 Days ago, 10:00 AM" },
];

const quickActions = [
  { label: "Shift Swap", icon: "calendar" as const, href: `${INTERNAL_PREFIX}/profile/leave` },
  { label: "Payslip", icon: "wallet" as const, href: `${INTERNAL_PREFIX}/profile/payroll` },
  { label: "Chat to HR", icon: "headset" as const, href: `${INTERNAL_PREFIX}/profile/chat` },
  { label: "Compliance", icon: "document-check" as const, href: `${INTERNAL_PREFIX}/profile/training` },
];

function IdIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M8 12h8M8 16h4" strokeLinecap="round" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function StaffProfileOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Profile header — avatar, name, ID/Dept, buttons, info bar */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700">
              {staff.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{staff.name}</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-600">{staff.designation}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <IdIcon className="h-4 w-4 text-slate-500" />
                ID: {staff.staffId}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 6v12M8 10h8M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /></svg>
                {staff.department}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="md" href={`${INTERNAL_PREFIX}/profile/settings`}>
                Edit Profile
              </Button>
              <Button variant="outline" size="md" href={`${INTERNAL_PREFIX}/profile/settings`}>
                <LockIcon className="h-4 w-4" />
                Password
              </Button>
              <Button className="bg-orange-500 text-white hover:bg-orange-600 hover:opacity-95" size="md">
                <UploadIcon className="h-4 w-4" />
                Upload
              </Button>
              <Button className="border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100" size="md" href={`${INTERNAL_PREFIX}/profile/leave`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                Request Leave
              </Button>
            </div>
          </div>
        </div>
        {/* Info bar */}
        <div className="flex flex-wrap items-center gap-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            Hired: {staff.hired}
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" /></svg>
            Supervisor: {staff.supervisor}
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            Last Login: {staff.lastLogin}
          </span>
          <span className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-slate-500" />
            Branch: {staff.branch}
          </span>
        </div>
      </div>

      {/* Summary cards — Leave, Attendance, Documents, Training */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <div className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}>
              {card.icon}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.title}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-0.5 text-sm text-slate-600">{card.description}</p>
            {"progress" in card && card.progress != null && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${card.progress}%` }} />
              </div>
            )}
            {"trend" in card && card.trend && (
              <p className={`mt-2 text-xs font-medium ${card.trendUp ? "text-emerald-600" : "text-slate-500"}`}>
                {card.trendUp && (
                  <svg className="mr-0.5 inline h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                )}
                {card.trend}
              </p>
            )}
            {"link" in card && card.link && (
              <a href={"linkHref" in card && (card as { linkHref?: string }).linkHref ? (card as { linkHref: string }).linkHref : "#"} className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline">
                {card.link} →
              </a>
            )}
            {"alert" in card && card.alert && (
              <p className={`mt-2 text-xs font-medium ${(card as { alertRed?: boolean }).alertRed ? "text-red-600" : "text-slate-600"}`}>
                {card.alert}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Recent Activity + Quick Actions + Upcoming Shift */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              <a href={`${INTERNAL_PREFIX}/profile/activity`} className="text-sm font-semibold text-orange-600 hover:underline">
                View All
              </a>
            </div>
            <ul className="mt-4 space-y-4">
              {recentActivity.map((a, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    {a.icon === "login" && <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                    {a.icon === "document" && <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>}
                    {a.icon === "training" && <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" /></svg>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{a.text}</p>
                    <p className="text-xs text-slate-500">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {quickActions.map((q) => (
                  <Link
                    key={q.label}
                    href={q.href}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-6 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {q.icon === "calendar" && <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>}
                    {q.icon === "wallet" && <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M7 15h2" /></svg>}
                    {q.icon === "headset" && <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 10a6 6 0 1 0-12 0v5a2 2 0 0 0 2 2h1" /><path d="M16 17h2a2 2 0 0 0 2-2v-5" /><path d="M9 21h6" /></svg>}
                    {q.icon === "document-check" && <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 15l2 2 4-4" /></svg>}
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </div>
        <div>
          <Card className="border-l-4 border-l-orange-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Upcoming Shift</p>
            <p className="mt-1 font-semibold text-slate-900">Night Duty-Wing A</p>
            <p className="mt-0.5 text-sm font-bold text-slate-700">Tonight, 10:00 PM - 08:00 AM</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
