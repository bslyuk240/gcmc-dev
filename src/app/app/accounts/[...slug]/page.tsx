import { DepartmentModulePage } from "@/components/dashboard/department-module-page";
import { notFound } from "next/navigation";

export default async function AccountsModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  if (slug[0] === "billing") {
    notFound();
  }

  return <DepartmentModulePage department="Accounts" slug={slug} />;
}
