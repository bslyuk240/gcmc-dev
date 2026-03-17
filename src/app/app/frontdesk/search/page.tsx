"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

type ResultType = "patient" | "visit" | "staff";

const PATIENT_RESULTS = [
  { id: "P-10491", name: "Kwame Asante", dob: "1988-04-12", phone: "+233 24 111 2233", address: "Accra, Accra Region", lastVisit: "Mar 12, 2026", status: "Outpatient" },
  { id: "P-10382", name: "Ama Owusu", dob: "1995-09-03", phone: "+233 24 222 3344", address: "Kumasi, Ashanti Region", lastVisit: "Mar 10, 2026", status: "Discharged" },
  { id: "P-10271", name: "Kofi Mensah", dob: "1972-01-25", phone: "+233 24 333 4455", address: "Tamale, Northern Region", lastVisit: "Feb 28, 2026", status: "Admitted" },
  { id: "P-10155", name: "Efua Boateng", dob: "2001-07-17", phone: "+233 24 444 5566", address: "Cape Coast, Central Region", lastVisit: "Feb 20, 2026", status: "Outpatient" },
];

const VISIT_RESULTS = [
  { id: "V-5821", patient: "Kwame Asante", patientId: "P-10491", dept: "Doctors", purpose: "Routine check-up", date: "Mar 12, 2026", status: "Completed" },
  { id: "V-5820", patient: "Ama Owusu", patientId: "P-10382", dept: "Pharmacy", purpose: "Prescription collection", date: "Mar 10, 2026", status: "Completed" },
  { id: "V-5818", patient: "Kofi Mensah", patientId: "P-10271", dept: "Emergency", purpose: "Chest pain evaluation", date: "Feb 28, 2026", status: "Admitted" },
  { id: "V-5801", patient: "Efua Boateng", patientId: "P-10155", dept: "Nurses", purpose: "Blood pressure monitoring", date: "Feb 20, 2026", status: "Completed" },
];

const STAFF_RESULTS = [
  { id: "S-0842", name: "Dr. Amaka Osei", role: "Senior Doctor", dept: "Doctors", phone: "+233 24 100 2001", status: "On Shift" },
  { id: "S-0751", name: "Nurse Patricia", role: "Registered Nurse", dept: "Nurses", phone: "+233 24 100 2002", status: "On Shift" },
  { id: "S-0610", name: "James Adu", role: "Pharmacist", dept: "Pharmacy", phone: "+233 24 100 2003", status: "Off Duty" },
];

const STATUS_STYLES: Record<string, string> = {
  Outpatient: "bg-sky-50 text-sky-700",
  Admitted: "bg-amber-50 text-amber-700",
  Discharged: "bg-slate-100 text-slate-600",
  Completed: "bg-emerald-50 text-emerald-700",
  "On Shift": "bg-emerald-50 text-emerald-700",
  "Off Duty": "bg-slate-100 text-slate-600",
};

export default function FrontDeskSearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResultType>("patient");
  const [hasSearched, setHasSearched] = useState(false);

  const q = query.toLowerCase();

  const filteredPatients = PATIENT_RESULTS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.phone.includes(q),
  );
  const filteredVisits = VISIT_RESULTS.filter(
    (v) => v.patient.toLowerCase().includes(q) || v.id.toLowerCase().includes(q) || v.patientId.toLowerCase().includes(q),
  );
  const filteredStaff = STAFF_RESULTS.filter(
    (s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.dept.toLowerCase().includes(q),
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setHasSearched(true);
  }

  const resultCount = type === "patient" ? filteredPatients.length : type === "visit" ? filteredVisits.length : filteredStaff.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Search"
        description="Find patients, visits, and staff records quickly."
      />

      {/* Search bar */}
      <Card className="p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Search query</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
              <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, ID, phone number..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Search in</label>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {(["patient", "visit", "staff"] as ResultType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${type === t ? "bg-[var(--accent)] text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {t === "patient" ? "Patients" : t === "visit" ? "Visits" : "Staff"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Search
          </button>
        </form>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div>
          <p className="mb-4 text-sm text-slate-500">
            {resultCount === 0 ? "No results found." : `${resultCount} result${resultCount !== 1 ? "s" : ""} found.`}
          </p>

          {/* Patient Results */}
          {type === "patient" && filteredPatients.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["Patient ID", "Name", "DOB", "Phone", "Address", "Last Visit", "Status", ""].map((h) => (
                        <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.id}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900">{p.name}</td>
                        <td className="px-5 py-3 text-slate-600">{p.dob}</td>
                        <td className="px-5 py-3 text-slate-600">{p.phone}</td>
                        <td className="px-5 py-3 text-slate-600">{p.address}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">{p.lastVisit}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`${INTERNAL_PREFIX}/frontdesk/patients/${p.id}`} className="text-xs font-medium text-[var(--accent)] hover:underline">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Visit Results */}
          {type === "visit" && filteredVisits.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["Visit ID", "Patient", "Patient ID", "Department", "Purpose", "Date", "Status"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{v.id}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900">{v.patient}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{v.patientId}</td>
                        <td className="px-5 py-3 text-slate-600">{v.dept}</td>
                        <td className="px-5 py-3 text-slate-600">{v.purpose}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">{v.date}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>{v.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Staff Results */}
          {type === "staff" && filteredStaff.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((s) => (
                <Card key={s.id} className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                    {s.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                    <p className="text-sm text-slate-500">{s.role} · {s.dept}</p>
                    <p className="mt-1 text-xs text-slate-400">{s.phone}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[s.status] ?? "bg-slate-100 text-slate-600"}`}>{s.status}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {resultCount === 0 && (
            <Card className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <p className="mt-3 font-medium text-slate-500">No {type}s matched &quot;{query}&quot;</p>
              <p className="mt-1 text-sm text-slate-400">Try a different name, ID, or phone number.</p>
            </Card>
          )}
        </div>
      )}

      {!hasSearched && (
        <Card className="py-20 text-center">
          <svg className="mx-auto h-14 w-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <p className="mt-4 text-base font-medium text-slate-500">Enter a search term above</p>
          <p className="mt-1 text-sm text-slate-400">Search by patient name, ID, phone, or visit reference.</p>
        </Card>
      )}
    </div>
  );
}
