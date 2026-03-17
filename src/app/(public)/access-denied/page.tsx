import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <section className="surface mx-auto max-w-2xl rounded-[34px] p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
        Access denied
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
        Your current role or department does not allow this action.
      </h2>
      <p className="page-copy mt-5 text-base leading-8">
        Access checks should be enforced in the UI, on the server, and in
        database policy. This screen is the safe fallback when a request is blocked.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
