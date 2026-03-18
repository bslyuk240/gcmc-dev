import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordAction } from "@/server/actions/auth/reset-password";

const errorMessages: Record<string, string> = {
  "too-short":     "Password must be at least 8 characters.",
  "mismatch":      "Passwords do not match.",
  "failed":        "Failed to update password. Please try again.",
  "configuration": "Authentication service not configured. Contact IT.",
  "expired-link":  "Reset link is invalid or expired. Request a new one.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; message?: string }>;
}) {
  const { code, error } = await searchParams;

  // No code in URL — the link is broken or already used
  if (!code) redirect("/forgot-password?error=invalid-link");

  const errorMsg = error ? (errorMessages[error] ?? "Something went wrong. Please try again.") : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Reset Your Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter a new password for your account.
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMsg}{" "}
              {error === "expired-link" && (
                <Link href="/forgot-password" className="underline font-semibold">Request a new link</Link>
              )}
            </div>
          )}

          <form action={resetPasswordAction} className="mt-6 space-y-4">
            <input type="hidden" name="code" value={code} />
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
              Reset Password
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-[var(--accent-foreground)] hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
