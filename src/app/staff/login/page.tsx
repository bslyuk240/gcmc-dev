import { loginStaffPortalAction } from "@/server/actions/auth/login-staff-portal";
import { getStaffPortalSession } from "@/lib/auth/session";

export const metadata = {
  title: "Staff Login — GCMC Staff Portal",
};

async function alreadyLoggedIn(): Promise<boolean> {
  const session = await getStaffPortalSession();
  return session !== null;
}

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  const isLoggedIn = await alreadyLoggedIn();

  const errorMessages: Record<string, string> = {
    invalid:     "Invalid email or password.",
    credentials: "Incorrect email or password. Please try again.",
    profile:     "Your staff profile could not be found. Contact HR.",
    inactive:    "Your account has been deactivated. Contact HR.",
  };
  const errorMsg = error ? (errorMessages[error] ?? "Something went wrong. Please try again.") : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo / hospital header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900">Staff Self-Service Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Group Christian Medical Centre</p>
        </div>

        {/* Already signed in banner */}
        {isLoggedIn && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">You&apos;re already signed in.</p>
            <a href="/staff/dashboard" className="mt-1 block text-sm text-green-700 underline">
              Continue to your dashboard →
            </a>
          </div>
        )}

        {/* Login card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* Error message */}
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <form action={loginStaffPortalAction} className="space-y-4">
            {/* Hidden fields */}
            {next && next.startsWith("/staff") && (
              <input type="hidden" name="next" value={next} />
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue="sarah.jenkins@gcmc.local"
                placeholder="you@gcmc.local"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                defaultValue="password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                name="remember"
                className="rounded border-slate-300 accent-indigo-600"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
            >
              Sign In to Staff Portal
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-5 space-y-2 text-center text-xs text-slate-400">
          <p>
            Accessing the work portal?{" "}
            <a href="/login" className="font-semibold text-indigo-600 hover:underline">
              Department Login →
            </a>
          </p>
          <p>
            Use the credentials assigned by HR. Same login works in both portals.
          </p>
        </div>
      </div>
    </div>
  );
}
