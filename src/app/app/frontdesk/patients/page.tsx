"use client";

import { useState } from "react";
import Link from "next/link";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";

type PatientStatus = "Active" | "New" | "Inactive";

type Patient = { id: string; name: string; phone: string; age: string; sex: "Male" | "Female"; lastVisit: string; status: PatientStatus; type: "Returning" | "New" };

const INITIAL: Patient[] = [];

const STATUS_STYLES: Record<PatientStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  New: "bg-sky-50 text-sky-700",
  Inactive: "bg-slate-100 text-slate-500",
};

export default function FrontdeskPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>(INITIAL);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Returning" | "New">("All");
  const [genderFilter, setGenderFilter] = useState<"All" | "Male" | "Female">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | PatientStatus>("All");
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.phone.includes(q);
    const matchType = typeFilter === "All" || p.type === typeFilter;
    const matchGender = genderFilter === "All" || p.sex === genderFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchType && matchGender && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Patients Management</h1>
          <p className="mt-1 text-sm text-slate-500">Register, search, review, and open patient master records.</p>
        </div>
        <Link
          href={`${INTERNAL_PREFIX}/frontdesk/patients/new`}
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:opacity-95"
        >
          + Register New Patient
        </Link>
      </div>

      {/* Search + filter bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px] flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID or phone number…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>
          {/* Type filter */}
          {(["All", "Returning", "New"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${typeFilter === t ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent-foreground)]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
              {t === "All" ? "All Patients" : `Type: ${t}`}
            </button>
          ))}
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value as "All" | "Male" | "Female")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 outline-none focus:border-[var(--accent)]">
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | PatientStatus)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 outline-none focus:border-[var(--accent)]">
            <option value="All">All Status</option>
            <option>Active</option>
            <option>New</option>
            <option>Inactive</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">Patient Records <span className="text-sm font-normal text-slate-400">({filtered.length})</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                {["Patient ID", "Patient Name", "Phone", "Age / Sex", "Last Visit", "Status", "Actions"].map((col) => (
                  <th key={col} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{`#${patient.id}`}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{patient.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{patient.phone}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{patient.age} / {patient.sex}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{patient.lastVisit}</td>
                  <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[patient.status]}`}>{patient.status}</span></td>
                  <td className="px-6 py-4">
                    <Button size="sm" variant="outline" onClick={() => setViewPatient(patient)}>Open Record</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No patients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Patient detail modal */}
      {viewPatient && (
        <Modal open={true} onClose={() => setViewPatient(null)} title={viewPatient.name}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[viewPatient.status]}`}>{viewPatient.status}</span>
              <span className="text-xs text-slate-400">{viewPatient.type} patient</span>
            </div>
            {[["Patient ID", `#${viewPatient.id}`], ["Phone", viewPatient.phone], ["Age", viewPatient.age], ["Sex", viewPatient.sex], ["Last Visit", viewPatient.lastVisit]].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-900">{val}</span>
              </div>
            ))}
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setViewPatient(null)}>Close</Button>
            <Button
              size="md"
              href={`${INTERNAL_PREFIX}/frontdesk/visits`}
              onClick={() => {
                setToast({ message: `Creating visit for ${viewPatient.name}…`, type: "info" });
                setViewPatient(null);
              }}
            >
              Create Visit
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
