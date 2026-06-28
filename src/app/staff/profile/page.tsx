"use client";

import { useEffect, useRef, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useStaffPortalStore } from "@/lib/hooks/use-staff-portal-store";
import { fetchStaffProfileDetails } from "@/lib/staff-portal/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatStaffDisplayId } from "@/lib/staff-id";
import { formatDepartmentLabel } from "@/lib/chat/types";
import type { StaffProfileDetails } from "@/modules/staff-portal/types";

const DEPT_LABELS: Record<string, string> = {
  frontdesk: "Front Desk", doctors: "Doctors", nurses: "Nurses Bay",
  pharmacy: "Pharmacy", lab: "Laboratory", accounts: "Accounts",
  store: "Store", admin: "Admin", hr: "HR", it: "IT",
  nhis: "NHIS",
};

function formatPersonName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatRoleTitle(value: string) {
  return value
    .trim()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();

      if (["hr", "it", "icu", "nhis", "hmo"].includes(lower)) {
        return lower.toUpperCase();
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function maskAccountNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return value;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

type Tab = "info" | "employment" | "security";

const TABS: { id: Tab; label: string }[] = [
  { id: "info",       label: "My Info" },
  { id: "employment", label: "Employment" },
  { id: "security",   label: "Security" },
];

export default function StaffProfilePage() {
  const session = useHMSSession();
  const { payslips } = useStaffPortalStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hydratedProfileRef = useRef(false);

  const [profileDetails, setProfileDetails] = useState<StaffProfileDetails | null>(null);

  const [tab, setTab]         = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() => session?.avatar_url?.trim() ?? null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  // Editable personal fields
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved]     = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg,     setPwMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSaveProfile() {
    setSaveBusy(true);
    setSaveError(null);

    try {
      const response = await fetch("/staff/profile/details", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, homeAddress: address }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Profile update failed.");
      }

      if (typeof payload?.phone === "string") {
        setPhone(payload.phone);
      }
      if (typeof payload?.homeAddress === "string") {
        setAddress(payload.homeAddress);
      }

      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Profile update failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) { setPwMsg({ text: "Fill in all fields.", ok: false }); return; }
    if (newPw !== confirmPw)               { setPwMsg({ text: "Passwords do not match.", ok: false }); return; }
    if (newPw.length < 8)                  { setPwMsg({ text: "Password must be at least 8 characters.", ok: false }); return; }

    try {
      const response = await fetch("/staff/profile/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Password update failed.");
      }

      setPwMsg({ text: "Password changed successfully.", ok: true });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwMsg(null), 3000);
    } catch (error) {
      setPwMsg({
        text: error instanceof Error ? error.message : "Password update failed.",
        ok: false,
      });
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setAvatarMsg("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg("Image must be 5 MB or smaller.");
      return;
    }

    setAvatarBusy(true);
    setAvatarMsg(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/staff/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload failed.");
      }

      const nextAvatarUrl = typeof payload?.avatarUrl === "string" ? payload.avatarUrl : null;
      setAvatarUrl(nextAvatarUrl);
      setAvatarMsg("Profile photo updated.");
      router.refresh();
    } catch (error) {
      setAvatarMsg(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setAvatarBusy(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const readCls  = "w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 cursor-default";

  const currentSession = session;
  const initials = currentSession?.full_name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const employeeId = currentSession
    ? formatStaffDisplayId({
        id: currentSession.staff_id,
        name: currentSession.full_name,
        department: currentSession.department,
      })
    : "STA.XX0000";
  const displayName = currentSession ? formatPersonName(currentSession.full_name) : "Staff Member";
  const departmentLabel = currentSession
    ? (DEPT_LABELS[currentSession.department] ?? formatDepartmentLabel(currentSession.department))
    : "—";
  const roleLabel = currentSession ? formatRoleTitle(currentSession.role) : "—";
  const latestPayslip = currentSession
    ? payslips.find((item) => item.staffId === currentSession.staff_id) ?? null
    : null;
  const employmentStartDate = "Pending HR setup";
  const employmentContractType = "Permanent";
  const employmentUnit = profileDetails?.unit ?? "—";
  const employmentLineManager = "HR Manager";
  const employmentSalary = "Pending HR setup";
  const bankName = profileDetails?.bankName ?? latestPayslip?.bankName ?? "Managed by Accounts";
  const bankAccountSource = profileDetails?.bankAccount ?? latestPayslip?.bankAccount ?? "";
  const bankAccount = bankAccountSource ? maskAccountNumber(bankAccountSource) : "Managed by Accounts";
  const taxId = profileDetails?.taxId ?? latestPayslip?.taxId ?? "Managed by Accounts";
  const pensionNumber = profileDetails?.pensionNumber ?? "Managed by Accounts";
  const nhfNumber = profileDetails?.nhfNumber ?? "Managed by Accounts";
  const emergencyName = profileDetails?.emergencyContactName ?? "Pending HR setup";
  const emergencyRelationship = profileDetails?.emergencyContactRelationship ?? "Pending HR setup";
  const emergencyPhone = profileDetails?.emergencyContactPhone ?? "Pending HR setup";
  const emergencyAddress = profileDetails?.emergencyContactAddress ?? "Pending HR setup";

  useEffect(() => {
    if (!session?.staff_id) return;
    fetchStaffProfileDetails()
      .then((details) => setProfileDetails(details as StaffProfileDetails))
      .catch(() => {});
  }, [session?.staff_id]);

  useEffect(() => {
    if (hydratedProfileRef.current || !profileDetails) return;
    setPhone(profileDetails.phone || "");
    setAddress(profileDetails.homeAddress || "");
    hydratedProfileRef.current = true;
  }, [profileDetails]);

  if (!currentSession) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Avatar + header ─────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-2xl border px-5 py-4 ${
          avatarUrl ? "border-indigo-200 bg-indigo-950/5" : "border-indigo-100 bg-white"
        }`}
      >
        {avatarUrl ? (
          <>
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-90"
              style={{ backgroundImage: `url(${avatarUrl})` }}
            />
            <div className="absolute inset-0 bg-slate-950/40" />
          </>
        ) : null}

        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-black ${
              avatarUrl ? "border border-white/30 bg-white/20 text-white" : "bg-indigo-600 text-white"
            }`}
            aria-label="Upload profile photo"
            disabled={avatarBusy}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`truncate text-xl font-black ${avatarUrl ? "text-white" : "text-slate-900"}`}>{displayName}</h1>
            <p className={`text-sm ${avatarUrl ? "text-white/85" : "text-slate-500"}`}>
              {departmentLabel} · {roleLabel}
            </p>
            <p className={`text-xs mt-0.5 ${avatarUrl ? "text-white/70" : "text-slate-400"}`}>{employeeId} · {employmentContractType}</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void handleAvatarUpload(file);
          event.currentTarget.value = "";
        }}
      />

      {avatarMsg && (
        <p className={`text-xs font-medium ${avatarMsg.includes("updated") ? "text-emerald-600" : "text-rose-600"}`}>
          {avatarMsg}
        </p>
      )}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
        disabled={avatarBusy}
      >
        {avatarBusy ? "Uploading..." : "Upload profile photo"}
      </button>
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
              <button onClick={() => void handleSaveProfile()} className="text-xs font-bold text-emerald-600 hover:underline" disabled={saveBusy}>
                {saveBusy ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>

          {[
            { label: "Full Name",    value: displayName, readOnly: true },
            { label: "Email",        value: session.email,     readOnly: true },
            { label: "Staff ID",     value: employeeId, readOnly: true },
            { label: "Department",   value: departmentLabel, readOnly: true },
            { label: "Role",         value: roleLabel, readOnly: true },
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
              <div className={readCls}>{address || "Update with HR"}</div>
            )}
          </div>

          {saved && (
            <p className="rounded-xl bg-emerald-50 py-2 text-center text-sm font-semibold text-emerald-700">
              Profile updated successfully.
            </p>
          )}
          {saveError && (
            <p className="rounded-xl bg-rose-50 py-2 text-center text-sm font-semibold text-rose-700">
              {saveError}
            </p>
          )}

          <p className="text-center text-xs text-slate-400">
            Only your photo, phone number, home address, and password can be edited here.{" "}
            Name, email, department, staff ID, and role are controlled by HR.{" "}
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
              { label: "Start Date",     value: employmentStartDate },
              { label: "Contract Type",  value: employmentContractType },
              { label: "Department",     value: departmentLabel },
              { label: "Assigned Unit",  value: employmentUnit },
              { label: "Line Manager",   value: employmentLineManager },
              { label: "Base Salary",    value: employmentSalary },
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
              { label: "Bank",           value: bankName },
              { label: "Account Number", value: bankAccount },
              { label: "Tax ID (TIN)",   value: taxId },
              { label: "Pension No.",    value: pensionNumber },
              { label: "NHF Number",     value: nhfNumber },
            ].map((f) => (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{f.label}</span>
                <span className="font-semibold text-slate-900 font-mono">{f.value}</span>
              </div>
            ))}
            <p className="text-xs text-slate-400">Contact Accounts to confirm payroll and banking details.</p>
          </div>

          {/* Emergency contact */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Emergency Contact</p>
            {[
              { label: "Name",         value: emergencyName },
              { label: "Relationship", value: emergencyRelationship },
              { label: "Phone",        value: emergencyPhone },
              { label: "Address",      value: emergencyAddress },
            ].map((f) => (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-amber-700/70">{f.label}</span>
                <span className="font-semibold text-amber-900 text-right max-w-[60%]">{f.value}</span>
              </div>
            ))}
            <p className="text-xs text-amber-600">Emergency contact details are set and maintained by HR.</p>
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
            <button type="button" onClick={() => void handleChangePassword()} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition">
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
              <span className="font-semibold text-slate-900">{departmentLabel}</span>
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition"
              onClick={async () => {
                await fetch("/staff/logout", { method: "POST" });
                window.location.replace("/staff/login");
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

    </div>
  );
}




