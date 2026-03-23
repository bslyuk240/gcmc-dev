"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type PortalLoginFormProps = {
  action: string;
  next?: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  submitLabel: string;
  rememberLabel: string;
  forgotHref: string;
  forgotLabel: string;
  helperText?: string;
};

export function PortalLoginForm({
  action,
  next,
  emailLabel,
  emailPlaceholder,
  passwordLabel,
  submitLabel,
  rememberLabel,
  forgotHref,
  forgotLabel,
  helperText,
}: PortalLoginFormProps) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const errorBase = action.includes("/staff-login") ? "/staff/login" : "/login";

    setPending(true);
    try {
      const response = await fetch(action, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "x-portal-login": "1",
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorCode = payload?.error ? String(payload.error) : "credentials";
        window.location.assign(`${errorBase}?error=${encodeURIComponent(errorCode)}`);
        return;
      }

      if (payload?.redirectTo) {
        window.location.assign(String(payload.redirectTo));
        return;
      }

      form.submit();
    } catch {
      form.submit();
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={action} method="post" onSubmit={handleSubmit} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          {emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder={emailPlaceholder}
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="password" className="block font-medium text-slate-700">
            {passwordLabel}
          </label>
          <Link href={forgotHref} className="font-medium text-[var(--accent-foreground)] hover:underline">
            {forgotLabel}
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" name="remember" className="rounded border-[var(--border)]" />
          {rememberLabel}
        </label>
        {helperText ? <p className="text-xs text-slate-400">{helperText}</p> : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:ring-2 focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in..." : submitLabel}
      </button>
    </form>
  );
}
