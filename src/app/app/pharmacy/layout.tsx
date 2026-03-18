import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function PharmacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("pharmacy");
  return children;
}
