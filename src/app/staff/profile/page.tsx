"use client";

import { useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { logoutStaffPortalAction } from "@/server/actions/auth/logout-staff-portal";
import Link from "next/link";
import { formatStaffDisplayId } from "@/lib/staff-id";

const DEPT_LABELS: Record<string, string> = {
  frontdesk: "Front Desk", doctors: "Doctors", nurses: "Nurses Bay",
  pharmacy: "Pharmacy", lab: "Laboratory", accounts: "Accounts",
  store: "Store", admin: "Admin", hr: "HR", it: "IT",
};

// Seed employment data (would come from Supabase in production)
const EMPLOYMENT_DATA = {
  startDate:     "15 Jan 2023",
  contractType:  "Full-time Permanent",
  unit:          "ICU / Ward A",
  lineManager:   "Dr. Kwame Mensah",
  bankName:      "GTBank",
  accountNumber: "****4521",
  taxId:         "TIN-8821",
  pension:       "PEN-0021-A",
  nhfNumber:     "NHF-8812",
};

const EMERGENCY_DATA = {
  name:         "Mrs. Adaeze Osei",
  relationship: "Spouse",
  phone:        "+234 801 *** ****",
  address:      "14 Lekki Phase 1, Lagos",
};

const ACTIVITY_LOG = [
  { time: "Today 08:32",    action: "Clocked in",                     detail: "ICU Unit" },
  { time: "Yesterday 14:05",action: "Clocked out",                    detail: "7.1 hours worked" },
  { time: "Mar 14",         action: "Leave application submitted",    detail: "Annual Leave · Apr 7–11" },
  { time: "Mar 13",         action: "Payslip viewed",                 detail: "March 2026" },
  { time: "Mar 10",         action: "Shift swap requested",           detail: "Mar 20 Night Shift" },
  { time: "Mar 01",         action: "Password changed",               detail: "Security update" },
];

type Tab = "info" | "employment" | "security" | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "info",       label: "My Info" },
  { id: "employment", label: "Employment" },
  { id: "security",   label: "Security" },
  { id: "activity",   label: "Activity" },
];

