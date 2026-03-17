/**
 * Auth layout: no public header/footer. Used for /login and /forgot-password only.
 * Staff reach these via URL; not linked from the public website.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
