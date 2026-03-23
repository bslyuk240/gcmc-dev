"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { updateWardPatient, type WardPatient } from "@/lib/data/nurses-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  fetchPatientObservations,
  insertPatientObservation,
  type PatientObservation,
} from "@/lib/supabase/db";
import { useHMSSession } from "@/modules/rbac/hooks";

type ObsFlag = "Normal" | "Concern" | "Urgent";

type ObservationLogEntry = {
  id: string;
  patientId: string;
  patientName: string;
  unit: string;
  bed: string;
  observation: string;
  actionTaken: string;
  nurse: string;
  recordedAt: string;
  flag: ObsFlag;
};

const FLAG_STYLES: Record<ObsFlag, string> = {
  Normal: "bg-emerald-50 text-emerald-700",
  Concern: "bg-amber-50 text-amber-700",
  Urgent: "bg-red-50 text-red-700 font-bold",
};

const PRIORITY_RANK: Record<WardPatient["priority"], number> = {
  Stable: 0,
  Watch: 1,
  High: 2,
  Critical: 3,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The action could not be completed.";
}

function encodeObservation(observation: string, actionTaken: string, flag: ObsFlag) {
  return [
    `Flag: ${flag}`,
    `Observation: ${observation.trim()}`,
    actionTaken.trim() ? `Action: ${actionTaken.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseObservationContent(value: string) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const flagLine = lines.find((line) => line.startsWith("Flag:"));
  const observationLine = lines.find((line) => line.startsWith("Observation:"));
  const actionLine = lines.find((line) => line.startsWith("Action:"));
  const parsedFlag = flagLine?.replace("Flag:", "").trim();
  const flag: ObsFlag =
    parsedFlag === "Urgent" || parsedFlag === "Concern" || parsedFlag === "Normal"
      ? parsedFlag
      : "Normal";

  return {
    flag,
    observation: observationLine ? observationLine.replace("Observation:", "").trim() : value,
    actionTaken: actionLine ? actionLine.replace("Action:", "").trim() : "",
  };
}

function mapObservationRow(entry: PatientObservation, patient?: WardPatient): ObservationLogEntry {
  const parsed = parseObservationContent(entry.observation);
  return {
    id: entry.id,
    patientId: entry.patientId,
    patientName: entry.patientName,
    unit: entry.unit,
    bed: patient?.bed ?? "--",
    observation: parsed.observation,
    actionTaken: parsed.actionTaken,
    nurse: entry.recordedBy,
    recordedAt: entry.recordedAt,
    flag: parsed.flag,
  };
}

function dedupeObservationRows(entries: ObservationLogEntry[]) {
  const byId = new Map<string, ObservationLogEntry>();
  for (const entry of entries) {
    const existing = byId.get(entry.id);
    if (!existing || new Date(entry.recordedAt).getTime() >= new Date(existing.recordedAt).getTime()) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

function getEscalatedPriority(current: WardPatient["priority"], flag: ObsFlag): WardPatient["priority"] {
  if (flag === "Normal") return current;
  const target: WardPatient["priority"] = flag === "Urgent" ? "High" : "Watch";
  return PRIORITY_RANK[current] >= PRIORITY_RANK[target] ? current : target;
}

function buildEscalationNote(flag: ObsFlag, observation: string, actionTaken: string, recordedAt: string) {
  return [
    `[${flag} observation ${fmtDateTime(recordedAt)}] ${observation.trim()}`,
    actionTaken.trim() ? `Action: ${actionTaken.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function NursesObservationPage() {
  const { allPatients } = useNursesStore();
  const session = useHMSSession();
  const nurseName = session?.full_name ?? "Nurse";

  const [entries, setEntries] = useState<ObservationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filterFlag, setFilterFlag] = useState<"All" | ObsFlag>("All");
  const [toast, setToast] = useState<ToastData | null>(null);

  const [selPatient, setSelPatient] = useState("");
  const [observation, setObservation] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [flag, setFlag] = useState<ObsFlag>("Normal");
  const [obsNurse, setObsNurse] = useState(nurseName);

  const activePatients = useMemo(
    () => allPatients.filter((patient) => patient.status === "Active"),
    [allPatients],
  );

  const patientByDisplayId = useMemo(
    () => new Map(activePatients.map((patient) => [patient.patientId, patient])),
    [activePatients],
  );

  const activePatientIds = useMemo(
    () => [...new Set(activePatients.map((patient) => patient.patientId))],
    [activePatients],
  );

  useEffect(() => {
    setObsNurse(nurseName);
  }, [nurseName]);

  useEffect(() => {
    let cancelled = false;

    async function loadObservations() {
      if (activePatientIds.length === 0) {
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const results = await Promise.allSettled(
        activePatientIds.map((patientId) => fetchPatientObservations(patientId)),
      );

      if (cancelled) return;

      const loaded = results.reduce<typeof results[number]["value"][]>((acc, result) => {
        if (result.status === "fulfilled") {
          acc.push(...result.value);
        }
        return acc;
      }, []);
      const failedCount = results.filter((result) => result.status === "rejected").length;

      const rows = dedupeObservationRows(
        loaded.map((entry) => mapObservationRow(entry, patientByDisplayId.get(entry.patientId))),
      );

      setEntries(rows);
      setLoading(false);

      if (failedCount > 0) {
        setToast({
          message: `Observation log partially loaded. ${failedCount} patient record${failedCount > 1 ? "s" : ""} failed to load.`,
          type: "error",
        });
      }
    }

    void loadObservations();
    return () => {
      cancelled = true;
    };
  }, [activePatientIds, patientByDisplayId]);

  function resetForm() {
    setSelPatient("");
    setObservation("");
    setActionTaken("");
    setFlag("Normal");
    setObsNurse(nurseName);
  }

  async function handleAdd() {
    const patient = activePatients.find((entry) => entry.id === selPatient);
    if (!patient) {
      setToast({ message: "Select a valid active patient.", type: "error" });
      return;
    }
    if (!observation.trim()) {
      setToast({ message: "Observation details are required.", type: "error" });
      return;
    }
    if (!obsNurse.trim()) {
      setToast({ message: "Nurse name is required.", type: "error" });
      return;
    }
    if (flag !== "Normal" && !patient.doctorInCharge && !patient.doctorSpecialty) {
      setToast({
        message: "Doctor escalation failed: this patient has no assigned doctor or specialty route.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    const recordedAt = new Date().toISOString();
    const record: PatientObservation = {
      id: createLocalId("OBS"),
      patientId: patient.patientId,
      patientName: patient.patientName,
      unit: patient.unit,
      observation: encodeObservation(observation, actionTaken, flag),
      recordedBy: obsNurse.trim(),
      recordedAt,
    };

    let observationSaved = false;

    try {
      await insertPatientObservation(record);
      observationSaved = true;

      if (flag !== "Normal") {
        const escalationNote = buildEscalationNote(flag, observation, actionTaken, recordedAt);
        await updateWardPatient(patient.id, {
          priority: getEscalatedPriority(patient.priority, flag),
          notes: patient.notes ? `${escalationNote}\n${patient.notes}` : escalationNote,
        });
      }

      setEntries((prev) => dedupeObservationRows([mapObservationRow(record, patient), ...prev]));
      setToast({
        message:
          flag === "Normal"
            ? `Observation saved for ${patient.patientName}.`
            : `${flag} observation saved and escalated for ${patient.patientName}.`,
        type: "success",
      });
      setShowAdd(false);
      resetForm();
    } catch (error) {
      if (observationSaved) {
        setEntries((prev) => dedupeObservationRows([mapObservationRow(record, patient), ...prev]));
        setShowAdd(false);
        resetForm();
        setToast({
          message: `Observation saved, but escalation update failed: ${getErrorMessage(error)}`,
          type: "error",
        });
      } else {
        setToast({ message: `Observation save failed: ${getErrorMessage(error)}`, type: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = filterFlag === "All" ? entries : entries.filter((entry) => entry.flag === filterFlag);
  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Observation"
        description="Nursing observations across all units, with flagged notes pushed into the shared patient status for doctor follow-up."
        action={<Button onClick={() => setShowAdd(true)}>+ Add Observation</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Urgent Flags", value: entries.filter((entry) => entry.flag === "Urgent").length, color: "text-red-700", bg: "bg-red-50" },
          { label: "Concerns", value: entries.filter((entry) => entry.flag === "Concern").length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Normal", value: entries.filter((entry) => entry.flag === "Normal").length, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map((stat) => (
          <Card key={stat.label} className={`border-0 p-5 ${stat.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Observation Log</h3>
            <p className="mt-1 text-xs text-slate-400">Flagged entries update the patient priority/notes visible to doctor-facing queues.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["All", "Urgent", "Concern", "Normal"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilterFlag(value)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  filterFlag === value ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">Loading observations...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No observations found.</div>
          ) : (
            filtered.map((entry) => (
                <div key={entry.id} className={`px-5 py-4 ${entry.flag === "Urgent" ? "bg-red-50/30" : ""}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(entry.patientId)}`}
                        className="font-semibold text-slate-900 hover:text-accent hover:underline"
                      >
                        {entry.patientName}
                      </Link>
                      <span className="font-mono text-xs text-slate-400">{entry.bed}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{entry.unit}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${FLAG_STYLES[entry.flag]}`}>{entry.flag}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Obs:</span> {entry.observation}
                    </p>
                    {entry.actionTaken ? (
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-emerald-700">Action:</span> {entry.actionTaken}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-400">
                      {entry.nurse} · {fmtDateTime(entry.recordedAt)}
                    </p>
                  </div>
                  <Link
                    href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(entry.patientId)}`}
                    className="self-start text-xs font-semibold text-slate-500 hover:text-accent"
                  >
                    Open record
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => !submitting && setShowAdd(false)} title="Add Observation">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Patient *</label>
            <select value={selPatient} onChange={(event) => setSelPatient(event.target.value)} className={inputCls} disabled={submitting}>
              <option value="">-- Select patient --</option>
              {activePatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.patientName} ({patient.unit} · {patient.bed})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Observation *</label>
            <textarea
              rows={3}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Describe what was observed..."
              className={inputCls}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Action Taken</label>
            <textarea
              rows={2}
              value={actionTaken}
              onChange={(event) => setActionTaken(event.target.value)}
              placeholder="What action was taken in response?"
              className={inputCls}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Flag Level</label>
              <select value={flag} onChange={(event) => setFlag(event.target.value as ObsFlag)} className={inputCls} disabled={submitting}>
                {(["Normal", "Concern", "Urgent"] as const).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Nurse *</label>
              <input
                value={obsNurse}
                onChange={(event) => setObsNurse(event.target.value)}
                placeholder="Your name"
                className={inputCls}
                disabled={submitting}
              />
            </div>
          </div>
          {flag !== "Normal" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This flag also updates the patient priority/notes used by doctor-facing queues. If no doctor route is assigned, the save will fail.
            </div>
          ) : null}
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowAdd(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button size="md" disabled={submitting || !selPatient || !observation.trim() || !obsNurse.trim()} onClick={() => void handleAdd()}>
            {submitting ? "Saving..." : "Save Observation"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
