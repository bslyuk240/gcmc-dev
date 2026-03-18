import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function ItLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("it");
  return children;
}
