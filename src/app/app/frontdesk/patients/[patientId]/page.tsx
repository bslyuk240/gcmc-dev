"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchPatientById,
  fetchVisitsByPatientId,
  updatePatientRegistration,
  fetchPatientEnrollment,
  type PatientRegistration,
  type VisitRow,
} from "@/lib/supabase/db";
import type { HmoEnrollment } from "@/lib/data/nhis-store";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";

// ── helpers ──────────────────────────────────────────────────────────────────
function calcAge(dob?: string): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return `${age} yrs`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const VISIT_STATUS_STYLES: Record<string, string> = {
  Waiting:           "bg-amber-50 text-amber-700",
  "In Consultation": "bg-sky-50 text-sky-700",
  Discharged:        "bg-emerald-50 text-emerald-700",
  Referred:          "bg-violet-50 text-violet-700",
  Billing:           "bg-orange-50 text-orange-700",
  Scheduled:         "bg-blue-50 text-blue-700",
};

const PATIENT_STATUS_STYLES: Record<string, string> = {
  Waiting:           "bg-amber-100 text-amber-800",
  "In Consultation": "bg-sky-100 text-sky-800",
  Discharged:        "bg-emerald-100 text-emerald-800",
  Referred:          "bg-violet-100 text-violet-800",
  Billing:           "bg-orange-100 text-orange-800",
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none " +
  "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

// ── tabs ──────────────────────────────────────────────────────────────────────
type Tab = "Overview" | "Visits" | "Billing" | "Prescriptions";
const TABS: Tab[] = ["Overview", "Visits", "Billing", "Prescriptions"];

// ── page ──────────────────────────────────────────────────────────────────────
export default function PatientDetailPage() {
  const params  = useParams<{ patientId: string }>();
  const router  = useRouter();
  const id      = params?.patientId ?? "";

  const { frontDeskCharges, labCharges, nursingCharges } = useAccountsStore();
  const { prescriptions } = usePharmacyStore();

  const [patient,     setPatient]     = useState<PatientRegistration | null>(null);
  const [visits,      setVisits]      = useState<VisitRow[]>([]);
  const [enrollment,  setEnrollment]  = useState<HmoEnrollment | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,      setTab]      = useState<Tab>("Overview");
  const [toast,    setToast]    = useState<ToastData | null>(null);

  // Edit modal state
  const [editOpen,    setEditOpen]    = useState(false);
  const [editName,    setEditName]    = useState("");
  const [editPhone,   setEditPhone]   = useState("");
  const [editEmail,   setEditEmail]   = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNokName, setEditNokName] = useState("");
  const [editNokPhone,setEditNokPhone]= useState("");
  const [editOccup,   setEditOccup]   = useState("");
  const [editNation,  setEditNation]  = useState("");
  const [saving,      setSaving]      = useState(false);

  // Load patient first, then visits using the display patientId
  useEffect(() => {
    if (!id) return;
    fetchPatientById(id).then(async (pat) => {
      setPatient(pat);
      if (pat?.patientId) {
        const vis = await fetchVisitsByPatientId(pat.patientId);
        setVisits(vis);
      }
      // load HMO enrollment if patient has one
      const enroll = await fetchPatientEnrollment(id).catch(() => null);
      setEnrollment(enroll);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  function openEdit() {
    if (!patient) return;
    setEditName(patient.patientName);
    setEditPhone(patient.contact ?? "");
    setEditEmail(patient.email ?? "");
    setEditAddress(patient.address ?? "");
    setEditNokName(patient.nextOfKinName ?? "");
    setEditNokPhone(patient.nextOfKinPhone ?? "");
    setEditOccup(patient.occupation ?? "");
    setEditNation(patient.nationality ?? "Ghanaian");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!patient) return;
    setSaving(true);
    const ok = await updatePatientRegistration(patient.id, {
      patientName:    editName,
      contact:        editPhone,
      email:          editEmail,
      address:        editAddress,
      nextOfKinName:  editNokName,
      nextOfKinPhone: editNokPhone,
      occupation:     editOccup,
      nationality:    editNation,
    });
    setSaving(false);
    if (ok) {
      setPatient((prev) => prev ? {
        ...prev,
        patientName: editName, contact: editPhone, email: editEmail,
        address: editAddress, nextOfKinName: editNokName, nextOfKinPhone: editNokPhone,
        occupation: editOccup, nationality: editNation,
      } : null);
      setToast({ message: "Patient record updated.", type: "success" });
      setEditOpen(false);
    } else {
      setToast({ message: "Update failed. Please try again.", type: "error" });
    }
  }

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
      </div>
    );
  }

  // ── not found ──────────────────────────────────────────────────────────────
  if (!patient) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-bold text-slate-700">Patient not found</p>
        <p className="mt-1 text-sm text-slate-400">This record may have been removed or the link is incorrect.</p>
        <Link href="/app/frontdesk/patients" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
          ← Back to patients
        </Link>
      </div>
    );
  }

  const initials  = patient.initials || patient.patientName.slice(0, 2).toUpperCase();
  const age       = calcAge(patient.dateOfBirth);
  const lastVisit = visits[0] ? fmtDate(visits[0].visitDate) : "No visits yet";

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-24">

      {/* Back */}
      <Link href="/app/frontdesk/patients" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        All Patients
      </Link>

      {/* Patient header card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xl font-bold text-[var(--accent)] sm:h-20 sm:w-20 sm:text-2xl">
            {initials}
          </div>

          {/* Name + meta */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                {patient.patientName}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${PATIENT_STATUS_STYLES[patient.status] ?? "bg-slate-100 text-slate-600"}`}>
                {patient.status}
              </span>
              {enrollment?.isActive && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  HMO · {enrollment.schemeName}
                </span>
              )}
            </div>

            {enrollment?.isActive && (
              <div className="flex flex-wrap gap-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs">
                <div>
                  <span className="font-bold uppercase tracking-wider text-blue-400">Scheme</span>
                  <p className="mt-0.5 font-semibold text-blue-900">{enrollment.schemeName}</p>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-blue-400">Member ID</span>
                  <p className="mt-0.5 font-semibold text-blue-900">{enrollment.memberId}</p>
                </div>
                {enrollment.planName && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-blue-400">Plan</span>
                    <p className="mt-0.5 font-semibold text-blue-900">{enrollment.planName}</p>
                  </div>
                )}
                <div>
                  <span className="font-bold uppercase tracking-wider text-blue-400">Copay</span>
                  <p className="mt-0.5 font-semibold text-blue-900">{enrollment.copayPercentage}%</p>
                </div>
                {enrollment.validUntil && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-blue-400">Expires</span>
                    <p className="mt-0.5 font-semibold text-blue-900">{new Date(enrollment.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
              {[
                { label: "Patient ID",  value: patient.patientId || "—" },
                { label: "Age / Sex",   value: `${age}${patient.gender ? ` / ${patient.gender}` : ""}` },
                { label: "Phone",       value: patient.contact || "—" },
                { label: "Last Visit",  value: lastVisit },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="font-bold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <button
              onClick={openEdit}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
            >
              Edit Demographics
            </button>
            <Link
              href={`${INTERNAL_PREFIX}/frontdesk/visits?patient=${patient.patientId}`}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 transition hover:opacity-90"
            >
              + Create Visit
            </Link>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t
                ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[var(--accent)]/30"
            }`}
          >
            {t}
            {t === "Visits" && visits.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === "Visits" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {visits.length}
              </span>
            )}
            {t === "Billing" && (() => {
              const pid = patient?.patientId ?? "";
              const cnt = frontDeskCharges.filter((c) => c.patientId === pid).length
                + labCharges.filter((c) => c.patientId === pid).length
                + nursingCharges.filter((c) => c.patientId === pid).length;
              return cnt > 0 ? (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === "Billing" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {cnt}
                </span>
              ) : null;
            })()}
            {t === "Prescriptions" && (() => {
              const cnt = prescriptions.filter((p) => p.patientId === patient?.patientId).length;
              return cnt > 0 ? (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === "Prescriptions" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {cnt}
                </span>
              ) : null;
            })()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>

          {/* ── OVERVIEW ── */}
          {tab === "Overview" && (
            <div className="space-y-5">
              {/* Demographics */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-slate-900">Demographics</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  {[
                    { label: "Full Name",    value: patient.patientName },
                    { label: "Date of Birth",value: fmtDate(patient.dateOfBirth) },
                    { label: "Gender",       value: patient.gender || "—" },
                    { label: "Blood Group",  value: patient.bloodGroup || "—" },
                    { label: "Nationality",  value: patient.nationality || "—" },
                    { label: "Occupation",   value: patient.occupation || "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Contact */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-slate-900">Contact Details</h3>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {[
                    { label: "Phone",    value: patient.contact || "—" },
                    { label: "Email",    value: patient.email || "—" },
                    { label: "Address",  value: patient.address || "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Next of Kin */}
              {(patient.nextOfKinName || patient.nextOfKinPhone) && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold text-slate-900">Next of Kin</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">{patient.nextOfKinName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">{patient.nextOfKinPhone || "—"}</dd>
                    </div>
                  </dl>
                </section>
              )}

              {/* Recent visits preview */}
              {visits.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Recent Visits</h3>
                    <button onClick={() => setTab("Visits")} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                      View all →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {visits.slice(0, 3).map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{v.visitType || "Visit"}</p>
                          <p className="text-xs text-slate-400">{fmtDate(v.visitDate)} {fmtTime(v.checkedInAt)}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${VISIT_STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── VISITS ── */}
          {tab === "Visits" && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900">Visit History</h3>
                <Link
                  href={`${INTERNAL_PREFIX}/frontdesk/visits?patient=${patient.patientId}`}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                >
                  + New Visit
                </Link>
              </div>
              {visits.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">
                  No visits recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Date", "Type", "Doctor", "Check-in", "Status"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visits.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 whitespace-nowrap text-slate-700">{fmtDate(v.visitDate)}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{v.visitType || "General"}</td>
                          <td className="px-5 py-3 text-slate-500">{v.assignedTo || "—"}</td>
                          <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{fmtTime(v.checkedInAt) || "—"}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${VISIT_STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ── BILLING ── */}
          {tab === "Billing" && (() => {
            const pid = patient.patientId;
            const fdCharges = frontDeskCharges.filter((c) => c.patientId === pid);
            const lbCharges = labCharges.filter((c) => c.patientId === pid);
            const nrCharges = nursingCharges.filter((c) => c.patientId === pid);
            const allCharges: { id: string; type: string; desc: string; amount: number; date: string; status: string }[] = [
              ...fdCharges.map((c) => ({ id: c.id, type: c.chargeType, desc: c.description, amount: c.amount, date: c.createdAt, status: c.status })),
              ...lbCharges.map((c) => ({ id: c.id, type: "Lab", desc: c.testName, amount: c.amount, date: c.completedAt, status: c.status })),
              ...nrCharges.map((c) => ({ id: c.id, type: "Nursing", desc: c.procedureType, amount: c.amount, date: c.performedAt, status: c.status })),
            ];
            const BSTYLES: Record<string, string> = {
              Pending: "bg-amber-50 text-amber-700", Billed: "bg-sky-50 text-sky-700",
              Paid: "bg-emerald-50 text-emerald-700", Waived: "bg-slate-100 text-slate-500", Partial: "bg-violet-50 text-violet-700",
            };
            return (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h3 className="font-bold text-slate-900">Billing Records</h3>
                  <span className="text-xs text-slate-400">All charges from all departments</span>
                </div>
                {allCharges.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-400">No billing records for this patient yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Type", "Description", "Amount", "Date", "Status"].map((h) => (
                            <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allCharges.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-medium text-slate-900">{c.type}</td>
                            <td className="px-5 py-3 text-slate-600 text-xs">{c.desc || "—"}</td>
                            <td className="px-5 py-3 font-bold text-slate-900">₦{c.amount.toFixed(2)}</td>
                            <td className="px-5 py-3 text-xs text-slate-400">{c.date || "—"}</td>
                            <td className="px-5 py-3">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BSTYLES[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Total: <strong className="text-slate-900">₦{allCharges.reduce((s, c) => s + c.amount, 0).toFixed(2)}</strong></span>
                  <span>Paid: <strong className="text-emerald-700">₦{allCharges.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0).toFixed(2)}</strong></span>
                  <span>Pending: <strong className="text-amber-700">₦{allCharges.filter((c) => c.status === "Pending" || c.status === "Billed").reduce((s, c) => s + c.amount, 0).toFixed(2)}</strong></span>
                </div>
              </section>
            );
          })()}

          {/* ── PRESCRIPTIONS ── */}
          {tab === "Prescriptions" && (() => {
            const patRx = prescriptions.filter((p) => p.patientId === patient.patientId);
            const RX_STYLES: Record<string, string> = {
              Pending: "bg-amber-50 text-amber-700", Processing: "bg-sky-50 text-sky-700",
              Dispensed: "bg-emerald-50 text-emerald-700", Cancelled: "bg-slate-100 text-slate-500",
            };
            return (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h3 className="font-bold text-slate-900">Prescription History</h3>
                  <span className="text-xs text-slate-400">{patRx.length} prescription{patRx.length !== 1 ? "s" : ""}</span>
                </div>
                {patRx.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-400">No prescriptions recorded for this patient yet.</div>
                ) : (
                  <div className="space-y-3 p-5">
                    {patRx.map((rx) => (
                      <div key={rx.id} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900">Dr. {rx.doctorName}</p>
                            <p className="text-xs text-slate-400">{rx.createdAt ? new Date(rx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RX_STYLES[rx.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {rx.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {rx.drugs.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                              <span className="font-medium">{d.name}</span>
                              <span className="text-slate-400">— {d.dosage} · {d.frequency} · {d.duration}</span>
                            </div>
                          ))}
                        </div>
                        {rx.dispensedAt && (
                          <p className="mt-2 text-xs text-emerald-600">Dispensed by {rx.dispensedBy ?? "Pharmacy"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })()}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="space-y-4">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { label: "Register New Visit", href: `${INTERNAL_PREFIX}/frontdesk/visits?patient=${patient.patientId}` },
                { label: "Front Desk Billing", href: `${INTERNAL_PREFIX}/frontdesk/billing` },
                { label: "Search All Patients", href: `${INTERNAL_PREFIX}/frontdesk/patients` },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[var(--accent)]"
                >
                  {label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
              <button
                onClick={openEdit}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[var(--accent)]"
              >
                Edit Demographics
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Registration info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-xs text-slate-500">
            <h3 className="mb-2 font-bold uppercase tracking-wider text-slate-400">Registration</h3>
            <p>Registered: <span className="font-semibold text-slate-700">{fmtDate(patient.registeredAt)}</span></p>
            {patient.registeredBy && <p className="mt-1">By: <span className="font-semibold text-slate-700">{patient.registeredBy}</span></p>}
            <p className="mt-1">ID: <span className="font-mono font-semibold text-slate-700">{patient.patientId}</span></p>
          </div>
        </aside>
      </div>

      {/* Edit Demographics Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Demographics" className="max-w-xl">
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
              <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nationality</label>
              <input value={editNation} onChange={(e) => setEditNation(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Occupation</label>
              <input value={editOccup} onChange={(e) => setEditOccup(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next of Kin</label>
              <input value={editNokName} onChange={(e) => setEditNokName(e.target.value)} placeholder="Name" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">NOK Phone</label>
              <input value={editNokPhone} onChange={(e) => setEditNokPhone(e.target.value)} placeholder="Phone" className={inputCls} />
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button size="md" disabled={saving} onClick={handleSaveEdit}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
