"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { downloadReceiptHTML } from "@/lib/utils/print-receipt";

const HOSPITAL = "Group Christian Medical Centre";

// ─── helpers ──────────────────────────────────────────────────────────────────
function csvEsc(v: unknown): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(headers: string[], rows: (string | number | undefined)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEsc).join(",")).join("\n");
}
function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename);
}
function timestamp() {
  return new Date().toISOString().slice(0, 16).replace("T", "_").replace(/:/g, "-");
}

// ─── Patient visit HTML builder ───────────────────────────────────────────────
function buildPatientHTML(name: string, id: string, visits: Record<string, unknown>[]): string {
  const rows = visits.map((v, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
      <td style="padding:8px 12px;border:1px solid #e2e8f0">${v.date ?? v.visitDate ?? v.createdAt ?? "—"}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">${v.department ?? v.type ?? "—"}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">${v.description ?? v.items ?? v.test ?? v.procedure ?? v.drug ?? "—"}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">${v.amount != null ? `₦${Number(v.amount).toLocaleString()}` : (v.status ?? "—")}</td>
    </tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>${name} — Patient Visit Report</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:20px}h2{font-size:14px;color:#64748b;font-weight:normal;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1e3a5f;color:#fff;padding:8px 12px;text-align:left;font-size:13px}td{font-size:13px}.footer{margin-top:24px;font-size:11px;color:#94a3b8}</style>
    </head><body>
    <h1>${HOSPITAL}</h1>
    <h2>Patient Visit Report — Confidential</h2>
    <hr style="margin:12px 0;border:none;border-top:2px solid #1e3a5f"/>
    <p><strong>Patient:</strong> ${name} &nbsp;|&nbsp; <strong>ID:</strong> ${id} &nbsp;|&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString("en-GB")}</p>
    ${visits.length === 0 ? "<p style='color:#94a3b8;margin-top:16px'>No visit records found.</p>" : `
    <table><thead><tr><th>Date</th><th>Department</th><th>Description</th><th>Amount / Status</th></tr></thead>
    <tbody>${rows}</tbody></table>`}
    <p class="footer">This document is for internal hospital use only. ${HOSPITAL} · ${new Date().getFullYear()}</p>
    </body></html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DataExportPage() {
  const { consultationFees, labCharges, nursingCharges } = useAccountsStore();
  const { tests: labTests } = useLabStore();
  const { prescriptions, bills: pharmBills } = usePharmacyStore();
  const { wardPatients, triageQueue } = useNursesStore();
  const { consultations, labOrders } = useDoctorsStore();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  // ── Department reports ──────────────────────────────────────────────────────
  function exportAccountsCSV() {
    const rows = consultationFees.map((r) => [r.id, r.patientName, r.patientId, r.consultationType, r.doctorName, r.consultedAt, r.fee, r.status]);
    downloadCSV(`accounts_consultation_${timestamp()}.csv`,
      toCSV(["ID","Patient","Patient ID","Type","Doctor","Date","Fee","Status"], rows));
    setToast({ message: "Accounts consultation fees exported.", type: "success" });
  }
  function exportLabCSV() {
    const rows = labTests.map((r) => [r.id, r.patientName, r.patientId, r.testName, r.orderedBy, r.orderedAt, r.status]);
    downloadCSV(`lab_test_requests_${timestamp()}.csv`,
      toCSV(["ID","Patient","Patient ID","Test","Ordered By","Ordered At","Status"], rows));
    setToast({ message: "Lab test requests exported.", type: "success" });
  }
  function exportPharmacyCSV() {
    const rows = prescriptions.map((r) => [r.id, r.patientName, r.patientId, r.drug, r.dose, r.frequency, r.prescribedBy, r.status]);
    downloadCSV(`pharmacy_prescriptions_${timestamp()}.csv`,
      toCSV(["ID","Patient","Patient ID","Drug","Dose","Frequency","Prescribed By","Status"], rows));
    setToast({ message: "Pharmacy prescriptions exported.", type: "success" });
  }
  function exportNursingCSV() {
    const rows = [...wardPatients.map((p) => [p.id, p.name, "Ward", `Bed ${p.bed}`, p.diagnosis, p.status, p.admittedDate]),
                  ...triageQueue.map((t) => [t.id, t.name, "Triage", "—", t.complaint, t.priority, t.checkIn])];
    downloadCSV(`nursing_patients_${timestamp()}.csv`,
      toCSV(["ID","Name","Unit","Bed/Location","Diagnosis/Complaint","Status/Priority","Date"], rows));
    setToast({ message: "Nursing patient data exported.", type: "success" });
  }
  function exportConsultationsCSV() {
    const rows = consultations.map((c) => [c.id, c.patientName, c.patientId, c.doctor, c.diagnosis, c.date, c.status]);
    downloadCSV(`doctors_consultations_${timestamp()}.csv`,
      toCSV(["ID","Patient","Patient ID","Doctor","Diagnosis","Date","Status"], rows));
    setToast({ message: "Consultations exported.", type: "success" });
  }

  // ── Print any department ────────────────────────────────────────────────────
  function printDepartmentReport(dept: string, headers: string[], rows: unknown[][]): void {
    const tableRows = rows.map((r) => `<tr>${r.map((v) => `<td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:13px">${v ?? "—"}</td>`).join("")}</tr>`).join("");
    const th = headers.map((h) => `<th style="padding:8px 10px;background:#1e3a5f;color:#fff;text-align:left;font-size:12px">${h}</th>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${dept} Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}@media print{body{padding:0}}</style>
      </head><body>
      <h2 style="margin:0">${HOSPITAL}</h2>
      <p style="color:#64748b;margin:4px 0 16px">${dept} Activity Report · ${new Date().toLocaleString("en-GB")}</p>
      <table style="width:100%;border-collapse:collapse"><thead><tr>${th}</tr></thead><tbody>${tableRows}</tbody></table>
      <p style="margin-top:20px;font-size:11px;color:#94a3b8">Printed by Admin/IT · ${new Date().getFullYear()}</p>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  // ── Patient visits ZIP ──────────────────────────────────────────────────────
  async function exportPatientVisitsZip() {
    setExporting("zip");
    const zip = new JSZip();

    // Aggregate all patient activity across stores
    const patientMap = new Map<string, { name: string; id: string; visits: Record<string, unknown>[] }>();

    const addVisit = (name: string, id: string, visit: Record<string, unknown>) => {
      const key = id || name;
      if (!patientMap.has(key)) patientMap.set(key, { name, id, visits: [] });
      patientMap.get(key)!.visits.push(visit);
    };

    consultationFees.forEach((c) => addVisit(c.patientName, c.patientId, { date: c.consultedAt, department: "Accounts – Consultation", description: `${c.consultationType} with ${c.doctorName}`, amount: c.fee }));
    labCharges.forEach((c) => addVisit(c.patientName, c.patientId, { date: c.completedAt, department: "Lab", description: c.testName, amount: c.amount }));
    nursingCharges.forEach((c) => addVisit(c.patientName, c.patientId ?? "", { date: c.performedAt, department: "Nursing", description: c.description, amount: c.amount }));
    labTests.forEach((r) => addVisit(r.patientName, r.patientId, { date: r.orderedAt, department: "Lab – Test Request", description: r.testName, status: r.status }));
    prescriptions.forEach((p) => addVisit(p.patientName, p.patientId, { date: p.date ?? p.createdAt ?? "—", department: "Pharmacy", description: `${p.drug} ${p.dose}`, status: p.status }));
    pharmBills.forEach((b) => addVisit(b.patientName, b.patientId, { date: b.dispensedAt, department: "Pharmacy – Bill", description: b.drugs, amount: b.totalCost }));
    wardPatients.forEach((p) => addVisit(p.name, p.id, { date: p.admittedDate, department: "Nursing Ward", description: `Admitted · ${p.diagnosis}`, status: p.status }));
    consultations.forEach((c) => addVisit(c.patientName, c.patientId, { date: c.date, department: "Doctors", description: c.diagnosis, status: c.status }));

    let count = 0;
    patientMap.forEach(({ name, id, visits }) => {
      const safeName = name.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
      const html = buildPatientHTML(name, id, visits);
      zip.file(`patients/${safeName}_${id || count}.html`, html);
      count++;
    });

    // Add summary CSV
    const summaryRows: string[] = ['"Patient","Patient ID","Visit Count","Departments"'];
    patientMap.forEach(({ name, id, visits }) => {
      const depts = [...new Set(visits.map((v) => String(v.department ?? "")))].join("; ");
      summaryRows.push(`${csvEsc(name)},${csvEsc(id)},${visits.length},${csvEsc(depts)}`);
    });
    zip.file("patient_visits_summary.csv", summaryRows.join("\n"));

    // Add readme
    zip.file("README.txt",
      `GCMC Patient Visits Export\n=========================\nGenerated: ${new Date().toLocaleString("en-GB")}\nPatients: ${patientMap.size}\nTotal visit records: ${[...patientMap.values()].reduce((s, p) => s + p.visits.length, 0)}\n\nEach HTML file = one patient's full visit history.\nOpen in any browser; use Print > Save as PDF for archiving.\n`);

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `GCMC_patient_visits_${timestamp()}.zip`);
    setExporting(null);
    setToast({ message: `Patient visits exported — ${patientMap.size} patient files in ZIP.`, type: "success" });
  }

  const DEPT_EXPORTS = [
    {
      dept: "Accounts — Consultation Fees",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      count: consultationFees.length,
      onCSV: exportAccountsCSV,
      onPrint: () => printDepartmentReport("Accounts – Consultation Fees",
        ["ID","Patient","Type","Doctor","Date","Fee","Status"],
        consultationFees.map((r) => [r.id, r.patientName, r.type, r.doctor, r.visitDate, `₦${r.fee.toLocaleString()}`, r.status])),
    },
    {
      dept: "Lab — Test Requests",
      color: "text-violet-700",
      bg: "bg-violet-50",
      count: testRequests.length,
      onCSV: exportLabCSV,
      onPrint: () => printDepartmentReport("Lab – Test Requests",
        ["ID","Patient","Tests","Doctor","Requested At","Status"],
        testRequests.map((r) => [r.id, r.patientName, Array.isArray(r.tests) ? r.tests.join(", ") : r.test, r.doctor, r.requestedAt, r.status])),
    },
    {
      dept: "Pharmacy — Prescriptions",
      color: "text-sky-700",
      bg: "bg-sky-50",
      count: prescriptions.length,
      onCSV: exportPharmacyCSV,
      onPrint: () => printDepartmentReport("Pharmacy – Prescriptions",
        ["ID","Patient","Drug","Dose","Frequency","Prescribed By","Status"],
        prescriptions.map((r) => [r.id, r.patientName, r.drug, r.dose, r.frequency, r.prescribedBy, r.status])),
    },
    {
      dept: "Nursing — Patients",
      color: "text-orange-700",
      bg: "bg-orange-50",
      count: wardPatients.length + triageQueue.length,
      onCSV: exportNursingCSV,
      onPrint: () => printDepartmentReport("Nursing – Patients",
        ["ID","Name","Unit","Bed/Location","Diagnosis / Complaint","Status"],
        [
          ...wardPatients.map((p) => [p.id, p.name, "Ward", `Bed ${(p as Record<string, unknown>).bed ?? "—"}`, (p as Record<string, unknown>).diagnosis ?? "—", p.status]),
          ...triageQueue.map((t) => [t.id, t.name, "Triage", "—", (t as Record<string, unknown>).complaint ?? "—", (t as Record<string, unknown>).priority ?? "—"]),
        ]),
    },
    {
      dept: "Doctors — Consultations",
      color: "text-blue-700",
      bg: "bg-blue-50",
      count: consultations.length,
      onCSV: exportConsultationsCSV,
      onPrint: () => printDepartmentReport("Doctors – Consultations",
        ["ID","Patient","Doctor","Diagnosis","Date","Status"],
        consultations.map((c) => [c.id, c.patientName, c.doctor, c.diagnosis, c.date, c.status])),
    },
    {
      dept: "Lab — Results",
      color: "text-pink-700",
      bg: "bg-pink-50",
      count: results.length,
      onCSV: () => {
        downloadCSV(`lab_results_${timestamp()}.csv`,
          toCSV(["ID","Patient","Test","Result","Reference","Interpretation","Date"],
            results.map((r) => [r.id, r.patientName, r.testName, r.result, r.referenceRange, r.interpretation, r.completedAt])));
        setToast({ message: "Lab results exported.", type: "success" });
      },
      onPrint: () => printDepartmentReport("Lab – Results",
        ["ID","Patient","Test","Result","Reference","Status","Date"],
        results.map((r) => [r.id, r.patientName, r.testName, r.result, r.referenceRange, r.interpretation, r.completedAt])),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Export Center"
        description="Download, print, or zip department activity for backup and documentation. Accessible by Admin and IT."
      />

      {/* Patient ZIP export */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl">📦</div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">Full Patient Visit Export (ZIP)</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bundles every patient's complete visit history across all departments into individual HTML files inside a ZIP archive.
              Each HTML file is printable and can be saved as PDF. Includes a summary CSV.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={exportPatientVisitsZip}
                disabled={exporting === "zip"}
                className="gap-2"
              >
                {exporting === "zip" ? (
                  <><span className="animate-spin">⏳</span> Building ZIP…</>
                ) : (
                  <><span>📥</span> Download All Patient Visits (.zip)</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Department reports */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Department Activity Reports</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {DEPT_EXPORTS.map((e) => (
            <Card key={e.dept} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${e.color}`}>{e.dept}</p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">{e.count} records</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${e.bg}`}>
                  <span className="text-lg">📋</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={e.onCSV} className="flex-1">
                  ⬇ CSV
                </Button>
                <Button size="sm" variant="outline" onClick={e.onPrint} className="flex-1">
                  🖨 Print
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Individual receipt download demo */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-900 mb-1">Sample Receipt Download</h3>
        <p className="text-sm text-slate-500 mb-4">Generate a sample payment receipt to verify the receipt template.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadReceiptHTML({
            title: "Sample Payment Receipt",
            subtitle: "Consultation — General",
            refNumber: "INV-SAMPLE-001",
            lines: [
              { label: "Patient",    value: "Demo Patient" },
              { label: "Doctor",     value: "Dr. Demo" },
              { label: "Type",       value: "General Consultation" },
              { label: "Date",       value: new Date().toLocaleDateString("en-GB") },
              { label: "Status",     value: "PAID", bold: true },
            ],
            total: { label: "Amount Paid", value: "₦15,000" },
            copyLabel: "PATIENT COPY",
          }, "sample_receipt")}
        >
          Download Sample Receipt
        </Button>
      </Card>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
