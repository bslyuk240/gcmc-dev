"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHMSSession } from "@/modules/rbac/hooks";
import { insertPatientRegistration } from "@/lib/supabase/db";
import { Toast, type ToastData } from "@/components/ui/toast";

// ── helpers ──────────────────────────────────────────────────────────────────
function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function generatePatientId() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `P-${n}`;
}

// ── constants ─────────────────────────────────────────────────────────────────
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const GENDERS      = ["Male", "Female", "Other"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

function buildDob(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  const m = String(MONTHS.indexOf(month) + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function daysInMonth(month: string, year: string): number {
  const m = MONTHS.indexOf(month) + 1;
  const y = parseInt(year) || 2000;
  return m ? new Date(y, m, 0).getDate() : 31;
}

// ── DOB Picker sub-component ───────────────────────────────────────────────────
function DobPicker({
  day, month, year,
  onDay, onMonth, onYear,
}: {
  day: string; month: string; year: string;
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void;
}) {
  const totalDays = daysInMonth(month, year);
  const days = Array.from({ length: totalDays }, (_, i) => String(i + 1));

  const selCls =
    "flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 " +
    "outline-none appearance-none transition cursor-pointer " +
    "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="flex gap-2">
      {/* Day */}
      <div className="relative flex-[1]">
        <select
          value={day}
          onChange={(e) => onDay(e.target.value)}
          className={selCls}
          style={{ backgroundImage: "none" }}
        >
          <option value="">DD</option>
          {days.map((d) => <option key={d} value={d}>{d.padStart(2, "0")}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Month */}
      <div className="relative flex-[2]">
        <select
          value={month}
          onChange={(e) => { onMonth(e.target.value); if (day) onDay(""); }}
          className={selCls}
          style={{ backgroundImage: "none" }}
        >
          <option value="">Month</option>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Year */}
      <div className="relative flex-[1.3]">
        <select
          value={year}
          onChange={(e) => { onYear(e.target.value); if (day) onDay(""); }}
          className={selCls}
          style={{ backgroundImage: "none" }}
        >
          <option value="">Year</option>
          {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
  "placeholder:text-slate-400 outline-none transition " +
  "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";

// ── component ─────────────────────────────────────────────────────────────────
export default function RegisterNewPatientPage() {
  const router  = useRouter();
  const session = useHMSSession();

  // ── form state ──
  const [firstName,      setFirstName]      = useState("");
  const [lastName,       setLastName]        = useState("");
  const [dobDay,         setDobDay]          = useState("");
  const [dobMonth,       setDobMonth]        = useState("");
  const [dobYear,        setDobYear]         = useState("");
  const [gender,         setGender]          = useState("");
  const [phone,          setPhone]           = useState("");
  const [email,          setEmail]           = useState("");
  const [address,        setAddress]         = useState("");
  const [nationality,    setNationality]     = useState("Ghanaian");
  const [occupation,     setOccupation]      = useState("");
  const [bloodGroup,     setBloodGroup]      = useState("");
  const [nokName,        setNokName]         = useState("");
  const [nokPhone,       setNokPhone]        = useState("");
  const [nokRelation,    setNokRelation]     = useState("");

  // ── ui state ──
  const [saving,         setSaving]          = useState(false);
  const [toast,          setToast]           = useState<ToastData | null>(null);
  const [errors,         setErrors]          = useState<Record<string, string>>({});

  // ── validation ──
  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim())  e.firstName = "First name is required";
    if (!lastName.trim())   e.lastName  = "Last name is required";
    if (!phone.trim())      e.phone     = "Phone number is required";
    if (!gender)            e.gender    = "Please select a gender";
    return e;
  }

  // ── save ──────────────────────────────────────────────────────────────────
  async function handleSave(andCreateVisit = false) {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const fullName  = `${firstName.trim()} ${lastName.trim()}`;
    const patientId = generatePatientId();
    const initials  = getInitials(firstName.trim(), lastName.trim());
    const nokFull   = nokName.trim()
      ? `${nokName.trim()}${nokRelation ? ` (${nokRelation})` : ""}`
      : "";

    const result = await insertPatientRegistration({
      patientName:    fullName,
      patientId,
      registeredAt:   new Date().toISOString(),
      contact:        phone.trim(),
      email:          email.trim(),
      initials,
      status:         "Waiting",
      registeredBy:   session?.full_name ?? "Front Desk",
      dateOfBirth:    buildDob(dobDay, dobMonth, dobYear) || undefined,
      gender:         gender || undefined,
      address:        address.trim() || undefined,
      nextOfKinName:  nokFull || undefined,
      nextOfKinPhone: nokPhone.trim() || undefined,
      bloodGroup:     bloodGroup || undefined,
      nationality:    nationality.trim() || "Ghanaian",
      occupation:     occupation.trim() || undefined,
    });

    setSaving(false);

    if (!result) {
      setToast({ message: "Failed to register patient. Please try again.", type: "error" });
      return;
    }

    if (andCreateVisit) {
      router.push(`/app/frontdesk/visits?newPatient=${result.id}`);
    } else {
      router.push(`/app/frontdesk/patients/${result.id}`);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/frontdesk/patients"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Register New Patient</h1>
          <p className="text-xs text-slate-500">Capture patient demographics and create a hospital record</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── Main form ── */}
        <div className="space-y-5">

          {/* Personal Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">1</span>
              Personal Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* First name */}
              <div>
                <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                <input
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: "" })); }}
                  placeholder="e.g. Kwame"
                  className={`${inputCls} ${errors.firstName ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
              </div>

              {/* Last name */}
              <div>
                <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
                <input
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: "" })); }}
                  placeholder="e.g. Mensah"
                  className={`${inputCls} ${errors.lastName ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
              </div>

              {/* Date of birth */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Date of Birth</label>
                <DobPicker
                  day={dobDay} month={dobMonth} year={dobYear}
                  onDay={setDobDay} onMonth={setDobMonth} onYear={setDobYear}
                />
              </div>

              {/* Gender */}
              <div>
                <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                <select
                  value={gender}
                  onChange={(e) => { setGender(e.target.value); setErrors((p) => ({ ...p, gender: "" })); }}
                  className={`${inputCls} ${errors.gender ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
                >
                  <option value="">— Select gender —</option>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
                {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender}</p>}
              </div>

              {/* Blood group */}
              <div>
                <label className={labelCls}>Blood Group</label>
                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={inputCls}>
                  <option value="">— Select blood group —</option>
                  {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>

              {/* Nationality */}
              <div>
                <label className={labelCls}>Nationality</label>
                <input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. Ghanaian"
                  className={inputCls}
                />
              </div>

              {/* Occupation */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Occupation</label>
                <input
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Teacher, Trader, Civil servant"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Contact Details */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">2</span>
              Contact Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }}
                  placeholder="e.g. 0244 000 000"
                  className={`${inputCls} ${errors.phone ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className={labelCls}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@email.com"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Home Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House number, street, area / city"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </section>

          {/* Next of Kin */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">3</span>
              Next of Kin
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Full Name</label>
                <input
                  value={nokName}
                  onChange={(e) => setNokName(e.target.value)}
                  placeholder="e.g. Mrs. Adaeze Mensah"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Relationship</label>
                <input
                  value={nokRelation}
                  onChange={(e) => setNokRelation(e.target.value)}
                  placeholder="e.g. Spouse, Parent"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="tel"
                  value={nokPhone}
                  onChange={(e) => setNokPhone(e.target.value)}
                  placeholder="e.g. 0244 111 222"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 transition hover:-translate-y-0.5 active:opacity-90 disabled:opacity-60"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
              Save Patient
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-white px-6 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/5 active:opacity-90 disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              Save & Create Visit
            </button>

            <Link
              href="/app/frontdesk/patients"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          {/* Preview card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Patient Preview</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-base font-bold text-[var(--accent)]">
                {firstName || lastName
                  ? getInitials(firstName || "?", lastName || "?")
                  : "?"}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {firstName || lastName
                    ? `${firstName} ${lastName}`.trim()
                    : <span className="text-slate-400 italic">Enter name above</span>}
                </p>
                {phone && <p className="text-xs text-slate-500">{phone}</p>}
                {gender && <p className="text-xs text-slate-400 capitalize">{gender}</p>}
              </div>
            </div>

            {(dobDay && dobMonth && dobYear) && (
              <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                DOB: {dobDay} {dobMonth} {dobYear}
                {bloodGroup && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700">{bloodGroup}</span>}
              </div>
            )}
          </div>

          {/* Registration flow */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Registration Flow</h3>
            <ol className="space-y-2.5 text-xs text-slate-600">
              {[
                "Fill in patient demographics",
                "Required: Name, Phone & Gender",
                "Click Save Patient → view patient record",
                "Or Save & Create Visit → start consultation",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[9px] font-bold text-[var(--accent)]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Required fields reminder */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <span className="font-bold">Required:</span> First Name, Last Name, Phone Number, and Gender must be filled before saving.
          </div>
        </aside>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
