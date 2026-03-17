import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function DoctorsModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="Doctors" slug={slug} />;
}
