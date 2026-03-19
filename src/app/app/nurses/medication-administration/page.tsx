"use client";

import { useState, useRef } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  addNurseRequest,
  updateNurseRequestStatus,
  PHARMACY_DRUG_LIST,
  type NurseMedRequest,
} from "@/lib/data/pharmacy-store";

type MedStatus = "administered" | "due" | "overdue" | "skipped";
type Tab = "Doctor Prescriptions" | "MAR" | "Pharmacy Requests";

type MarEntry = {
  id: string;
  patient: string;
  patientId: string;
  ward: string;
  drug: string;
  dosage: string;
  frequency: string;
  route: string;
  time: string;
  status: MedStatus;
  administeredAt?: string;
  administeredBy?: string;
  source?: "doctor" | "nurse";
};


const STATUS_BADGE: Record<MedStatus, "success" | "warning" | "destructive" | "neutral"> = {
  administered: "success", due: "warning", overdue: "destructive", skipped: "neutral",
};

const NURSE_REQUEST_STATUS_COLOR: Record<string, string> = {
  Requested: "bg-sky-100 text-sky-700",
  Preparing: "bg-amber-100 text-amber-800",
  Ready: "bg-violet-100 text-violet-800",
  Collected: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const ROUTES = ["oral", "IV", "IV infusion", "IM", "SC", "sublingual", "topical", "inhaled", "rectal"];

export default function NursesMedicationAdministrationPage() {
  const idCounterRef = useRef(0);
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Nurse";
  const [activeTab, setActiveTab] = useState<Tab>("Doctor Prescriptions");
  const [entries, setEntries] = useState<MarEntry[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<MarEntry | null>(null);
  const [skipTarget, setSkipTarget] = useState<MarEntry | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);

  // Request pharmacy form
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqPatient, setReqPatient] = useState("");
  const [reqPatientId, setReqPatientId] = useState("");
  const [reqWard, setReqWard] = useState("");
  const [reqDrug, setReqDrug] = useState("");
  const [reqDosage, setReqDosage] = useState("");
  const [reqRoute, setReqRoute] = useState("IV");
  const [reqQty, setReqQty] = useState("");
  const [reqUrgency, setReqUrgency] = useState<"Routine" | "Urgent" | "STAT">("Routine");
  const [reqNotes, setReqNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { prescriptions, nurseRequests } = usePharmacyStore();
  const { allPatients } = useNursesStore();

  // Inpatients (ward/ICU/ER)
  const inpatients = allPatients.filter((p) => p.status === "Active");

  // Prescriptions written for inpatient patients only (matching by patient name)
  const inpatientNames = new Set(inpatients.map((p) => p.patientName.toLowerCase()));
  const doctorPrescriptions = prescriptions.filter((rx) =>
    inpatientNames.has(rx.patientName.toLowerCase()) ||
    rx.department === "Ward" || rx.department === "ICU" || rx.department === "Emergency"
  );

  const patientOptions: SelectOption[] = inpatients.map((p) => ({
    value: p.id,
    label: p.patientName,
    sublabel: `${p.unit} · Bed ${p.bed} · ${p.patientId}`,
    group: p.unit,
  }));

  const drugOptions: SelectOption[] = PHARMACY_DRUG_LIST.map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: `${d.category} · ₦${d.unitPrice}/${d.unit}`,
    group: d.category,
  }));

  const wardOptions: SelectOption[] = [
    { value: "Ward", label: "Ward / Inpatient" },
    { value: "ICU", label: "ICU" },
    { value: "Emergency", label: "Emergency" },
    { value: "Outpatient", label: "Outpatient" },
  ];

  const readyRequests = nurseRequests.filter((r) => r.status === "Ready");
  const due = entries.filter((e) => e.status === "due" || e.status === "overdue");
  const done = entries.filter((e) => e.status === "administered" || e.status === "skipped");

  function handleSelectPatient(patientId: string) {
    const p = inpatients.find((pt) => pt.id === patientId);
    if (p) {
      setReqPatient(p.patientName);
      setReqPatientId(p.patientId);
      setReqWard(p.unit);
    }
  }

  function handleSelectDrug(drugId: string) {
    const d = PHARMACY_DRUG_LIST.find((x) => x.id === drugId);
    if (d) {
      setReqDrug(drugId);
      setReqDosage(d.defaultDosage);
    }
  }

  function handleAdminister() {
    if (!confirmTarget) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setEntries((prev) =>
      prev.map((e) =>
        e.id === confirmTarget.id
          ? { ...e, status: "administered", administeredAt: now, administeredBy: staffName }
          : e,
      ),
    );
    setToast({ message: `${confirmTarget.drug} administered to ${confirmTarget.patient}.`, type: "success" });
    setConfirmTarget(null);
  }

  function handleSkip() {
    if (!skipTarget) return;
    setEntries((prev) => prev.map((e) => e.id === skipTarget.id ? { ...e, status: "skipped" } : e));
    setToast({ message: `${skipTarget.drug} for ${skipTarget.patient} marked as skipped.`, type: "info" });
    setSkipTarget(null);
    setSkipReason("");
  }

  function handleAddToMAR(rx: typeof prescriptions[0]) {
    const existing = entries.some((e) => e.patient === rx.patientName && e.drug === rx.drugs[0]?.name);
    if (existing) {
      setToast({ message: "This prescription is already in the MAR.", type: "info" });
      return;
    }
    const patient = inpatients.find((p) => p.patientName.toLowerCase() === rx.patientName.toLowerCase());
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const newEntries: MarEntry[] = rx.drugs.map((d, i) => ({
      id: `MAR-RX-${++idCounterRef.current}-${i}`,
      patient: rx.patientName,
      patientId: rx.patientId,
      ward: patient?.unit ?? "Ward",
      drug: d.name,
      dosage: d.dosage,
      frequency: d.frequency,
      route: "oral",
      time: now,
      status: "due",
      source: "doctor",
    }));
    setEntries((prev) => [...newEntries, ...prev]);
    setToast({ message: `${rx.drugs.length} drug(s) from Rx ${rx.id} added to MAR.`, type: "success" });
    setActiveTab("MAR");
  }

  function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!reqPatient || !reqDrug || !reqQty) {
      setToast({ message: "Fill in patient, drug, and quantity.", type: "error" });
      return;
    }
    setSubmitting(true);
    const drug = PHARMACY_DRUG_LIST.find((d) => d.id === reqDrug);
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setTimeout(() => {
      const req: NurseMedRequest = {
        id: `NRQ-${++idCounterRef.current}`,
        patientName: reqPatient,
        patientId: reqPatientId || `PT-${Math.floor(8000 + Math.random() * 1000)}`,
        ward: reqWard || "Ward",
        requestedBy: staffName,
        drug: drug?.name ?? reqDrug,
        dosage: reqDosage,
        route: reqRoute,
        qty: reqQty,
        urgency: reqUrgency,
        notes: reqNotes || undefined,
        requestedAt: `${now} · Mar 15, 2026`,
        status: "Requested",
      };
      addNurseRequest(req);
      setSubmitting(false);
      setShowRequestModal(false);
      setReqPatient(""); setReqPatientId(""); setReqDrug(""); setReqDosage(""); setReqQty(""); setReqNotes(""); setReqWard("");
      setToast({ message: `Request sent to Pharmacy for ${drug?.name ?? reqDrug}.`, type: "success" });
      setActiveTab("Pharmacy Requests");
    }, 600);
  }

  function markCollected(req: NurseMedRequest) {
    updateNurseRequestStatus(req.id, "Collected");
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const newEntry: MarEntry = {
      id: `MAR-PH-${++idCounterRef.current}`,
      patient: req.patientName,
      patientId: req.patientId,
      ward: req.ward,
      drug: req.drug,
      dosage: req.dosage || "—",
      frequency: "As prescribed",
      route: req.route,
      time: now,
      status: "due",
      source: "nurse",
    };
    setEntries((prev) => [newEntry, ...prev]);
    setToast({ message: `${req.drug} collected and added to MAR for ${req.patientName}.`, type: "success" });
    setActiveTab("MAR");
  }

  const tabs: { label: Tab; badge?: number }[] = [
    { label: "Doctor Prescriptions", badge: doctorPrescriptions.filter((r) => r.status === "Dispensed").length },
    { label: "MAR", badge: due.length },
    { label: "Pharmacy Requests", badge: readyRequests.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medication Administration"
        description="Doctor prescriptions for inpatients, MAR, and pharmacy medication requests."
        action={
          <Button size="md" onClick={() => setShowRequestModal(true)}>
            + Request from Pharmacy
          </Button>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-5 border-b border-slate-200 px-1 overflow-x-auto">
        {tabs.map(({ label, badge }) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveTab(label)}
            className={`shrink-0 border-b-2 pb-3 pt-2 text-sm font-bold transition ${
              activeTab === label
                ? "border-accent text-accent-foreground"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="ml-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Doctor Prescriptions Tab ── */}
      {activeTab === "Doctor Prescriptions" && (
        <div className="space-y-4">
          {doctorPrescriptions.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-slate-400">No doctor prescriptions found for current inpatients.</p>
              <p className="mt-1 text-xs text-slate-400">Prescriptions from Doctors portal for admitted patients appear here.</p>
            </Card>
          ) : (
            <>
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Showing {doctorPrescriptions.length} prescription(s) for admitted patients. Dispensed prescriptions can be added to MAR.
              </div>
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Rx ID", "Patient", "Doctor", "Medications", "Time", "Status", "Action"].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctorPrescriptions.map((rx) => {
                        const patient = inpatients.find((p) => p.patientName.toLowerCase() === rx.patientName.toLowerCase());
                        return (
                          <tr key={rx.id} className={`hover:bg-slate-50 ${rx.urgency === "Urgent" ? "bg-red-50/20" : ""}`}>
                            <td className="px-5 py-3 font-bold text-slate-800 font-mono text-xs">{rx.id}</td>
                            <td className="px-5 py-3">
                              <p className="font-semibold text-slate-900">{rx.patientName}</p>
                              {patient && <p className="text-xs text-slate-400">{patient.unit} · Bed {patient.bed}</p>}
                            </td>
                            <td className="px-5 py-3 text-slate-600">{rx.doctorName}</td>
                            <td className="px-5 py-3">
                              {rx.drugs.map((d, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-medium text-slate-800">{d.name}</span>
                                  <span className="text-slate-400"> — {d.dosage} · {d.frequency} · {d.duration}</span>
                                </div>
                              ))}
                              {rx.notes && <p className="mt-1 text-xs italic text-amber-700">{rx.notes}</p>}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{rx.createdAt}</td>
                            <td className="px-5 py-3">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                rx.status === "Dispensed" ? "bg-emerald-100 text-emerald-700"
                                : rx.status === "Pending" ? "bg-amber-100 text-amber-700"
                                : rx.status === "Processing" ? "bg-sky-100 text-sky-700"
                                : "bg-slate-100 text-slate-500"
                              }`}>
                                {rx.status}
                              </span>
                              {rx.urgency === "Urgent" && (
                                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">URGENT</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {rx.status === "Dispensed" ? (
                                <Button size="sm" onClick={() => handleAddToMAR(rx)}>
                                  + Add to MAR
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  {rx.status === "Pending" ? "Awaiting Pharmacy" : rx.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── MAR Tab ── */}
      {activeTab === "MAR" && (
        <div className="space-y-6">
          {due.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
                <h3 className="font-bold text-slate-900">Pending Administration</h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{due.length} due</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Patient", "Unit", "Drug", "Dosage", "Route", "Frequency", "Due", "Status", "Action"].map((h) => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {due.map((row) => (
                      <tr key={row.id} className={row.status === "overdue" ? "bg-red-50/40" : "hover:bg-slate-50"}>
                        <td className="px-5 py-3 font-semibold text-slate-900">{row.patient}</td>
                        <td className="px-5 py-3 text-slate-500">{row.ward}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{row.drug}</td>
                        <td className="px-5 py-3 text-slate-600">{row.dosage}</td>
                        <td className="px-5 py-3 text-slate-600">{row.route}</td>
                        <td className="px-5 py-3 text-slate-600">{row.frequency}</td>
                        <td className="px-5 py-3 text-slate-500">{row.time}</td>
                        <td className="px-5 py-3"><StatusBadge variant={STATUS_BADGE[row.status]}>{row.status}</StatusBadge></td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setConfirmTarget(row)}>Administer</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSkipTarget(row); setSkipReason(""); }}>Skip</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {done.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900">Administered / Completed</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Patient", "Drug", "Dosage", "Route", "Administered At", "By", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {done.map((row) => (
                      <tr key={row.id} className="bg-slate-50/50 text-slate-500">
                        <td className="px-5 py-3 font-medium text-slate-700">{row.patient}</td>
                        <td className="px-5 py-3">{row.drug}</td>
                        <td className="px-5 py-3">{row.dosage}</td>
                        <td className="px-5 py-3">{row.route}</td>
                        <td className="px-5 py-3">{row.administeredAt ?? "—"}</td>
                        <td className="px-5 py-3">{row.administeredBy ?? "—"}</td>
                        <td className="px-5 py-3"><StatusBadge variant={STATUS_BADGE[row.status]}>{row.status}</StatusBadge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {due.length === 0 && done.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-slate-400">No MAR entries. Add from Doctor Prescriptions or Pharmacy Requests tab.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Pharmacy Requests Tab ── */}
      {activeTab === "Pharmacy Requests" && (
        <div className="space-y-4">
          {readyRequests.length > 0 && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800">
              {readyRequests.length} medication(s) are <strong>Ready for Collection</strong> from Pharmacy.
            </div>
          )}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Medication Requests to Pharmacy</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Req ID", "Patient", "Unit", "Drug", "Route", "Urgency", "Requested At", "Status", "Action"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nurseRequests.map((req) => (
                    <tr key={req.id} className={`hover:bg-slate-50 ${req.status === "Ready" ? "bg-violet-50/30" : ""}`}>
                      <td className="px-5 py-3 font-bold text-slate-800 text-xs">{req.id}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{req.patientName}</td>
                      <td className="px-5 py-3 text-slate-500">{req.ward}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{req.drug}</p>
                        <p className="text-xs text-slate-400">{req.dosage} · {req.qty}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{req.route}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${req.urgency === "STAT" ? "bg-red-100 text-red-700" : req.urgency === "Urgent" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{req.requestedAt}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${NURSE_REQUEST_STATUS_COLOR[req.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {req.status === "Ready" && (
                          <Button size="sm" onClick={() => markCollected(req)}>
                            Collect &amp; Add to MAR
                          </Button>
                        )}
                        {req.status === "Collected" && <span className="text-xs text-emerald-600 font-semibold">✓ In MAR</span>}
                        {(req.status === "Requested" || req.status === "Preparing") && (
                          <span className="text-xs text-slate-400">Awaiting pharmacy…</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {nurseRequests.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No requests sent yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Administer confirm modal */}
      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Administration">
        <div className="space-y-2 text-sm">
          <p className="text-slate-600">Confirm that you administered the following medication:</p>
          <div className="mt-3 rounded-lg bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{confirmTarget?.patient}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Drug</span><span className="font-semibold">{confirmTarget?.drug}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Dosage</span><span>{confirmTarget?.dosage}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Route</span><span>{confirmTarget?.route}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due Time</span><span>{confirmTarget?.time}</span></div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setConfirmTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleAdminister}>Confirm Administered</Button>
        </ModalFooter>
      </Modal>

      {/* Skip modal */}
      <Modal open={!!skipTarget} onClose={() => setSkipTarget(null)} title="Skip Medication Dose">
        <p className="text-sm text-slate-600">Reason for skipping <strong>{skipTarget?.drug}</strong> for <strong>{skipTarget?.patient}</strong>:</p>
        <textarea
          rows={3}
          value={skipReason}
          onChange={(e) => setSkipReason(e.target.value)}
          placeholder="Patient refused, contraindication, out of stock…"
          className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setSkipTarget(null)}>Cancel</Button>
          <Button size="md" variant="outline" onClick={handleSkip}>Confirm Skip</Button>
        </ModalFooter>
      </Modal>

      {/* Request from Pharmacy modal */}
      <Modal open={showRequestModal} onClose={() => !submitting && setShowRequestModal(false)} title="Request Medication from Pharmacy">
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Patient <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={patientOptions}
              value={inpatients.find((p) => p.patientName === reqPatient)?.id ?? ""}
              onChange={handleSelectPatient}
              placeholder="Select admitted patient…"
            />
            {patientOptions.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">No active inpatients found. You can type a name manually below.</p>
            )}
            {!inpatients.find((p) => p.patientName === reqPatient) && (
              <input
                type="text"
                value={reqPatient}
                onChange={(e) => setReqPatient(e.target.value)}
                placeholder="Or type patient name…"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Patient ID</label>
              <input value={reqPatientId} onChange={(e) => setReqPatientId(e.target.value)} placeholder="PT-XXXX"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Unit</label>
              <SearchableSelect
                options={wardOptions}
                value={reqWard}
                onChange={setReqWard}
                placeholder="Select unit…"
                showGroups={false}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Drug <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={drugOptions}
              value={reqDrug}
              onChange={handleSelectDrug}
              placeholder="Search pharmacy drug catalog…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Dosage</label>
              <input value={reqDosage} onChange={(e) => setReqDosage(e.target.value)} placeholder="e.g. 1g"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Quantity <span className="text-red-500">*</span></label>
              <input required value={reqQty} onChange={(e) => setReqQty(e.target.value)} placeholder="e.g. 1 vial"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Route</label>
              <SearchableSelect
                options={ROUTES.map((r) => ({ value: r, label: r }))}
                value={reqRoute}
                onChange={setReqRoute}
                placeholder="Route…"
                showGroups={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Urgency</label>
              <div className="flex gap-2 mt-1">
                {(["Routine", "Urgent", "STAT"] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setReqUrgency(u)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${reqUrgency === u ? (u === "STAT" ? "bg-red-600 text-white" : u === "Urgent" ? "bg-orange-500 text-white" : "bg-sky-600 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Clinical Notes</label>
            <textarea rows={2} value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} placeholder="Notes for pharmacist…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
          </div>
          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            ✓ Request will appear instantly in the Pharmacy queue for preparation.
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowRequestModal(false)} disabled={submitting}>Cancel</Button>
            <Button size="md" type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send to Pharmacy"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
