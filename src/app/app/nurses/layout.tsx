import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function NursesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("nurses");
  return children;
}
