"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import {
  addNurseSampleRequest,
  updateNurseSampleRequest,
  type NurseSampleRequest,
} from "@/lib/data/nurses-store";
import { addLabTest, updateLabTest, type LabTest } from "@/lib/data/lab-store";
import { insertPatientObservation } from "@/lib/supabase/db";

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

type RequestRow = NurseSampleRequest & {
  linkedLabTest?: LabTest;
  source: "nurse" | "doctor";
};

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByOrderedAt(items: RequestRow[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.orderedAt).getTime();
    const bTime = new Date(b.orderedAt).getTime();
    return bTime - aTime;
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The action could not be completed.";
}

function MobileMeta({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function NursesSampleCollectionPage() {
  const { sampleRequests, allPatients } = useNursesStore();
  const { tests, catalog } = useLabStore();
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Nurse";

  const [newSampleModal, setNewSampleModal] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [optimisticRequests, setOptimisticRequests] = useState<NurseSampleRequest[]>([]);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [manualPatientName, setManualPatientName] = useState("");
  const [manualPatientId, setManualPatientId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [priority, setPriority] = useState<NurseSampleRequest["priority"]>("Routine");
  const [doctor, setDoctor] = useState("");
  const [unit, setUnit] = useState<NurseSampleRequest["unit"]>("Ward");

  const activePatients = useMemo(
    () => allPatients.filter((patient) => patient.status === "Active"),
    [allPatients],
  );

  const patientByDisplayId = useMemo(
    () => new Map(activePatients.map((patient) => [patient.patientId, patient])),
    [activePatients],
  );

  const sampleRequestById = useMemo(
    () =>
      new Map(
        [...sampleRequests, ...optimisticRequests.filter((request) => !sampleRequests.some((stored) => stored.id === request.id))].map((request) => [
          request.id,
          request,
        ]),
      ),
    [optimisticRequests, sampleRequests],
  );

  const visibleSampleRequests = useMemo(
    () => [
      ...sampleRequests,
      ...optimisticRequests.filter((request) => !sampleRequests.some((stored) => stored.id === request.id)),
    ],
    [optimisticRequests, sampleRequests],
  );

  const patientOptions: SelectOption[] = activePatients.map((patient) => ({
    value: patient.id,
    label: patient.patientName,
    sublabel: `${patient.unit} / Bed ${patient.bed} / ${patient.patientId}`,
    group: patient.unit,
  }));

  const testOptions: SelectOption[] = catalog.map((item) => ({
    value: item.id,
    label: item.name,
    sublabel: `${item.sampleType} / ${item.code} / NGN ${item.price}`,
    group: item.category,
  }));

  const derivedRequests = tests
    .filter((test) => test.status === "Pending" || test.status === "Sample Collected" || test.status === "In Progress" || test.status === "Completed")
    .filter((test) => !sampleRequestById.has(test.id))
    .map<RequestRow>((test) => ({
      id: test.id,
      patientName: test.patientName,
      patientId: test.patientId,
      unit: (patientByDisplayId.get(test.patientId)?.unit ?? "Ward") as NurseSampleRequest["unit"],
      testName: test.testName,
      testCode: test.testCode,
      sampleType: test.sampleType,
      collectedBy: test.sampleCollectedBy,
      collectedAt: test.sampleCollectedAt,
      status: (test.status === "Pending" ? "Ordered" : "Sent to Lab") as NurseSampleRequest["status"],
      priority: test.priority,
      orderedBy: test.orderedBy,
      orderedAt: test.orderedAt,
      linkedLabTest: test,
      source: "doctor" as const,
    }));

  const requestRows = sortByOrderedAt([
    ...visibleSampleRequests.map((request) => ({
      ...request,
      status: request.status as NurseSampleRequest["status"],
      linkedLabTest: tests.find((test) => test.id === request.id || (test.patientId === request.patientId && test.testCode === request.testCode)),
      source: "nurse" as const,
    })),
    ...derivedRequests,
  ]);

  const pendingCollection = requestRows.filter((request) => request.status === "Ordered");
  const collected = requestRows.filter((request) => request.status === "Collected");
  const sentToLab = requestRows.filter((request) => request.status === "Sent to Lab");

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  function resetNewRequestForm() {
    setSelectedPatientId("");
    setManualPatientName("");
    setManualPatientId("");
    setSelectedTestId("");
    setPriority("Routine");
    setDoctor("");
    setUnit("Ward");
  }

  async function ensureStoredRequest(request: RequestRow, updates?: Partial<NurseSampleRequest>) {
    const next: NurseSampleRequest = { ...request, ...updates };
    setOptimisticRequests((prev) => {
      const existing = prev.find((entry) => entry.id === request.id);
      if (existing) return prev.map((entry) => (entry.id === request.id ? next : entry));
      return [next, ...prev];
    });
    if (sampleRequestById.has(request.id)) await updateNurseSampleRequest(request.id, updates ?? {});
    else await addNurseSampleRequest(next);
    return next;
  }

  function handleSelectPatient(patientInternalId: string) {
    setSelectedPatientId(patientInternalId);
    const patient = activePatients.find((entry) => entry.id === patientInternalId);
    if (!patient) return;
    setManualPatientName(patient.patientName);
    setManualPatientId(patient.patientId);
    setUnit(patient.unit);
    setDoctor(patient.doctorInCharge || "");
  }

  async function handleAddRequest() {
    const patient = activePatients.find((entry) => entry.id === selectedPatientId) ?? null;
    const selectedTest = catalog.find((item) => item.id === selectedTestId);
    const patientName = patient?.patientName || manualPatientName.trim();
    const patientId = patient?.patientId || manualPatientId.trim() || createLocalId("PT-LAB");

    if (!patientName || !selectedTest) return;

    const request: NurseSampleRequest = {
      id: createLocalId("LABREQ"),
      patientName,
      patientId,
      unit: patient?.unit ?? unit,
      testName: selectedTest.name,
      testCode: selectedTest.code,
      sampleType: selectedTest.sampleType,
      status: "Ordered",
      priority,
      orderedBy: doctor.trim() || patient?.doctorInCharge || "Doctor",
      orderedAt: new Date().toISOString(),
    };

    try {
      setOptimisticRequests((prev) => [request, ...prev.filter((entry) => entry.id !== request.id)]);
      await addNurseSampleRequest(request);
      setToast({ message: `Sample request created for ${patientName} - ${selectedTest.name}.`, type: "success" });
      setNewSampleModal(false);
      resetNewRequestForm();
    } catch (error) {
      setOptimisticRequests((prev) => prev.filter((entry) => entry.id !== request.id));
      setToast({ message: `Sample request failed: ${getErrorMessage(error)}`, type: "error" });
    }
  }

  async function handleMarkCollected(request: RequestRow, collectedBy = staffName) {
    const collector = collectedBy.trim() || "Nurse";
    const collectedAt = new Date().toISOString();

    try {
      const updatedRequest = await ensureStoredRequest(request, {
        status: "Collected",
        collectedBy: collector,
        collectedAt,
      });

      await insertPatientObservation({
        id: createLocalId("OBS-SAMPLE"),
        patientId: updatedRequest.patientId,
        patientName: updatedRequest.patientName,
        unit: updatedRequest.unit,
        observation: `Sample collected for ${updatedRequest.testName} (${updatedRequest.sampleType}) by ${collector}.`,
        recordedBy: collector,
        recordedAt: collectedAt,
      });

      setToast({ message: `Sample collected for ${updatedRequest.patientName}.`, type: "success" });
    } catch (error) {
      setToast({ message: `Collection failed: ${getErrorMessage(error)}`, type: "error" });
    }
  }

  async function handleSendToLab(request: RequestRow) {
    try {
      const storedRequest = await ensureStoredRequest(request, { status: "Sent to Lab" });
      const linkedTest =
        request.linkedLabTest ??
        tests.find((test) => test.id === request.id || (test.patientId === request.patientId && test.testCode === request.testCode));

      if (linkedTest) {
        await updateLabTest(linkedTest.id, {
          status: "Sample Collected",
          sampleCollectedBy: storedRequest.collectedBy,
          sampleCollectedAt: storedRequest.collectedAt,
        });
      } else {
        const catalogItem = catalog.find((item) => item.code === request.testCode);
        await addLabTest({
          id: request.id,
          patientName: request.patientName,
          patientId: request.patientId,
          testName: request.testName,
          testCode: request.testCode,
          category: catalogItem?.category ?? "Clinical Chemistry",
          orderedBy: request.orderedBy,
          orderedAt: request.orderedAt,
          priority: request.priority,
          status: "Sample Collected",
          sampleType: request.sampleType,
          price: catalogItem?.price ?? 0,
          sampleCollectedBy: storedRequest.collectedBy,
          sampleCollectedAt: storedRequest.collectedAt,
          billStatus: "Pending",
        });
      }

      await insertPatientObservation({
        id: createLocalId("OBS-SAMPLE"),
        patientId: request.patientId,
        patientName: request.patientName,
        unit: request.unit,
        observation: `Sample for ${request.testName} sent to Lab for processing.`,
        recordedBy: staffName,
        recordedAt: new Date().toISOString(),
      });

      setToast({ message: `${request.testName} for ${request.patientName} sent to Lab.`, type: "success" });
    } catch (error) {
      setToast({ message: `Send to Lab failed: ${getErrorMessage(error)}`, type: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Collection"
        description="Collect doctor-ordered samples, create manual sample requests, and hand them off to Lab processing."
        action={<Button onClick={() => setNewSampleModal(true)}>+ New Sample Request</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-amber-50 px-4 py-3">
          <p className="text-2xl font-bold text-amber-600">{pendingCollection.length}</p>
          <p className="text-xs font-semibold leading-tight text-slate-500">Awaiting Collection</p>
        </Card>
        <Card className="border-0 bg-sky-50 px-4 py-3">
          <p className="text-2xl font-bold text-sky-700">{collected.length}</p>
          <p className="text-xs font-semibold leading-tight text-slate-500">Collected - Ready to Send</p>
        </Card>
        <Card className="border-0 bg-emerald-50 px-4 py-3">
          <p className="text-2xl font-bold text-emerald-700">{sentToLab.length}</p>
          <p className="text-xs font-semibold leading-tight text-slate-500">Sent to Lab</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-2xl font-bold text-slate-900">{tests.filter((test) => test.status === "Sample Collected").length}</p>
          <p className="text-xs font-semibold leading-tight text-slate-500">Lab Processing Queue</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Sample Requests</h3>
          <p className="mt-0.5 text-xs text-slate-400">Collect sample, then send it to Lab. Doctor test orders appear here automatically.</p>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {requestRows.map((request) => (
            <div key={request.id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${request.priority === "STAT" ? "ring-1 ring-red-100" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(request.patientId)}`}
                    className="truncate text-sm font-semibold text-slate-900 hover:text-[var(--accent)] hover:underline"
                  >
                    {request.patientName}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-slate-400">{request.patientId}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                  {request.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MobileMeta label="Unit" value={request.unit} />
                <MobileMeta label="Test" value={request.testName} />
                <MobileMeta label="Sample" value={request.sampleType} />
                <MobileMeta label="Priority" value={request.priority} />
                <MobileMeta label="Ordered By" value={request.orderedBy} />
                <MobileMeta label="Ordered" value={fmtDateTime(request.orderedAt)} />
              </div>
              {request.collectedBy ? (
                <p className="mt-3 text-xs text-slate-500">
                  Collected by <strong>{request.collectedBy}</strong> at {fmtDateTime(request.collectedAt)}
                </p>
              ) : (
                <p className="mt-3 text-xs font-semibold text-amber-700">Not collected yet</p>
              )}
              <div className="mt-4 flex gap-2">
                {request.status === "Ordered" ? (
                  <Button size="sm" className="flex-1" onClick={() => void handleMarkCollected(request)}>
                    Collect
                  </Button>
                ) : null}
                {request.status === "Collected" ? (
                  <Button size="sm" className="flex-1" onClick={() => void handleSendToLab(request)}>
                    Send to Lab
                  </Button>
                ) : null}
                {request.status === "Sent to Lab" ? (
                  <span className="text-xs font-semibold text-emerald-700">Lab queue updated</span>
                ) : null}
              </div>
            </div>
          ))}
          {requestRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              No sample requests yet.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Patient", "Unit", "Test", "Sample Type", "Ordered By", "Priority", "Collection", "Status", "Action"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requestRows.map((request) => (
                <tr key={request.id} className={request.priority === "STAT" ? "bg-red-50/20" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3">
                    <Link
                      href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(request.patientId)}`}
                      className="font-medium text-slate-900 hover:text-accent hover:underline"
                    >
                      {request.patientName}
                    </Link>
                    <p className="text-xs text-slate-400">{request.patientId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{request.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{request.testName}</p>
                    <p className="text-xs font-mono text-slate-400">{request.testCode}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{request.sampleType}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div>{request.orderedBy}</div>
                    <div className="text-slate-400">{fmtDateTime(request.orderedAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[request.priority]}`}>{request.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {request.collectedBy ? (
                      <>
                        <p>{request.collectedBy}</p>
                        <p className="text-slate-400">{fmtDateTime(request.collectedAt)}</p>
                      </>
                    ) : (
                      <span className="font-medium text-amber-600">Not collected</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>{request.status}</span>
                      {request.linkedLabTest && request.linkedLabTest.status !== "Pending" ? (
                        <p className="text-[11px] text-slate-400">Lab: {request.linkedLabTest.status}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {request.status === "Ordered" ? (
                        <Button size="sm" onClick={() => void handleMarkCollected(request)}>
                          Collect
                        </Button>
                      ) : null}
                      {request.status === "Collected" ? (
                        <Button size="sm" onClick={() => void handleSendToLab(request)}>
                          Send to Lab
                        </Button>
                      ) : null}
                      {request.status === "Sent to Lab" ? (
                        <span className="text-xs font-semibold text-emerald-700">Lab queue updated</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {requestRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                    No sample requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Doctor orders test, nurse collects sample, nurse sends sample to Lab, Lab processes the test, result returns to doctor and patient record.
      </div>

      <Modal open={newSampleModal} onClose={() => setNewSampleModal(false)} title="New Lab Sample Request">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Patient</label>
            <SearchableSelect
              options={patientOptions}
              value={selectedPatientId}
              onChange={handleSelectPatient}
              placeholder="Select active patient..."
            />
            {!selectedPatientId ? (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={manualPatientName} onChange={(event) => setManualPatientName(event.target.value)} placeholder="Patient name" className={inputCls} />
                <input value={manualPatientId} onChange={(event) => setManualPatientId(event.target.value)} placeholder="Patient ID" className={inputCls} />
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Select Test *</label>
            <SearchableSelect
              options={testOptions}
              value={selectedTestId}
              onChange={setSelectedTestId}
              placeholder="Search test catalog..."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Priority</label>
              <select value={priority} onChange={(event) => setPriority(event.target.value as NurseSampleRequest["priority"])} className={inputCls}>
                {(["Routine", "Urgent", "STAT"] as const).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Unit</label>
              <select value={unit} onChange={(event) => setUnit(event.target.value as NurseSampleRequest["unit"])} className={inputCls}>
                {(["Outpatient", "Ward", "Emergency", "ICU"] as const).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Ordered By (Doctor)</label>
            <input value={doctor} onChange={(event) => setDoctor(event.target.value)} placeholder="e.g. Dr. Smith" className={inputCls} />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setNewSampleModal(false)}>Cancel</Button>
          <Button size="md" disabled={!(manualPatientName || selectedPatientId) || !selectedTestId} onClick={() => void handleAddRequest()}>
            Create Sample Request
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
