import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("admin");
  return children;
}
