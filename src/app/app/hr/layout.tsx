import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function HrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("hr");
  return children;
}
