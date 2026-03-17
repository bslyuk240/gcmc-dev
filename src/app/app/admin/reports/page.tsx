"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";

const reportTypes = [
  { title: "Clinical Reports", description: "Patient outcomes, surgical success rates, and medical records summary.", iconBg: "bg-blue-100", iconColor: "text-blue-600", icon: (<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>) },
  { title: "Financial Reports", description: "Revenue analysis, billing cycles, and departmental budget tracking.", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", icon: (<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" /><path d="M2 10h20M7 15h2" /></svg>) },
  { title: "Inventory Reports", description: "Supply stock levels, pharmacy usage, and equipment maintenance logs.", iconBg: "bg-orange-100", iconColor: "text-orange-600", icon: (<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>) },
  { title: "HR & Staffing", description: "Shift distribution, staff attendance, and performance reviews.", iconBg: "bg-violet-100", iconColor: "text-violet-600", icon: (<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8" /></svg>) },
  { title: "Patient Analytics", description: "Demographics analysis, admission trends, and patient satisfaction.", iconBg: "bg-rose-100", iconColor: "text-rose-600", icon: (<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>) },
];

type Report = { name: string; type: string; size: string; generatedBy: string; date: string; status: "COMPLETED" | "ARCHIVED" };

const INITIAL_REPORTS: Report[] = [
  { name: "Monthly Revenue Q1 2026", type: "PDF", size: "4.2 MB", generatedBy: "Admin Office", date: "Mar 1, 2026", status: "COMPLETED" },
  { name: "Patient Admission Flow Feb", type: "CSV", size: "1.1 MB", generatedBy: "Admin Office", date: "Feb 28, 2026", status: "COMPLETED" },
  { name: "Surgical Outcomes 2025", type: "PDF", size: "12.8 MB", generatedBy: "Surgery Dept.", date: "Jan 10, 2026", status: "ARCHIVED" },
  { name: "Pharmacy Stock Audit", type: "Excel", size: "0.8 MB", generatedBy: "James Adu", date: "Feb 15, 2026", status: "COMPLETED" },
];

const DEPARTMENTS = ["All Departments", "Admin", "Doctors", "Nurses", "Pharmacy", "Accounts", "Store", "HR", "IT"];

const PAGE_SIZE = 8;

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [dateFrom, setDateFrom] = useState("2026-03-01");
  const [dateTo, setDateTo] = useState("2026-03-31");
  const [dept, setDept] = useState("All Departments");
  const [filterApplied, setFilterApplied] = useState(false);
  const [generateTarget, setGenerateTarget] = useState<string | null>(null);
  const [genFormat, setGenFormat] = useState("PDF");
  const [genDateFrom, setGenDateFrom] = useState("");
  const [genDateTo, setGenDateTo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(reports.length / PAGE_SIZE);
  const paginated = reports.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function handleApplyFilters() {
    setFilterApplied(true);
    setToast({ message: `Filtered: ${dateFrom} → ${dateTo}${dept !== "All Departments" ? `, ${dept}` : ""}.`, type: "info" });
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!generateTarget) return;
    setGenerating(true);
    setTimeout(() => {
      const report: Report = {
        name: `${generateTarget} — ${genDateFrom || dateFrom} to ${genDateTo || dateTo}`,
        type: genFormat, size: `${(Math.random() * 10 + 0.5).toFixed(1)} MB`,
        generatedBy: "You (Admin)", date: "Mar 15, 2026", status: "COMPLETED",
      };
      setReports((prev) => [report, ...prev]);
      setToast({ message: `${generateTarget} report generated successfully.`, type: "success" });
      setGenerateTarget(null); setGenFormat("PDF"); setGenDateFrom(""); setGenDateTo("");
      setGenerating(false);
    }, 1200);
  }

  function handleDownload(report: Report) {
    const blob = new Blob([`Report: ${report.name}\nGenerated: ${report.date}\nBy: ${report.generatedBy}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${report.name.replace(/\s+/g, "-")}.txt`; a.click();
    URL.revokeObjectURL(url);
    setToast({ message: `${report.name} downloaded.`, type: "success" });
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      {/* Header + filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">System Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and generate comprehensive hospital data reports.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Department</label>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--accent)]">
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <Button onClick={handleApplyFilters}>
            {filterApplied ? "Update Filters" : "Apply Filters"}
          </Button>
        </div>
      </div>

      {/* Report type cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {reportTypes.map((r) => (
          <Card key={r.title} className="flex flex-col p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${r.iconBg} ${r.iconColor}`}>{r.icon}</div>
            <h3 className="mt-4 font-bold text-slate-900">{r.title}</h3>
            <p className="mt-2 flex-1 text-sm text-slate-600">{r.description}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => { setGenerateTarget(r.title); setGenDateFrom(dateFrom); setGenDateTo(dateTo); }}>
              Generate Report
            </Button>
          </Card>
        ))}
      </div>

      {/* Recent Generated Reports */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Generated Reports</h2>
          <span className="text-sm text-slate-400">{reports.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Report Name", "Generated By", "Date", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.type}, {row.size}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{row.generatedBy}</td>
                  <td className="px-5 py-4 text-slate-600">{row.date}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${row.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>{row.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleDownload(row)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700" title="Download">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
                      </button>
                      <button type="button" onClick={() => setToast({ message: `Share link copied for "${row.name}".`, type: "info" })} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700" title="Share">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <p className="text-xs text-slate-500">Page {page + 1} of {Math.max(1, totalPages)}</p>
          <div className="flex gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </Card>

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg></div>
          <div><p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Reports Generated</p><p className="text-2xl font-bold text-slate-900">{reports.length + 1280}</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg></div>
          <div><p className="text-xs font-medium uppercase tracking-wider text-slate-500">Storage Used</p><p className="text-2xl font-bold text-slate-900">84.2 GB</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path d="M12 6v6l4 2" /></svg></div>
          <div><p className="text-xs font-medium uppercase tracking-wider text-slate-500">Next Scheduled Backup</p><p className="text-2xl font-bold text-slate-900">02:00 AM</p></div>
        </Card>
      </div>

      {/* Generate report modal */}
      {generateTarget && (
        <Modal open={true} onClose={() => setGenerateTarget(null)} title={`Generate — ${generateTarget}`}>
          <form id="gen-report-form" onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                <input type="date" value={genDateFrom} onChange={(e) => setGenDateFrom(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                <input type="date" value={genDateTo} onChange={(e) => setGenDateTo(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
              <select value={genFormat} onChange={(e) => setGenFormat(e.target.value)} className={inputCls}>
                <option>PDF</option><option>CSV</option><option>Excel</option>
              </select>
            </div>
          </form>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setGenerateTarget(null)} disabled={generating}>Cancel</Button>
            <Button size="md" type="submit" form="gen-report-form" disabled={generating}>
              {generating ? "Generating…" : "Generate Report"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
