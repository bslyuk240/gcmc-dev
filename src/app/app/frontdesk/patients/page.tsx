"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { fetchPatientRegistrations, type PatientRegistration } from "@/lib/supabase/db";

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

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  Waiting:          "bg-amber-50 text-amber-700",
  "In Consultation": "bg-sky-50 text-sky-700",
  Discharged:       "bg-emerald-50 text-emerald-700",
  Referred:         "bg-violet-50 text-violet-700",
  Billing:          "bg-orange-50 text-orange-700",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function FrontdeskPatientsPage() {
  const [patients,  setPatients]  = useState<PatientRegistration[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [genderF,   setGenderF]   = useState("All");
  const [statusF,   setStatusF]   = useState("All");

  useEffect(() => {
    fetchPatientRegistrations().then((data) => {
      setPatients(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.patientName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      (p.contact ?? "").includes(q);
    const matchGender = genderF === "All" || p.gender === genderF;
    const matchStatus = statusF === "All" || p.status === statusF;
    return matchSearch && matchGender && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Patient Records</h1>
          <p className="mt-1 text-sm text-slate-500">Register, search, and open patient master records.</p>
        </div>
        <Link
          href={`${INTERNAL_PREFIX}/frontdesk/patients/new`}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:opacity-95 transition"
        >
          + Register New Patient
        </Link>
      </div>

      {/* Search + filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID or phone…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>
          <select value={genderF} onChange={(e) => setGenderF(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none">
            <option value="All">All Genders</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none">
            <option value="All">All Status</option>
            <option>Waiting</option>
            <option>In Consultation</option>
            <option>Discharged</option>
            <option>Referred</option>
            <option>Billing</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">
            All Patients{" "}
            <span className="text-sm font-normal text-slate-400">
              ({loading ? "…" : filtered.length})
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm text-slate-400">No patients found.</p>
                  <Link href={`${INTERNAL_PREFIX}/frontdesk/patients/new`} className="mt-2 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
                    Register a new patient →
                  </Link>
                </div>
              ) : (
                filtered.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-bold text-[var(--accent)]">
                            {p.initials || p.patientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{p.patientName}</p>
                            <p className="truncate text-[11px] text-slate-400">{p.patientId || "No patient ID"}</p>
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <MobileMeta label="Phone" value={p.contact || "—"} />
                      <MobileMeta label="Age / Sex" value={`${calcAge(p.dateOfBirth)}${p.gender ? ` / ${p.gender}` : ""}`} />
                      <MobileMeta label="Blood Group" value={p.bloodGroup || "—"} />
                      <MobileMeta label="Registered" value={fmtDate(p.registeredAt)} />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Link
                        href={`${INTERNAL_PREFIX}/frontdesk/patients/${p.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                      >
                        Open Record
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Patient ID", "Name", "Phone", "Age / Sex", "Blood Grp", "Registered", "Status", ""].map((col) => (
                    <th key={col} className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{p.patientId || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-bold text-[var(--accent)]">
                          {p.initials || p.patientName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900">{p.patientName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.contact || "—"}</td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {calcAge(p.dateOfBirth)}{p.gender ? ` / ${p.gender}` : ""}
                    </td>
                    <td className="px-5 py-3">
                      {p.bloodGroup
                        ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-700">{p.bloodGroup}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{fmtDate(p.registeredAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`${INTERNAL_PREFIX}/frontdesk/patients/${p.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                      >
                        Open Record
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <p className="text-sm text-slate-400">No patients found.</p>
                      <Link href={`${INTERNAL_PREFIX}/frontdesk/patients/new`} className="mt-2 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
                        Register a new patient →
                      </Link>
                    </td>
                  </tr>
                )}
	              </tbody>
	            </table>
	          </div>
          </>
	        )}
	      </section>
    </div>
  );
}
