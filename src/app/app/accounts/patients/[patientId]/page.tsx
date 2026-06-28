import { PatientLedgerClient } from "@/components/billing/patient-ledger-client";

type PageProps = { params: Promise<{ patientId: string }> };

export default async function PatientLedgerPage({ params }: PageProps) {
  const { patientId } = await params;
  return <PatientLedgerClient patientId={decodeURIComponent(patientId)} />;
}
