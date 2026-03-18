import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function AccountsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireDepartmentRouteAccess("accounts");
  return children;
}
