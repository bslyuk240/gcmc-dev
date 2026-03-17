import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function HrModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="HR" slug={slug} />;
}
