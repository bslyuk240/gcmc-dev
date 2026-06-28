import { AuthHelpLine, AuthShell } from "@/components/auth/auth-shell";
import { PortalLoginForm } from "@/components/auth/portal-login-form";
import { getStaffPortalSession } from "@/lib/auth/session";
import { getTenantBranding } from "@/lib/tenant/get-branding";

async function alreadyLoggedIn(): Promise<boolean> {
  const session = await getStaffPortalSession();
  return session !== null;
}

export async function generateMetadata() {
  const branding = await getTenantBranding();
  return {
    title: `Staff Login - ${branding.shortName} Staff Portal`,
  };
}

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const branding = await getTenantBranding();
  const isLoggedIn = await alreadyLoggedIn();

  const errorMessages: Record<string, string> = {
    invalid:       "Invalid email or password.",
    credentials:   "Incorrect email or password. Please try again.",
    profile:       "Your staff profile could not be found. Contact HR.",
    inactive:      "Your account has been deactivated. Contact HR.",
    configuration: "Authentication service is not configured. Contact the system administrator.",
    suspended:     "This hospital account is suspended. Contact your administrator.",
    tenant:        "Could not resolve your hospital tenant. Check the URL and try again.",
  };
  const errorMsg = error ? (errorMessages[error] ?? "Something went wrong. Please try again.") : null;

  const emailPlaceholder = branding.slug
    ? `you@${branding.slug}.local`
    : "you@hospital.local";

  return (
    <AuthShell
      brandName="Staff Self-Service Portal"
      brandSubtitle={branding.name}
      eyebrow={branding.shortName}
      title="Welcome back"
      subtitle="Sign in to continue to your staff account"
      footer={<AuthHelpLine />}
    >
      {isLoggedIn ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">You&apos;re already signed in.</p>
          <a href="/staff/dashboard" className="mt-1 block text-sm font-bold text-emerald-700 hover:text-emerald-800">
            Continue to your dashboard
          </a>
        </div>
      ) : null}
      {errorMsg ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      ) : null}
      <PortalLoginForm
        action="/api/auth/staff-login"
        next={next && next.startsWith("/staff") ? next : undefined}
        emailLabel="Work Email"
        emailPlaceholder={emailPlaceholder}
        passwordLabel="Password"
        submitLabel="Sign In"
        rememberLabel="Remember me"
        forgotHref="/forgot-password"
        forgotLabel="Forgot password?"
        helperText="Use the credentials assigned by HR."
      />
      <p className="mt-5 text-center text-sm font-medium text-slate-500">
        Department workspace?{" "}
        <a href="/login" className="font-bold text-blue-700 hover:text-blue-800">
          Sign in here
        </a>
      </p>
    </AuthShell>
  );
}