export default function StaffProfilePage() {
  const session = useHMSSession();

  const [tab, setTab]         = useState<Tab>("info");
  const [editing, setEditing] = useState(false);

  // Editable personal fields
  const [phone, setPhone]     = useState("+234 801 234 5678");
  const [address, setAddress] = useState("12 Lekki Phase 1, Lagos");
  const [saved, setSaved]     = useState(false);

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg,     setPwMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  function handleSaveProfile() {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) { setPwMsg({ text: "Fill in all fields.", ok: false }); return; }
    if (newPw !== confirmPw)               { setPwMsg({ text: "Passwords do not match.", ok: false }); return; }
    if (newPw.length < 8)                  { setPwMsg({ text: "Password must be at least 8 characters.", ok: false }); return; }
    setPwMsg({ text: "Password changed successfully.", ok: true });
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwMsg(null), 3000);
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const readCls  = "w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 cursor-default";

  const initials = session?.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const employeeId = session
    ? formatStaffDisplayId({
        id: session.staff_id,
        name: session.full_name,
        department: session.department,
      })
    : "STA.XX0000";

  if (!session) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Avatar + header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-black text-white shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-slate-900 truncate">{session.full_name}</h1>
          <p className="text-sm text-slate-500">
            {DEPT_LABELS[session.department] ?? session.department} · {session.role.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{employeeId} · {EMPLOYMENT_DATA.contractType}</p>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${
              tab === t.id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MY INFO tab ─────────────────────────────────────────────────── */}
      {tab === "info" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Personal Information</p>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-xs font-bold text-indigo-600 hover:underline">
                Edit
              </button>
            ) : (
              <button onClick={handleSaveProfile} className="text-xs font-bold text-emerald-600 hover:underline">
                Save Changes
              </button>
            )}
          </div>

          {[
            { label: "Full Name",    value: session.full_name, readOnly: true },
            { label: "Email",        value: session.email,     readOnly: true },
            { label: "Staff ID",     value: employeeId, readOnly: true },
            { label: "Department",   value: DEPT_LABELS[session.department] ?? session.department, readOnly: true },
            { label: "Role",         value: session.role.replace(/_/g, " "), readOnly: true },
          ].map((f) => (
            <div key={f.label}>
              <p className="mb-1 text-xs font-semibold text-slate-500">{f.label}</p>
              <div className={readCls}>{f.value}</div>
            </div>
          ))}

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Phone Number</p>
            {editing ? (
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            ) : (
              <div className={readCls}>{phone}</div>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Home Address</p>
            {editing ? (
              <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            ) : (
              <div className={readCls}>{address}</div>
            )}
          </div>

          {saved && (
            <p className="rounded-xl bg-emerald-50 py-2 text-center text-sm font-semibold text-emerald-700">
              Profile updated successfully.
            </p>
          )}

          <p className="text-center text-xs text-slate-400">
            Name, email, and role can only be updated by HR.{" "}
            <Link href="/staff/documents" className="text-indigo-600 hover:underline">View documents →</Link>
          </p>
        </div>
      )}

      {/* ── EMPLOYMENT tab ──────────────────────────────────────────────── */}
      {tab === "employment" && (
        <div className="space-y-4">
          {/* Contract & role */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Contract & Posting</p>
            {[
              { label: "Employee ID",    value: employeeId },
              { label: "Start Date",     value: EMPLOYMENT_DATA.startDate },
              { label: "Contract Type",  value: EMPLOYMENT_DATA.contractType },
              { label: "Department",     value: DEPT_LABELS[session.department] ?? session.department },
              { label: "Assigned Unit",  value: EMPLOYMENT_DATA.unit },
              { label: "Line Manager",   value: EMPLOYMENT_DATA.lineManager },
            ].map((f) => (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{f.label}</span>
                <span className="font-semibold text-slate-900 text-right max-w-[55%]">{f.value}</span>
              </div>
            ))}
          </div>

          {/* Banking & statutory */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Banking & Statutory</p>
            {[
              { label: "Bank",           value: EMPLOYMENT_DATA.bankName },
              { label: "Account Number", value: EMPLOYMENT_DATA.accountNumber },
              { label: "Tax ID (TIN)",   value: EMPLOYMENT_DATA.taxId },
              { label: "Pension No.",    value: EMPLOYMENT_DATA.pension },
              { label: "NHF Number",     value: EMPLOYMENT_DATA.nhfNumber },
            ].map((f) => (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{f.label}</span>
                <span className="font-semibold text-slate-900 font-mono">{f.value}</span>
              </div>
            ))}
            <p className="text-xs text-slate-400">Contact HR or Accounts to update banking details.</p>
          </div>

          {/* Emergency contact */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Emergency Contact</p>
            {[
              { label: "Name",         value: EMERGENCY_DATA.name },
              { label: "Relationship", value: EMERGENCY_DATA.relationship },
              { label: "Phone",        value: EMERGENCY_DATA.phone },
              { label: "Address",      value: EMERGENCY_DATA.address },
            ].map((f) => (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-amber-700/70">{f.label}</span>
                <span className="font-semibold text-amber-900 text-right max-w-[60%]">{f.value}</span>
              </div>
            ))}
            <p className="text-xs text-amber-600">Update emergency contacts with HR.</p>
          </div>

          {/* Payslip quick access */}
          <Link href="/staff/payslips" className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
            <div>
              <p className="font-bold text-emerald-800">View Payslips</p>
              <p className="text-xs text-emerald-600">Monthly salary statements with YTD</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        </div>
      )}

      {/* ── SECURITY tab ────────────────────────────────────────────────── */}
      {tab === "security" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Change Password</p>
            {[
              { label: "Current Password",     val: currentPw, set: setCurrentPw },
              { label: "New Password",         val: newPw,     set: setNewPw },
              { label: "Confirm New Password", val: confirmPw, set: setConfirmPw },
            ].map((f) => (
              <div key={f.label}>
                <p className="mb-1 text-xs font-semibold text-slate-600">{f.label}</p>
                <input type="password" value={f.val} onChange={(e) => f.set(e.target.value)} className={inputCls} />
              </div>
            ))}
            {pwMsg && (
              <p className={`text-sm font-semibold ${pwMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{pwMsg.text}</p>
            )}
            <button onClick={handleChangePassword} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition">
              Update Password
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active Session</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Signed in as</span>
              <span className="font-semibold text-slate-900">{session.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Department</span>
              <span className="font-semibold text-slate-900">{DEPT_LABELS[session.department] ?? session.department}</span>
            </div>
            <form action={logoutStaffPortalAction}>
              <button type="submit" className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ACTIVITY tab ────────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Recent Activity</p>
          {ACTIVITY_LOG.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-indigo-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{a.action}</p>
                <p className="text-xs text-slate-400">{a.detail}</p>
              </div>
              <span className="shrink-0 text-[10px] text-slate-300">{a.time}</span>
            </div>
          ))}
          <p className="text-center text-xs text-slate-300 pt-2">
            Showing last 6 activities.
          </p>
        </div>
      )}

    </div>
  );
}
