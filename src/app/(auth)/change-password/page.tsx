import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deserialiseSession } from "@/lib/auth/session";
import { hmsPendingSessionCookieName } from "@/lib/auth/constants";
import { changePasswordAction } from "@/server/actions/auth/change-password";

const errorMessages: Record<string, string> = {
  "too-short":     "Password must be at least 8 characters.",
  "mismatch":      "Passwords do not match.",
  "failed":        "Failed to update password. Please try again.",
  "configuration": "Authentication service is not configured. Contact IT.",
};

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await cookies();
  const pendingRaw = store.get(hmsPendingSessionCookieName)?.value;
  if (!pendingRaw) redirect("/login");

  const session = await deserialiseSession(pendingRaw);
  if (!session) redirect("/login");

  const { error } = await searchParams;
  const errorMsg = error ? (errorMessages[error] ?? "Something went wrong. Please try again.") : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="mb-5">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              First Login — Password Change Required
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set Your Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome, <strong>{session.full_name}</strong>. Your account was created by HR with a temporary
            password. Please set a new password to continue.
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <form action={changePasswordAction} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-700">
                Confirm New Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="Repeat new password"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:ring-2 focus:ring-[var(--accent)]/30"
            >
              Set Password & Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
