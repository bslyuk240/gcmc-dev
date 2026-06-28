import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function NonClinicalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("non_clinical");
  return children;
}
