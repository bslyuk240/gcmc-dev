import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default async function DoctorConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation"
        description={`Encounter ${id}`}
        action={<Button href={`${INTERNAL_PREFIX}/doctors/consultations`}>Back to list</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-bold text-slate-900">Patient details</h3>
          <p className="mt-2 text-sm text-slate-600">Vitals and demographics appear here (from visit).</p>
        </Card>
        <Card>
          <h3 className="font-bold text-slate-900">New Consultation</h3>
          <p className="mt-2 text-sm text-slate-600">
            Chief complaint, history, diagnosis, and prescription builder (structured medication list).
          </p>
          <Button className="mt-4">Save Consultation</Button>
        </Card>
      </div>
      <Card>
        <h3 className="font-bold text-slate-900">Prescriptions</h3>
        <p className="mt-2 text-sm text-slate-600">Structured lines: medication, form/strength, dosage, frequency, duration, route, quantity, instruction.</p>
        <Button variant="outline" className="mt-4">Add medication (prescription builder)</Button>
      </Card>
    </div>
  );
}
