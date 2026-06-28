import { ConsultationDetail } from "@/components/doctors/consultation-detail";

export default async function DoctorConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConsultationDetail consultationId={id} />;
}
