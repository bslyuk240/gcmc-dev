import Link from "next/link";
import { forgotPasswordAction } from "@/server/actions/auth/forgot-password";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <div className="w-full max-w-md">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
              <p className="text-sm text-slate-500">
                If that email is registered, a password reset link has been sent. Check your inbox and follow the link within 1 hour.
              </p>
              <Link href="/login" className="mt-2 text-sm font-medium text-[var(--accent-foreground)] hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your work email and we&apos;ll send you a link to reset your password.
          </p>

          {error === "configuration" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              Authentication service is not configured. Contact IT.
            </div>
          )}

          <form action={forgotPasswordAction} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                placeholder="you@gcmc.local"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:ring-2 focus:ring-[var(--accent)]/30"
            >
              Send Reset Link
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
