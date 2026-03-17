import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function AdminModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="Admin" slug={slug} />;
}
