"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Hospital, HospitalStatus } from "@/lib/tenant/types";
import type { HospitalSubscription } from "@/lib/platform/types";
import { updatePlatformHospitalStatusAction } from "@/server/actions/platform/hospitals";
import { enterHospitalPortalAction } from "@/server/actions/platform/enter-portal";
import { formatNairaFromKobo, PLAN_MONTHLY_KOBO } from "@/lib/platform/pricing";
import { HOSPITAL_PORTALS } from "@/lib/platform/portals";
import {
  Card,
  PageHeader,
  PlanBadge,
  StatusBadge,
  formatDate,
  platformBtnAccentOutline,
  platformBtnMuted,
} from "@/components/platform/page-shell";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="break-all text-right text-sm font-medium text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

export function HospitalManageClient({
  hospital: initial,
  subscription,
}: {
  hospital: Hospital;
  subscription: HospitalSubscription | null;
}) {
  const [hospital, setHospital] = useState(initial);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enteringPortal, setEnteringPortal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canEnterPortals = hospital.status === "active" || hospital.status === "provisioning";
  const monthlyMrr = PLAN_MONTHLY_KOBO[hospital.plan] ?? 0;

  async function setStatus(status: HospitalStatus) {
    if (status === "suspended" && !confirm(`Suspend ${hospital.name}? All active sessions will be revoked.`)) {
      return;
    }
    setStatusSaving(true);
    setError(null);
    const result = await updatePlatformHospitalStatusAction(hospital.id, status);
    setStatusSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setHospital(result.data);
  }

  function handleEnterPortal(portalKey: string) {
    setEnteringPortal(portalKey);
    setError(null);
    startTransition(async () => {
      const result = await enterHospitalPortalAction(hospital.id, portalKey);
      if (!result.success) {
        setError(result.error);
        setEnteringPortal(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/platform/hospitals"
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← All hospitals
        </Link>
        <div className="mt-3">
          <PageHeader
            title={hospital.name}
            subtitle={`${hospital.slug} · onboarded via signup & approvals`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {subscription ? <StatusBadge status={subscription.status} /> : null}
                <StatusBadge status={hospital.status} />
                <PlanBadge plan={hospital.plan} />
              </div>
            }
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="text-sm font-bold text-slate-800">Enter hospital portals</h2>
        <p className="mt-1 text-sm text-slate-500">
          Open any department or staff portal for this tenant using your platform session.
        </p>

        {!canEnterPortals ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Portals are unavailable while this hospital is suspended. Reactivate it first.
          </p>
        ) : hospital.status === "provisioning" ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This hospital is still provisioning — portals work for setup and verification.
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {HOSPITAL_PORTALS.map((portal) => {
            const busy = isPending && enteringPortal === portal.key;
            return (
              <button
                key={portal.key}
                type="button"
                disabled={!canEnterPortals || isPending}
                onClick={() => handleEnterPortal(portal.key)}
                className="group rounded-none border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${portal.chipClass}`}
                >
                  {portal.portalType === "staff" ? "Staff portal" : "Management"}
                </span>
                <p className="mt-3 font-semibold text-slate-800 group-hover:text-slate-900">
                  {portal.label}
                </p>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{portal.description}</p>
                <p className="mt-3 text-xs font-semibold text-slate-700">
                  {busy ? "Opening…" : "Enter →"}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Tenant details
          </h2>
          <dl className="mt-2">
            <DetailRow label="ID" value={<span className="font-mono text-xs">{hospital.id}</span>} />
            <DetailRow label="Slug" value={hospital.slug} />
            <DetailRow label="Short name" value={hospital.short_name} />
            <DetailRow label="Plan" value={<PlanBadge plan={hospital.plan} />} />
            <DetailRow label="Status" value={<StatusBadge status={hospital.status} />} />
            <DetailRow label="Contact email" value={hospital.settings.email} />
            <DetailRow label="Phone" value={hospital.settings.phone} />
            <DetailRow label="Address" value={hospital.settings.address} />
            <DetailRow label="Timezone" value={hospital.settings.timezone} />
            <DetailRow label="Joined" value={formatDate(hospital.created_at)} />
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Plan & billing
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Subscriptions, invoices, and plan pricing are managed from the platform billing area.
          </p>
          <dl className="mt-4">
            <DetailRow label="Current plan" value={<PlanBadge plan={hospital.plan} />} />
            <DetailRow
              label="Monthly MRR"
              value={hospital.status === "active" ? formatNairaFromKobo(monthlyMrr) : "—"}
            />
            {subscription ? (
              <>
                <DetailRow label="Subscription" value={<StatusBadge status={subscription.status} />} />
                <DetailRow
                  label="Billing cycle"
                  value={<span className="capitalize">{subscription.billing_cycle}</span>}
                />
                <DetailRow label="Period end" value={formatDate(subscription.current_period_end)} />
              </>
            ) : (
              <DetailRow label="Subscription record" value="Managed in billing" />
            )}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <Link
              href="/platform/billing"
              className={platformBtnAccentOutline}
            >
              Subscriptions & billing →
            </Link>
            <Link
              href="/platform/settings"
              className={platformBtnMuted}
            >
              Plans & pricing
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-bold text-slate-800">Status controls</h2>
        <p className="mt-1 text-sm text-slate-500">
          Suspending revokes all active HMS sessions for this hospital.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {hospital.status !== "active" ? (
            <Button type="button" disabled={statusSaving} onClick={() => setStatus("active")}>
              Activate
            </Button>
          ) : null}
          {hospital.status !== "suspended" ? (
            <Button type="button" variant="outline" disabled={statusSaving} onClick={() => setStatus("suspended")}>
              Suspend
            </Button>
          ) : null}
          {hospital.status !== "provisioning" ? (
            <Button type="button" variant="ghost" disabled={statusSaving} onClick={() => setStatus("provisioning")}>
              Mark provisioning
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
