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
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const errorBase = action.includes("/staff-login")
      ? "/staff/login"
      : "/login";

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
    <form action={action} method="post" onSubmit={handleSubmit} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label htmlFor="email" className="block text-xs font-black text-[#061849]">
          {emailLabel}
        </label>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
          <svg className="h-5 w-5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 21a8 8 0 1 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            required
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            placeholder={emailPlaceholder}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="password" className="block text-xs font-black text-[#061849]">
            {passwordLabel}
          </label>
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
          <svg className="h-5 w-5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m4 4 16 16M9.5 9.5A3.5 3.5 0 0 0 14.5 14.5M7.6 7.6C5.3 9 3.8 11.1 3 12c1.7 2 5 5 9 5 1.3 0 2.5-.3 3.6-.8M12 7c4 0 7.3 3 9 5-.5.6-1.3 1.5-2.2 2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" stroke="currentColor" strokeWidth="2" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" name="remember" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          {rememberLabel}
        </label>
        <Link href={forgotHref} className="text-xs font-bold text-blue-700 hover:text-blue-800">
          {forgotLabel}
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(37,99,235,0.25)] transition hover:brightness-105 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pending ? "Signing in..." : submitLabel}
      </button>

      <div className="flex items-center gap-4 pt-1">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {helperText ? <p className="text-center text-xs font-medium text-slate-500">{helperText}</p> : null}
    </form>
  );
}
