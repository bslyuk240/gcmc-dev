import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          <form className="mt-6 space-y-4">
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
                placeholder="you@hospital.local"
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
