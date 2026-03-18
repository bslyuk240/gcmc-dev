import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function LabLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("lab");
  return children;
}
