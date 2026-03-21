import { requireDepartmentRouteAccess } from "@/lib/auth/department-route";

export default async function NhisLayout({ children }: { children: React.ReactNode }) {
  await requireDepartmentRouteAccess("nhis");
  return <>{children}</>;
}
