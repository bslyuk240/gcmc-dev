import Link from "next/link";
import { appConfig } from "@/lib/config/app";

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)] sm:p-12 md:p-16">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-foreground)]">
            Welcome to {appConfig.appName}
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Quality healthcare, close to you
          </h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            We provide comprehensive medical care, from outpatient consultations and
            specialist referrals to diagnostics and pharmacy services. Book an
            appointment or verify your records online.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/appointments"
              className="rounded-[var(--radius-button)] bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              Book an appointment
            </Link>
            <Link
              href="/patient-verify"
              className="rounded-[var(--radius-button)] border-2 border-[var(--border)] bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent-foreground)]"
            >
              Patient verification
            </Link>
          </div>
        </div>
      </section>

      {/* Patient & consultation services */}
      <section>
        <h3 className="text-2xl font-bold text-slate-900">Patient services</h3>
        <p className="mt-2 text-slate-600">
          Manage your visit and records from one place.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/appointments"
            className="group rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] transition hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-foreground)]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <h4 className="mt-4 font-semibold text-slate-900 group-hover:text-[var(--accent-foreground)]">
              Book appointment
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Request an outpatient or follow-up appointment online.
            </p>
          </Link>
          <Link
            href="/patient-verify"
            className="group rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] transition hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-foreground)]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <h4 className="mt-4 font-semibold text-slate-900 group-hover:text-[var(--accent-foreground)]">
              Patient verification
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Verify your identity and view your visit status.
            </p>
          </Link>
          <Link
            href="/contact"
            className="group rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] transition hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-foreground)]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <h4 className="mt-4 font-semibold text-slate-900 group-hover:text-[var(--accent-foreground)]">
              Contact us
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Enquiries, feedback, or support.
            </p>
          </Link>
        </div>
      </section>

    </div>
  );
}
