"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import { canDoctorAccessConsultation } from "@/lib/utils/doctor-routing";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "neutral"> = {
  Completed: "success",
  Admitted: "info",
  "In Progress": "warning",
  "Awaiting Results": "neutral",
};

function formatWhen(date?: string, time?: string) {
  if (!date) return "--";
  const parsed = new Date(date);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return time ? `${date} ${time}` : date;
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean }) {
  const display =
    typeof value === "boolean" ? (value ? "Yes" : "No") : value === "" ? "--" : String(value);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{display}</span>
    </div>
  );
}

export function ConsultationDetail({ consultationId }: { consultationId: string }) {
  const session = useHMSSession();
  const doctorName = session?.full_name ?? "";
  const { consultations, hydrated } = useDoctorsStore();

  const consultation = useMemo(
    () => consultations.find((entry) => entry.id === consultationId),
    [consultations, consultationId],
  );

  const allowed =
    consultation && doctorName
      ? canDoctorAccessConsultation(consultation, doctorName)
      : false;

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
      </div>
    );
  }

  if (!consultation || !allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Consultation"
          description="This consultation could not be found or is not assigned to you."
          action={
            <Button href={`${INTERNAL_PREFIX}/doctors/consultations`} variant="outline">
              Back to consultations
            </Button>
          }
        />
        <Card className="p-6 text-sm text-slate-600">
          Open the consultations workspace to continue clinical actions for active encounters.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Consultation · ${consultation.patientName}`}
        description={`${consultation.patientId} · ${formatWhen(consultation.date, consultation.time)}`}
        action={
          <Button href={`${INTERNAL_PREFIX}/doctors/consultations`} variant="outline">
            Open consultations workspace
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900">Encounter summary</h3>
            <StatusBadge variant={STATUS_VARIANT[consultation.status] ?? "neutral"}>
              {consultation.status}
            </StatusBadge>
          </div>
          <DetailRow label="Patient" value={consultation.patientName} />
          <DetailRow label="Patient ID" value={consultation.patientId} />
          <DetailRow label="Doctor" value={consultation.doctorName} />
          <DetailRow label="Consultation type" value={consultation.consultType} />
          <DetailRow label="Chief complaint" value={consultation.chiefComplaint || "--"} />
          <DetailRow label="Diagnosis" value={consultation.diagnosis || "--"} />
          <DetailRow label="Notes" value={consultation.notes || "--"} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-bold text-slate-900">Orders & billing</h3>
          <DetailRow label="Prescription written" value={consultation.rxWritten} />
          <DetailRow label="Lab ordered" value={consultation.labOrdered} />
          <DetailRow label="Admission ordered" value={consultation.admissionOrdered} />
          <DetailRow label="Admission unit" value={consultation.admissionUnit || "--"} />
          <DetailRow label="Consultation fee" value={`₦${consultation.consultFee.toLocaleString()}`} />
          <DetailRow label="Fee paid" value={consultation.feePaid} />
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-sm text-slate-600">
          Prescriptions, lab orders, admission, and fee billing are managed from the{" "}
          <Link href={`${INTERNAL_PREFIX}/doctors/consultations`} className="font-semibold text-violet-600 hover:underline">
            consultations workspace
          </Link>
          . This page is a read-only record view.
        </p>
      </Card>
    </div>
  );
}
