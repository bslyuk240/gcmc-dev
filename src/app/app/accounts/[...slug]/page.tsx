import { DepartmentModulePage } from "@/components/dashboard/department-module-page";

export default async function AccountsModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <DepartmentModulePage department="Accounts" slug={slug} />;
}
