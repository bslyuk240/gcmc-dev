import Link from "next/link";
import { redirectToSessionHome } from "@/lib/auth/session";
import { PortalLoginForm } from "@/components/auth/portal-login-form";

const errorMessages: Record<string, string> = {
  invalid:       "Invalid email or password.",
  credentials:   "Incorrect email or password. Please try again.",
  profile:       "Your staff profile could not be found. Contact HR.",
  inactive:      "Your account has been deactivated. Contact HR.",
  configuration: "Authentication service is not configured. Contact the system administrator.",
};

const successMessages: Record<string, string> = {
  "password-reset": "Password reset successfully. You can now log in with your new password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const { next, error, message } = await searchParams;
  await redirectToSessionHome();

  const errorMsg   = error   ? (errorMessages[error]     ?? "Something went wrong. Please try again.") : null;
  const successMsg = message ? (successMessages[message] ?? null) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Department Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with the credentials assigned by HR. Your role and department are linked to your account.
          </p>
          {successMsg && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMsg}
            </div>
          )}
          <div className="mt-6">
            <PortalLoginForm
              action="/api/auth/login"
              next={next}
              emailLabel="Email Address"
              emailPlaceholder="you@hospital.local"
              passwordLabel="Password"
              submitLabel="Login"
              rememberLabel="Remember me"
              forgotHref="/forgot-password"
              forgotLabel="Forgot password?"
            />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Staff Self-Service Portal?{" "}
            <Link href="/staff/login" className="font-medium text-[var(--accent-foreground)] hover:underline">
              Sign in here →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
