import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function DoctorsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("doctors");
  return children;
}
