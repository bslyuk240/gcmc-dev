import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function ItModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="IT" slug={slug} />;
}
