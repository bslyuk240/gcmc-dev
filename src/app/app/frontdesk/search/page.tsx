"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import {
  fetchPatientRegistrations,
  fetchAllVisits,
  fetchStaffMembers,
  type PatientRegistration,
  type VisitRow,
} from "@/lib/supabase/db";
import type { StaffMember } from "@/lib/data/hr-store";

type Tab = "patient" | "visit" | "staff";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function calcAge(dob?: string) {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return `${age} yrs`;
}

const STATUS_STYLES: Record<string, string> = {
  Waiting: "bg-amber-50 text-amber-700",
  "In Consultation": "bg-sky-50 text-sky-700",
  "Checked In": "bg-sky-50 text-sky-700",
  Discharged: "bg-emerald-50 text-emerald-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Referred: "bg-violet-50 text-violet-700",
  Billing: "bg-orange-50 text-orange-700",
  Active: "bg-emerald-50 text-emerald-700",
  Terminated: "bg-slate-100 text-slate-500",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

function EmptyState({ type, query }: { type: string; query: string }) {
  return (
    <Card className="py-14 text-center">
      <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="1.5" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <p className="mt-3 font-medium text-slate-500">No {type} matched &quot;{query}&quot;</p>
      <p className="mt-1 text-sm text-slate-400">Try a different name, ID, or phone number.</p>
    </Card>
  );
}

export default function FrontDeskSearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("patient");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [patients, setPatients] = useState<PatientRegistration[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const q = query.toLowerCase().trim();

    const [allPatients, allVisits, allStaff] = await Promise.all([
      fetchPatientRegistrations(),
      fetchAllVisits(),
      fetchStaffMembers(),
    ]);

    setPatients(allPatients.filter((p) =>
      p.patientName.toLowerCase().includes(q) ||
      (p.patientId ?? "").toLowerCase().includes(q) ||
      (p.contact ?? "").includes(q) ||
      (p.email ?? "").toLowerCase().includes(q),
    ));

    setVisits(allVisits.filter((v) =>
      v.patientName.toLowerCase().includes(q) ||
      (v.patientId ?? "").toLowerCase().includes(q) ||
      (v.visitType ?? "").toLowerCase().includes(q),
    ));

    setStaff(allStaff.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q),
    ));

    setHasSearched(true);
    setSearching(false);
  }

  const resultCount = tab === "patient" ? patients.length : tab === "visit" ? visits.length : staff.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Search" description="Find patients, visits, and staff records across the HMS." />

      <Card className="p-4 sm:p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Search query</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
              <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, ID, phone, email…"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Search in</label>
            <div className="flex gap-0.5 rounded-xl border border-slate-200 p-0.5">
              {(["patient", "visit", "staff"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${tab === t ? "bg-[var(--accent)] text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {t === "patient" ? "Patients" : t === "visit" ? "Visits" : "Staff"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {searching
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>}
            Search
          </button>
        </form>
      </Card>

      {!hasSearched && (
        <Card className="py-20 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="1.5" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <p className="mt-4 font-medium text-slate-500">Enter a search term above</p>
          <p className="mt-1 text-sm text-slate-400">Search patients by name, ID or phone • visits by type • staff by name or department.</p>
        </Card>
      )}

      {hasSearched && (
        <div>
          <p className="mb-4 text-sm text-slate-500">
            {resultCount === 0 ? `No ${tab}s matched "${query}".` : `${resultCount} result${resultCount !== 1 ? "s" : ""} found.`}
          </p>

          {tab === "patient" && (
            patients.length > 0 ? (
              <Card className="overflow-hidden p-0">
                <div className="space-y-3 p-3 md:hidden">
                  {patients.map((p) => (
                    <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{p.patientName}</p>
                          <p className="truncate text-[11px] text-slate-400">{p.patientId || "No patient ID"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <MobileMeta label="Patient ID" value={p.patientId || "—"} />
                        <MobileMeta label="Age / Sex" value={`${calcAge(p.dateOfBirth)}${p.gender ? ` / ${p.gender}` : ""}`} />
                        <MobileMeta label="Phone" value={p.contact || "—"} />
                        <MobileMeta label="Blood Group" value={p.bloodGroup || "—"} />
                        <MobileMeta label="Registered" value={fmtDate(p.registeredAt)} />
                      </div>
                      <div className="mt-4">
                        <Link href={`${INTERNAL_PREFIX}/frontdesk/patients/${p.id}`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                          Open →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Patient ID", "Name", "Age/Sex", "Phone", "Blood Grp", "Registered", "Status", ""].map((h) => (
                          <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{p.patientId || "—"}</td>
                          <td className="px-5 py-3 font-semibold text-slate-900">{p.patientName}</td>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-600">{calcAge(p.dateOfBirth)}{p.gender ? ` / ${p.gender}` : ""}</td>
                          <td className="px-5 py-3 text-slate-600">{p.contact || "—"}</td>
                          <td className="px-5 py-3">
                            {p.bloodGroup
                              ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-700">{p.bloodGroup}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmtDate(p.registeredAt)}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <Link href={`${INTERNAL_PREFIX}/frontdesk/patients/${p.id}`} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                              Open →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : <EmptyState type="patients" query={query} />
          )}

          {tab === "visit" && (
            visits.length > 0 ? (
              <Card className="overflow-hidden p-0">
                <div className="space-y-3 p-3 md:hidden">
                  {visits.map((v) => (
                    <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{v.patientName}</p>
                          <p className="truncate text-[11px] text-slate-400">{v.patientId || "No patient ID"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {v.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <MobileMeta label="Visit Type" value={v.visitType || "—"} />
                        <MobileMeta label="Assigned To" value={v.assignedTo || "—"} />
                        <MobileMeta label="Date" value={fmtDate(v.visitDate)} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Patient", "Patient ID", "Visit Type", "Assigned To", "Date", "Status"].map((h) => (
                          <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visits.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-semibold text-slate-900">{v.patientName}</td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{v.patientId}</td>
                          <td className="px-5 py-3 text-slate-600">{v.visitType || "—"}</td>
                          <td className="px-5 py-3 text-slate-600">{v.assignedTo || "—"}</td>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmtDate(v.visitDate)}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : <EmptyState type="visits" query={query} />
          )}

          {tab === "staff" && (
            staff.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((s) => (
                  <Card key={s.id} className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-sm font-bold text-[var(--accent)]">
                      {s.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{s.name}</p>
                      <p className="text-sm text-slate-500">{s.role}</p>
                      <p className="text-xs text-slate-400">{s.department}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {s.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : <EmptyState type="staff" query={query} />
          )}
        </div>
      )}
    </div>
  );
}
