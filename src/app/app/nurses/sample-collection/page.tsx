"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { addNurseSampleRequest, updateNurseSampleRequest, type NurseSampleRequest } from "@/lib/data/nurses-store";
import { addLabTest } from "@/lib/data/lab-store";

const STATUS_STYLES: Record<string, string> = {
  Ordered: "bg-amber-50 text-amber-700",
  Collected: "bg-sky-50 text-sky-700",
  "Sent to Lab": "bg-emerald-50 text-emerald-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

const SAMPLE_TESTS = [
  { name: "Full Blood Count (FBC)", code: "FBC", sampleType: "EDTA Blood", price: 80 },
  { name: "Malaria Parasite Test", code: "MP", sampleType: "Blood Smear", price: 40 },
  { name: "Blood Culture & Sensitivity", code: "BCXS", sampleType: "Blood", price: 180 },
  { name: "Urinalysis", code: "UA", sampleType: "Mid-stream Urine", price: 30 },
  { name: "Fasting Blood Sugar", code: "FBS", sampleType: "Plain Blood", price: 35 },
  { name: "Renal Function Test", code: "RFT", sampleType: "Serum", price: 100 },
  { name: "Liver Function Test", code: "LFT", sampleType: "Serum", price: 120 },
  { name: "Electrolytes", code: "ELEC", sampleType: "Serum", price: 90 },
];


export default function NursesSampleCollectionPage() {
  const { sampleRequests, allPatients } = useNursesStore();

  const [newSampleModal, setNewSampleModal] = useState(false);
  const [collectTarget, setCollectTarget] = useState<NurseSampleRequest | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New sample form
  const [patient, setPatient] = useState(""); const [patientId, setPatientId] = useState("");
  const [testCode, setTestCode] = useState(SAMPLE_TESTS[0].code);
  const [priority, setPriority] = useState<NurseSampleRequest["priority"]>("Routine");
  const [doctor, setDoctor] = useState(""); const [nurse, setNurse] = useState("");
  const [unit, setUnit] = useState<NurseSampleRequest["unit"]>("Ward");

  // Collect form
  const [collectNurse, setCollectNurse] = useState("");

  function handleAddRequest() {
    if (!patient || !testCode) return;
    const selectedTest = SAMPLE_TESTS.find((t) => t.code === testCode)!;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    addNurseSampleRequest({
      id: `NSR-${Date.now()}`,
      patientName: patient, patientId: patientId || `PT-${Date.now()}`,
      unit, testName: selectedTest.name, testCode: selectedTest.code,
      sampleType: selectedTest.sampleType,
      status: "Ordered", priority, orderedBy: doctor,
      orderedAt: `${now} · Mar 15, 2026`,
    });
    setToast({ message: `Sample request created for ${patient} — ${selectedTest.name}.`, type: "success" });
    setNewSampleModal(false);
    setPatient(""); setPatientId(""); setTestCode(SAMPLE_TESTS[0].code);
  }

  function handleMarkCollected() {
    if (!collectTarget) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    updateNurseSampleRequest(collectTarget.id, {
      status: "Collected", collectedBy: collectNurse,
      collectedAt: `${now} · Mar 15, 2026`,
    });
    setToast({ message: `Sample collected for ${collectTarget.patientName}.`, type: "success" });
    setCollectTarget(null);
  }

  function handleSendToLab(req: NurseSampleRequest) {
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    // Send to lab store
    addLabTest({
      id: `LAB-NSR-${Date.now()}`, patientName: req.patientName, patientId: req.patientId,
      testName: req.testName, testCode: req.testCode, category: "Clinical Chemistry",
      orderedBy: req.orderedBy, orderedAt: req.orderedAt,
      priority: req.priority, status: "Sample Collected",
      sampleType: req.sampleType, price: SAMPLE_TESTS.find((t) => t.code === req.testCode)?.price ?? 50,
      sampleCollectedBy: req.collectedBy, sampleCollectedAt: req.collectedAt,
      billStatus: "Billed",
    });
    updateNurseSampleRequest(req.id, { status: "Sent to Lab" });
    setToast({ message: `${req.testName} for ${req.patientName} sent to Lab. Lab queue updated.`, type: "success" });
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  const pendingCollection = sampleRequests.filter((r) => r.status === "Ordered");
  const collected = sampleRequests.filter((r) => r.status === "Collected");
  const sentToLab = sampleRequests.filter((r) => r.status === "Sent to Lab");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Collection"
        description="Nurses collect lab samples from patients and send them to the Lab. Track all sample requests across units."
        action={<Button onClick={() => setNewSampleModal(true)}>+ New Sample Request</Button>}
      />

      {/* Stats */}
      <div className="flex gap-3">
        <Card className="flex flex-1 items-center gap-3 px-4 py-3 bg-amber-50 border-0">
          <p className="text-2xl font-bold text-amber-600">{pendingCollection.length}</p>
          <p className="text-xs font-semibold text-slate-500 leading-tight">Awaiting Collection</p>
        </Card>
        <Card className="flex flex-1 items-center gap-3 px-4 py-3 bg-sky-50 border-0">
          <p className="text-2xl font-bold text-sky-700">{collected.length}</p>
          <p className="text-xs font-semibold text-slate-500 leading-tight">Collected — Ready to Send</p>
        </Card>
        <Card className="flex flex-1 items-center gap-3 px-4 py-3 bg-emerald-50 border-0">
          <p className="text-2xl font-bold text-emerald-700">{sentToLab.length}</p>
          <p className="text-xs font-semibold text-slate-500 leading-tight">Sent to Lab</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Sample Requests</h3>
          <p className="text-xs text-slate-400 mt-0.5">Collect sample → then Send to Lab to update the lab queue automatically</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Unit", "Test", "Sample Type", "Ordered By", "Priority", "Collection", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sampleRequests.map((r) => (
                <tr key={r.id} className={`hover:bg-slate-50 ${r.priority === "STAT" ? "bg-red-50/20" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.patientName}</p>
                    <p className="text-xs text-slate-400">{r.patientId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-semibold">{r.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.testName}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.testCode}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.sampleType}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.orderedBy}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[r.priority]}`}>{r.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {r.collectedBy ? <><p>{r.collectedBy}</p><p className="text-slate-400">{r.collectedAt}</p></> : <span className="text-amber-600 font-medium">Not collected</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {r.status === "Ordered" && (
                        <Button size="sm" onClick={() => { setCollectTarget(r); setCollectNurse(""); }}>Collect</Button>
                      )}
                      {r.status === "Collected" && (
                        <Button size="sm" onClick={() => handleSendToLab(r)}>Send to Lab</Button>
                      )}
                      {r.status === "Sent to Lab" && (
                        <span className="text-xs font-semibold text-emerald-700">✓ Lab queue updated</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sampleRequests.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No sample requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Doctor orders test → Nurse creates sample request → Nurse collects sample → Nurse sends to Lab → Lab processes test → Result returned to doctor.
      </div>

      {/* New Sample Modal */}
      <Modal open={newSampleModal} onClose={() => setNewSampleModal(false)} title="New Lab Sample Request">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name *</label>
              <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Patient name" className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Patient ID</label>
              <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="PT-XXXX" className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Select Test *</label>
            <select value={testCode} onChange={(e) => setTestCode(e.target.value)} className={inputCls}>
              {SAMPLE_TESTS.map((t) => <option key={t.code} value={t.code}>{t.name} ({t.sampleType})</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as NurseSampleRequest["priority"])} className={inputCls}>
                {["Routine", "Urgent", "STAT"].map((p) => <option key={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value as NurseSampleRequest["unit"])} className={inputCls}>
                {["Outpatient", "Ward", "Emergency", "ICU"].map((u) => <option key={u}>{u}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Ordered By (Doctor)</label>
            <input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="e.g. Dr. Smith" className={inputCls} /></div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setNewSampleModal(false)}>Cancel</Button>
          <Button size="md" disabled={!patient || !testCode} onClick={handleAddRequest}>Create Sample Request</Button>
        </ModalFooter>
      </Modal>

      {/* Collect Sample Modal */}
      <Modal open={!!collectTarget} onClose={() => setCollectTarget(null)} title={`Collect Sample — ${collectTarget?.patientName}`}>
        {collectTarget && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Test</span><strong>{collectTarget.testName}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Sample Type</span><span>{collectTarget.sampleType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Priority</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[collectTarget.priority]}`}>{collectTarget.priority}</span>
              </div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Collected By *</label>
              <input value={collectNurse} onChange={(e) => setCollectNurse(e.target.value)} placeholder="Your name" className={inputCls} /></div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setCollectTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleMarkCollected}>Mark as Collected</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
