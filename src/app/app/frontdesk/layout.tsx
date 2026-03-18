import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function FrontDeskLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("frontdesk");
  return children;
}
