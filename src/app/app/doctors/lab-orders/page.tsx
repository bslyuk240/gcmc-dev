"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { addLabTest, getTestCatalog, type TestPriority } from "@/lib/data/lab-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  "Sample Collected": "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

type LabLine = { testCode: string; priority: TestPriority };
const BLANK_LAB: LabLine = { testCode: "", priority: "Routine" };

export default function DoctorLabOrdersPage() {
  const { tests, metrics } = useLabStore();
  const { consultations, doctors } = useDoctorsStore();
  const { allPatients } = useNursesStore();
  const catalog = getTestCatalog();

  const [filterStatus, setFilterStatus] = useState("All");
  const [showOrder, setShowOrder] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New order form
  const [patient, setPatient] = useState("");
  const [patientId, setPatientId] = useState("");
  const [orderingDoc, setOrderingDoc] = useState("Dr. Chen Lin");
  const [labLines, setLabLines] = useState<LabLine[]>([{ ...BLANK_LAB }]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [selectedPatientKey, setSelectedPatientKey] = useState("");

  // Unified patient options
  const activeConsults = consultations.filter((c) => c.status === "In Progress" || c.status === "Awaiting Results");
  
  const patientOptions: SelectOption[] = [
    ...activeConsults.map((c) => ({
      value: c.id,
      label: c.patientName,
      sublabel: `${c.patientId} · ${c.consultType} · ${c.doctorName}`,
      group: "Active Consultations",
    })),
    ...allPatients
      .filter((p) => p.status === "Active" && !activeConsults.some((c) => c.patientId === p.patientId))
      .map((p) => ({
        value: `NP-${p.id}`,
        label: p.patientName,
        sublabel: `${p.patientId} · ${p.unit} · Bed ${p.bed}`,
        group: "Admitted Patients",
      })),
  ];

  const doctorOptions: SelectOption[] = doctors.map((d) => ({
    value: d.name,
    label: d.name,
    sublabel: d.specialty,
  }));

  const testOptions: SelectOption[] = catalog.map((t) => ({
    value: t.code,
    label: t.name,
    sublabel: `${t.category} · ₦${t.price} · ${t.turnaroundHours}h`,
    group: t.category,
  }));

  function handlePatientSelect(key: string) {
    setSelectedPatientKey(key);
    if (key.startsWith("NP-")) {
      const p = allPatients.find((x) => `NP-${x.id}` === key);
      if (p) { setPatient(p.patientName); setPatientId(p.patientId); }
    } else {
      const c = consultations.find((x) => x.id === key);
      if (c) { setPatient(c.patientName); setPatientId(c.patientId); setOrderingDoc(c.doctorName); }
    }
  }

  const filtered = filterStatus === "All"
    ? tests
    : tests.filter((t) => t.status === filterStatus);

  const pending = tests.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");

  function updateLine(idx: number, field: keyof LabLine, value: string) {
    setLabLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function handleOrder() {
    const filled = labLines.filter((l) => l.testCode);
    if (!patient) { setToast({ message: "Enter patient name.", type: "error" }); return; }
    if (!filled.length) { setToast({ message: "Select at least one test.", type: "error" }); return; }

    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    filled.forEach((line) => {
      const cat = catalog.find((c) => c.code === line.testCode);
      if (!cat) return;
      addLabTest({
        id: `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientName: patient,
        patientId: patientId || `PT-${Date.now().toString().slice(-4)}`,
        testName: cat.name,
        testCode: cat.code,
        category: cat.category,
        orderedBy: orderingDoc,
        orderedAt: `${now} · Mar 15, 2026`,
        priority: line.priority,
        status: "Pending",
        sampleType: cat.sampleType,
        price: cat.price,
        billStatus: "Pending",
        resultNotes: clinicalNotes || undefined,
      });
    });

    setToast({
      message: `${filled.length} test(s) ordered for ${patient} — sent to Lab.`,
      type: "success",
    });
    setShowOrder(false);
    setPatient(""); setPatientId(""); setClinicalNotes("");
    setLabLines([{ ...BLANK_LAB }]); setOrderingDoc("Dr. Chen Lin");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Lab Orders" description="Diagnostic tests ordered for patients. Multiple tests can be ordered in a single order." />
        <Button onClick={() => { setShowOrder(true); setLabLines([{ ...BLANK_LAB }]); }}>+ New Lab Order</Button>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3">
        {[
          { label: "Total Orders", value: tests.length, color: "text-slate-900" },
          { label: "Active / Pending", value: pending.length, color: pending.length > 0 ? "text-amber-600" : "text-slate-400" },
          { label: "Urgent / STAT", value: metrics.urgentTests, color: metrics.urgentTests > 0 ? "text-red-700" : "text-slate-400" },
          { label: "Completed", value: metrics.completedTests, color: "text-emerald-700" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick order from active consultation */}
      {activeConsults.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Quick Order from Active Consultations</p>
          <div className="flex flex-wrap gap-2">
            {activeConsults.map((c) => (
              <button key={c.id}
                onClick={() => {
                  setPatient(c.patientName);
                  setPatientId(c.patientId);
                  setOrderingDoc(c.doctorName);
                  setLabLines([{ ...BLANK_LAB }]);
                  setShowOrder(true);
                }}
                className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition">
                {c.patientName} ({c.patientId})
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Lab Orders</h3>
          <div className="flex gap-1.5 flex-wrap">
            {["All", "Pending", "Sample Collected", "In Progress", "Completed"].map((f) => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterStatus === f ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Lab ID", "Patient", "Test", "Category", "Ordered By", "Priority", "Ordered", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "STAT" ? "bg-red-50/20" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{t.patientName}</p>
                    <p className="text-[10px] text-slate-400">{t.patientId}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{t.testName}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.category}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.orderedBy}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{t.orderedAt}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No lab orders in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── New Lab Order Modal ─────────────────────────────────────────────── */}
      <Modal open={showOrder} onClose={() => setShowOrder(false)} title="New Lab Order">
        <div className="space-y-4">
          {/* Patient */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Patient *</label>
              <SearchableSelect
                options={patientOptions}
                value={selectedPatientKey}
                onChange={handlePatientSelect}
                placeholder="Search from consultations or admitted patients…"
              />
              {!selectedPatientKey && (
                <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Or type patient name manually…"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" />
              )}
              {selectedPatientKey && patient && (
                <p className="mt-1 text-xs text-slate-500">Patient: <strong>{patient}</strong> ({patientId})</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ordering Doctor</label>
              <SearchableSelect
                options={doctorOptions}
                value={orderingDoc}
                onChange={setOrderingDoc}
                placeholder="Select doctor…"
                showGroups={false}
              />
            </div>
          </div>

          {/* Test lines */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Tests to order</span>
              <button type="button" onClick={() => setLabLines((p) => [...p, { ...BLANK_LAB }])}
                className="text-xs font-semibold text-sky-600 hover:underline">+ Add test</button>
            </div>
            {labLines.map((line, i) => {
              const sel = catalog.find((t) => t.code === line.testCode);
              return (
                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Test {i + 1}</span>
                    {labLines.length > 1 && (
                      <button type="button" onClick={() => setLabLines((p) => p.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">Test *</label>
                      <SearchableSelect
                        options={testOptions}
                        value={line.testCode}
                        onChange={(v) => updateLine(i, "testCode", v)}
                        placeholder="Search test catalog…"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Priority</label>
                      <div className="flex gap-1">
                        {(["Routine", "Urgent", "STAT"] as const).map((p) => (
                          <button key={p} type="button" onClick={() => updateLine(i, "priority", p)}
                            className={`flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition ${
                              line.priority === p
                                ? p === "STAT" ? "border-red-400 bg-red-50 text-red-700"
                                  : p === "Urgent" ? "border-amber-400 bg-amber-50 text-amber-700"
                                  : "border-sky-400 bg-sky-50 text-sky-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    {sel && (
                      <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                        <div><strong>Sample:</strong> {sel.sampleType}</div>
                        <div><strong>TAT:</strong> {sel.turnaroundHours < 1 ? `${sel.turnaroundHours * 60} min` : `${sel.turnaroundHours} hr`} · <strong>Price:</strong> ₦{sel.price}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          {labLines.some((l) => l.testCode) && (
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2 text-sm">
              <span className="font-semibold text-indigo-800">
                {labLines.filter((l) => l.testCode).length} test(s) — Est. total
              </span>
              <span className="font-bold text-indigo-900">
                ₦{labLines.reduce((sum, l) => {
                  const t = catalog.find((x) => x.code === l.testCode);
                  return sum + (t?.price ?? 0);
                }, 0).toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Clinical Notes / Indication</label>
            <textarea rows={2} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Suspected malaria, evaluate for anaemia…"
              className={inputCls + " resize-none"} />
          </div>

          {labLines.some((l) => l.priority === "STAT") && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 font-semibold">
              STAT test(s) included — Lab will be notified for immediate processing.
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowOrder(false)}>Cancel</Button>
          <Button size="md" onClick={handleOrder}>
            Send to Lab
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
