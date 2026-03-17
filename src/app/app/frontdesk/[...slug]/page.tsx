import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function FrontdeskModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="Front Desk" slug={slug} />;
}
