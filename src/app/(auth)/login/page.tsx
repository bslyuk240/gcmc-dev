import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHelpLine, AuthShell } from "@/components/auth/auth-shell";
import { PortalLoginForm } from "@/components/auth/portal-login-form";
import { redirectToSessionHome } from "@/lib/auth/session";
import { getPlatformProfile } from "@/lib/server/platformAccess";
import { getTenantBrandingOrNull } from "@/lib/tenant/get-branding";

const errorMessages: Record<string, string> = {
  invalid:       "Invalid email or password.",
  credentials:   "Incorrect email or password. Please try again.",
  profile:       "Your staff profile could not be found. Contact HR.",
  inactive:      "Your account has been deactivated. Contact HR.",
  configuration: "Authentication service is not configured. Contact the system administrator.",
  suspended:     "This hospital account is suspended. Contact your administrator.",
  tenant:        "Could not resolve your hospital tenant. Check the URL and try again.",
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

  const platformProfile = await getPlatformProfile();
  if (platformProfile) {
    redirect("/platform/dashboard");
  }

  const branding = await getTenantBrandingOrNull();
  const errorMsg = error ? (errorMessages[error] ?? "Something went wrong. Please try again.") : null;
  const successMsg = message ? (successMessages[message] ?? null) : null;

  return (
    <AuthShell
      brandName="Hospital Management System"
      brandSubtitle={branding?.name}
      title="Welcome back"
      subtitle="Sign in to continue to your account"
      footer={<AuthHelpLine />}
    >
      {successMsg ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMsg}
        </div>
      ) : null}
      {errorMsg ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      ) : null}
      <PortalLoginForm
        action="/api/auth/login"
        next={next}
        emailLabel="Email or Username"
        emailPlaceholder="Enter your email or username"
        passwordLabel="Password"
        submitLabel="Sign In"
        rememberLabel="Remember me"
        forgotHref="/forgot-password"
        forgotLabel="Forgot password?"
      />
      <p className="mt-5 text-center text-sm font-medium text-slate-500">
        Staff self-service portal?{" "}
        <Link href="/staff/login" className="font-bold text-blue-700 hover:text-blue-800">
          Sign in here
        </Link>
      </p>
    </AuthShell>
  );
}
