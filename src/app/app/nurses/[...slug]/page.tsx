import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function NursesModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="Nurses" slug={slug} />;
}
