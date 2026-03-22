"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { getDepartmentFromPath, INTERNAL_PREFIX } from "@/lib/constants/navigation";
import {
  getFrontDeskCharges,
  getConsultationFees,
  getSupplierPayments,
  getPayrollBatches,
  getKioskSales,
  getLabCharges,
  getNursingCharges,
} from "@/lib/data/accounts-store";
import { getPrescriptions, getPharmacyBills } from "@/lib/data/pharmacy-store";
import { getLabTests } from "@/lib/data/lab-store";
import { getWardPatients } from "@/lib/data/nurses-store";

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: string;
};

export function searchForDept(dept: string, query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];

  if (dept === "dashboard") {
    return [
      ...searchForDept("accounts", query),
      ...searchForDept("pharmacy", query),
      ...searchForDept("lab", query),
      ...searchForDept("nurses", query),
      ...searchForDept("frontdesk", query),
    ].slice(0, 8);
  }

  const results: SearchResult[] = [];

  if (dept === "accounts") {
    const frontDesk = getFrontDeskCharges();
    frontDesk
      .filter((c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.patientId.toLowerCase().includes(q) ||
        c.chargeType.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) =>
        results.push({
          id: c.id,
          title: `FD ${c.id} — ${c.patientName}`,
          subtitle: `${c.chargeType} · ₦${c.amount.toLocaleString()} · ${c.status}`,
          href: `${INTERNAL_PREFIX}/accounts/receive-payment`,
          type: "Charge",
        }),
      );

    const consultations = getConsultationFees();
    consultations
      .filter((c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.patientId.toLowerCase().includes(q) ||
        c.doctorName.toLowerCase().includes(q) ||
        c.consultationType.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) =>
        results.push({
          id: c.id,
          title: `CONS ${c.id} — ${c.patientName}`,
          subtitle: `${c.doctorName} · ₦${c.fee.toLocaleString()} · ${c.status}`,
          href: `${INTERNAL_PREFIX}/accounts/consultation-fees`,
          type: "Consultation",
        }),
      );

    const labCharges = getLabCharges();
    labCharges
      .filter((c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.patientId.toLowerCase().includes(q) ||
        c.testName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) =>
        results.push({
          id: c.id,
          title: `LAB ${c.id} — ${c.patientName}`,
          subtitle: `${c.testName} · ₦${c.amount.toLocaleString()} · ${c.status}`,
          href: `${INTERNAL_PREFIX}/accounts/lab-billing`,
          type: "Lab Charge",
        }),
      );

    const nursingCharges = getNursingCharges();
    nursingCharges
      .filter((c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.patientId.toLowerCase().includes(q) ||
        c.procedureType.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) =>
        results.push({
          id: c.id,
          title: `NURS ${c.id} — ${c.patientName}`,
          subtitle: `${c.procedureType} · ₦${c.amount.toLocaleString()} · ${c.status}`,
          href: `${INTERNAL_PREFIX}/accounts/nursing-billing`,
          type: "Nursing Charge",
        }),
      );

    const supplierPayments = getSupplierPayments();
    supplierPayments
      .filter((p) =>
        p.supplier.toLowerCase().includes(q) ||
        p.poId.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((p) =>
        results.push({
          id: p.id,
          title: `PO ${p.poId} — ${p.supplier}`,
          subtitle: `${p.description} · ₦${p.amount.toLocaleString()} · ${p.status}`,
          href: `${INTERNAL_PREFIX}/accounts/supplier-payments`,
          type: "Supplier Payment",
        }),
      );

    const payrollBatches = getPayrollBatches();
    payrollBatches
      .filter((b) =>
        b.period.toLowerCase().includes(q) ||
        b.preparedBy.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((b) =>
        results.push({
          id: b.id,
          title: `Payroll ${b.period}`,
          subtitle: `${b.totalStaff} staff · ₦${b.totalAmount.toLocaleString()} · ${b.status}`,
          href: `${INTERNAL_PREFIX}/accounts/payroll`,
          type: "Payroll",
        }),
      );

    const kioskSales = getKioskSales();
    kioskSales
      .filter((k) =>
        k.date.toLowerCase().includes(q) ||
        k.reportedBy.toLowerCase().includes(q) ||
        k.id.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((k) =>
        results.push({
          id: k.id,
          title: `Kiosk ${k.date}`,
          subtitle: `${k.reportedBy} · ₦${k.totalRevenue.toLocaleString()} · ${k.status}`,
          href: `${INTERNAL_PREFIX}/accounts/kiosk`,
          type: "Kiosk",
        }),
      );
  }

  if (dept === "pharmacy" || dept === "doctors") {
    const rxs = getPrescriptions();
    rxs
      .filter((r) => r.patientName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.doctorName.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((r) =>
        results.push({
          id: r.id,
          title: `Rx ${r.id} — ${r.patientName}`,
          subtitle: `${r.doctorName} · ${r.status}`,
          href: dept === "pharmacy" ? `${INTERNAL_PREFIX}/pharmacy/pending-prescriptions` : `${INTERNAL_PREFIX}/doctors/prescriptions`,
          type: "Prescription",
        }),
      );
  }

  if (dept === "pharmacy") {
    const bills = getPharmacyBills();
    bills
      .filter((b) => b.patientName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((b) =>
        results.push({
          id: b.id,
          title: `Bill ${b.id} — ${b.patientName}`,
          subtitle: `₦${b.totalCost.toFixed(0)} · ${b.billStatus}`,
          href: `${INTERNAL_PREFIX}/pharmacy/stock-movements`,
          type: "Bill",
        }),
      );
  }

  if (dept === "lab" || dept === "doctors" || dept === "nurses") {
    const tests = getLabTests();
    tests
      .filter((t) => t.patientName.toLowerCase().includes(q) || t.testName.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((t) =>
        results.push({
          id: t.id,
          title: `${t.testName} — ${t.patientName}`,
          subtitle: `${t.id} · ${t.priority} · ${t.status}`,
          href:
            dept === "lab"
              ? `${INTERNAL_PREFIX}/lab/test-requests`
              : dept === "doctors"
              ? `${INTERNAL_PREFIX}/doctors/lab-orders`
              : `${INTERNAL_PREFIX}/nurses/sample-collection`,
          type: "Lab Test",
        }),
      );
  }

  if (dept === "nurses" || dept === "doctors") {
    const patients = getWardPatients();
    patients
      .filter((p) => p.patientName.toLowerCase().includes(q) || p.patientId.toLowerCase().includes(q) || p.diagnosis.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((p) =>
        results.push({
          id: p.id,
          title: `${p.patientName} — ${p.unit}`,
          subtitle: `${p.patientId} · Bed ${p.bed} · ${p.diagnosis.slice(0, 40)}`,
          href:
            dept === "nurses"
              ? `${INTERNAL_PREFIX}/nurses/ward`
              : `${INTERNAL_PREFIX}/doctors/admitted-patients`,
          type: "Patient",
        }),
      );
  }

  return results.slice(0, 8);
}

const TYPE_COLOR: Record<string, string> = {
  Prescription: "bg-violet-100 text-violet-700",
  Bill: "bg-emerald-100 text-emerald-700",
  "Lab Test": "bg-sky-100 text-sky-700",
  Patient: "bg-amber-100 text-amber-700",
};

export function DeptSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const dept = getDepartmentFromPath(pathname) ?? "";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    const found = searchForDept(dept, q);
    setResults(found);
    setOpen(found.length > 0);
  }, [dept]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    router.push(result.href);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  const deptLabel: Record<string, string> = {
    pharmacy: "prescriptions, inventory, bills",
    lab: "tests, results, patients",
    doctors: "prescriptions, lab orders, patients",
    nurses: "patients, lab tests",
    accounts: "invoices, payments",
    frontdesk: "patients, visits",
    admin: "reports, staff",
    hr: "staff, leaves",
  };

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-xs sm:block lg:max-w-sm">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        aria-label="Search"
        className="w-full rounded-lg border border-transparent bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-(--accent)/20 focus:ring-2 focus:ring-(--accent)/15"
        placeholder={`Search ${deptLabel[dept] ?? "within department"}…`}
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setQuery(""); setResults([]); }
          if (e.key === "Enter" && results.length > 0) handleSelect(results[0]);
        }}
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Clear"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Search results
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                  onClick={() => handleSelect(r)}
                >
                  <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", TYPE_COLOR[r.type] ?? "bg-slate-100 text-slate-600")}>
                    {r.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 truncate">{r.subtitle}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
            Press Enter to navigate to first result · Esc to close
          </div>
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl px-4 py-6 text-center">
          <p className="text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-xs text-slate-300">Try a patient name, ID, or record number</p>
        </div>
      )}
    </div>
  );
}
