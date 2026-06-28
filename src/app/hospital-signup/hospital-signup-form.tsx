"use client";

import { useState } from "react";
import { submitHospitalSignupAction } from "@/server/actions/platform/approvals";

const PLANS = [
  { value: "starter",    label: "Starter",    price: "NGN 50,000/mo",  desc: "Small clinic, up to 10 staff" },
  { value: "standard",   label: "Standard",   price: "NGN 150,000/mo", desc: "Mid-size hospital, up to 50 staff" },
  { value: "enterprise", label: "Enterprise", price: "NGN 500,000/mo", desc: "Large hospital, unlimited staff" },
];

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.02)] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

const labelClass = "block text-xs font-black text-[#061849]";
const legendClass = "text-xs font-black uppercase tracking-[0.16em] text-slate-400";

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function HospitalSignupForm() {
  const [hospitalName, setHospitalName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortName, setShortName] = useState("");
  const [plan, setPlan] = useState("standard");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleNameChange(v: string) {
    setHospitalName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await submitHospitalSignupAction({
      hospital_name: hospitalName,
      slug,
      short_name: shortName || undefined,
      plan,
      contact_email: contactEmail,
      contact_phone: phone || undefined,
      address: address || undefined,
      owner_name: ownerName,
      owner_email: ownerEmail,
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 py-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl font-black text-emerald-600">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-black text-[#061849]">Registration submitted</h2>
        <p className="mx-auto max-w-md text-sm font-medium leading-6 text-slate-500">
          We&apos;ve received your registration request for <span className="font-bold text-slate-800">{hospitalName}</span>.
          Our team will review it and reach out to <span className="font-bold text-slate-800">{ownerEmail}</span> within 1-2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      <fieldset className="space-y-4">
        <legend className={legendClass}>Hospital identity</legend>
        <div>
          <label className={labelClass}>Hospital name <span className="text-red-400">*</span></label>
          <input
            required
            value={hospitalName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. General City Medical Centre"
            className={fieldClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>URL slug <span className="text-red-400">*</span></label>
            <input
              required
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
              placeholder="gcmc"
              pattern="^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]$"
              className={fieldClass}
            />
            <p className="mt-1.5 text-xs font-medium text-slate-400">Lowercase letters, numbers, hyphens</p>
          </div>
          <div>
            <label className={labelClass}>Short name</label>
            <input
              value={shortName}
              onChange={(e) => setShortName(e.target.value.slice(0, 20))}
              placeholder="GCMC"
              maxLength={20}
              className={fieldClass}
            />
            <p className="mt-1.5 text-xs font-medium text-slate-400">Abbreviation, max 20 chars</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legendClass}>Plan</legend>
        <div className="grid gap-2">
          {PLANS.map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition ${
                plan === p.value
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="plan"
                  value={p.value}
                  checked={plan === p.value}
                  onChange={() => setPlan(p.value)}
                  className="h-4 w-4 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-black text-[#061849]">{p.label}</p>
                  <p className="text-xs font-medium text-slate-500">{p.desc}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-black text-blue-700">{p.price}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={legendClass}>Hospital contact</legend>
        <div>
          <label className={labelClass}>Hospital email <span className="text-red-400">*</span></label>
          <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="info@hospital.ng" className={fieldClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Phone number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1 Hospital Road, Lagos" className={fieldClass} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={legendClass}>Administrator account</legend>
        <p className="text-xs font-medium text-slate-500">This person will receive login credentials for the hospital admin account.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Full name <span className="text-red-400">*</span></label>
            <input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Dr. Jane Smith" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Email <span className="text-red-400">*</span></label>
            <input required type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="admin@hospital.ng" className={fieldClass} />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(37,99,235,0.25)] transition hover:brightness-105 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {saving ? "Submitting..." : "Submit registration request"}
      </button>
    </form>
  );
}
