import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("store");
  return children;
}
