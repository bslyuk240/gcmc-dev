import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function PharmacyModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="Pharmacy" slug={slug} />;
}
