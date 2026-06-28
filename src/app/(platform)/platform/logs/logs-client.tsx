"use client";

import { Fragment, useState } from "react";
import { Card, platformBtnOutlineSm } from "@/components/platform/page-shell";

type LogRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: string | null;
  actor_id: string | null;
  actor_name: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  hospital_slug: string | null;
  portal: string;
  department: string | null;
  ip_address: string | null;
  created_at: string;
};

// ─── Plain-text description generator ────────────────────────────────────────
function describeAction(log: LogRow): { headline: string; detail: string } {
  const actor = log.actor_name ?? "Someone";
  const portalLabel =
    log.portal === "platform"
      ? "Platform admin"
      : log.portal === "management"
        ? "Management portal (/app)"
        : log.portal === "staff"
          ? "Staff portal (/staff)"
          : "Hospital system";
  const hospital = log.hospital_name ?? log.hospital_slug ?? "a hospital";
  const p = (() => {
    try { return log.payload ? JSON.parse(log.payload) : {}; } catch { return {}; }
  })();
  const id = log.entity_id ? log.entity_id.slice(0, 8) + "…" : "";

  if (log.action.startsWith("insert.") || log.action.startsWith("update.") || log.action.startsWith("delete.")) {
    const [op, table] = log.action.split(".");
    const opLabel = op === "insert" ? "created" : op === "update" ? "updated" : "deleted";
    return {
      headline: `${actor} ${opLabel} ${table?.replace(/_/g, " ") ?? "a record"} at ${hospital}`,
      detail: `${portalLabel} · ${log.department ?? "—"} dept. Database ${op} on ${table}${id ? ` (${id})` : ""}.`,
    };
  }

  switch (log.action) {
    case "auth.management.login":
      return {
        headline: `${actor} signed in to the management portal`,
        detail: `${hospital} · ${String(p.role ?? "staff").replace(/_/g, " ")}${log.ip_address ? ` from ${log.ip_address}` : ""}.`,
      };
    case "auth.staff.login":
      return {
        headline: `${actor} signed in to the staff portal`,
        detail: `${hospital} · staff self-service${log.ip_address ? ` from ${log.ip_address}` : ""}.`,
      };
    case "auth.management.logout":
    case "auth.staff.logout":
      return {
        headline: `${actor} signed out`,
        detail: `${portalLabel} session ended at ${hospital}.`,
      };
    case "hospital.settings.update":
      return {
        headline: `${actor} updated hospital settings`,
        detail: `${hospital} branding or contact settings were changed (${(p.fields as string[] | undefined)?.join(", ") ?? "—"}).`,
      };
    case "hospital.create":
      return {
        headline: `${actor} created a new hospital`,
        detail: `A new hospital was registered on the platform with slug "${p.slug ?? "—"}" and name "${p.name ?? "—"}". The tenant was placed in provisioning status pending admin account setup.`,
      };
    case "hospital.activate":
      return {
        headline: `${actor} activated a hospital`,
        detail: `Hospital ${id} was set to active status. Staff at this hospital can now log in and use the system.`,
      };
    case "hospital.suspend":
      return {
        headline: `${actor} suspended a hospital`,
        detail: `Hospital ${id} was suspended. All active staff sessions were immediately revoked — no one at that hospital can log in until the hospital is reactivated.`,
      };
    case "hospital.provision_admin":
      return {
        headline: `${actor} provisioned an admin account`,
        detail: `A new administrator account was created for hospital ${id}. The account was set up with a temporary password and the must_change_password flag enabled. If the hospital was in provisioning status, it was automatically activated.`,
      };
    case "hospital.onboard_approve":
      return {
        headline: `${actor} approved a hospital signup`,
        detail: `A hospital registration request was reviewed and approved. The hospital "${p.slug ?? id}" was provisioned with an admin account for "${p.owner_email ?? "the owner"}". The hospital is now active.`,
      };
    case "hospital.signup_rejected":
      return {
        headline: `${actor} rejected a hospital signup`,
        detail: p.reason
          ? `The signup request ${id} was rejected. Reason given: "${p.reason}".`
          : `The signup request ${id} was rejected without a stated reason.`,
      };
    case "hospital.update":
      return {
        headline: `${actor} updated hospital details`,
        detail: `Hospital ${id} was updated. Changed fields: ${Object.keys(p).join(", ") || "—"}.`,
      };
    case "invoice.create":
      return {
        headline: `${actor} created an invoice`,
        detail: `A new invoice was generated for a hospital tenant. The amount is computed server-side based on the hospital's current plan.`,
      };
    case "invoice.send":
      return {
        headline: `${actor} sent an invoice`,
        detail: `Invoice ${id} was marked as sent and is now awaiting payment from the hospital.`,
      };
    case "invoice.paid":
      return {
        headline: `${actor} recorded a payment`,
        detail: `Invoice ${id} was marked as paid. ${p.method ? `Payment method: ${String(p.method).replace("_", " ")}.` : ""} ${p.reference ? `Reference: ${p.reference}.` : ""}`,
      };
    case "invoice.void":
      return {
        headline: `${actor} voided an invoice`,
        detail: `Invoice ${id} was voided and can no longer be paid or modified. This is typically done for duplicate or erroneous invoices.`,
      };
    case "settings.update":
      return {
        headline: `${actor} updated platform settings`,
        detail: `Platform configuration was changed — section: "${p.section ?? "general"}". These changes take effect immediately for all tenants.`,
      };
    case "platform.staff_created":
      return {
        headline: `${actor} added a platform staff member`,
        detail: `A new platform admin account was created for "${p.email ?? "—"}" with role "${p.role ?? "—"}". They must change their password on first login.`,
      };
    case "platform.staff_updated":
      return {
        headline: `${actor} updated a platform staff account`,
        detail: `Platform staff account ${id} was ${p.is_active === false ? "deactivated — they can no longer access the platform admin console" : "reactivated — they can now access the platform admin console again"}.`,
      };
    case "platform.tenant.enter":
      return {
        headline: `${actor} entered a hospital portal from the platform console`,
        detail: `Opened ${String(p.portal_label ?? p.portal ?? "—")} for "${String(p.hospital_name ?? hospital)}" (${String(p.hospital_slug ?? "—")}). ${portalLabel}${log.ip_address ? ` · ${log.ip_address}` : ""}.`,
      };
    case "subscription.create":
      return {
        headline: `${actor} created a subscription`,
        detail: `A ${p.plan ?? "—"} plan subscription was created for hospital ${id} with status "${p.status ?? "—"}" on a ${p.billing_cycle ?? "monthly"} billing cycle.`,
      };
    case "subscription.update":
      return {
        headline: `${actor} updated a subscription`,
        detail: `Subscription ${id} was updated. Changed fields: ${Object.keys(p).join(", ") || "—"}.`,
      };
    case "email.test_sent":
      return {
        headline: `${actor} sent a test email`,
        detail: `A test email was dispatched via Resend to "${p.to ?? "—"}" from "${p.from ?? "—"}" to verify the email integration is working correctly.`,
      };
    case "login":
      return {
        headline: `${actor} signed in to the platform console`,
        detail: `Platform admin login${log.ip_address ? ` from IP ${log.ip_address}` : ""}.`,
      };
    default:
      return {
        headline: `${actor} · ${log.action}`,
        detail: `${portalLabel}${log.hospital_name ? ` · ${log.hospital_name}` : ""}. ${log.payload ? `Details: ${log.payload}` : ""}`,
      };
  }
}

// ─── Action badge colours ─────────────────────────────────────────────────────
const ACTION_COLOR: Record<string, string> = {
  "hospital.create":          "bg-indigo-50 text-indigo-700",
  "hospital.activate":        "bg-emerald-50 text-emerald-700",
  "hospital.suspend":         "bg-red-50 text-red-700",
  "hospital.provision_admin": "bg-blue-50 text-blue-700",
  "hospital.onboard_approve": "bg-emerald-50 text-emerald-700",
  "hospital.signup_rejected": "bg-red-50 text-red-700",
  "hospital.update":          "bg-slate-100 text-slate-600",
  "invoice.create":           "bg-slate-100 text-slate-600",
  "invoice.send":             "bg-blue-50 text-blue-700",
  "invoice.paid":             "bg-emerald-50 text-emerald-700",
  "invoice.void":             "bg-orange-50 text-orange-700",
  "settings.update":          "bg-amber-50 text-amber-700",
  "platform.staff_created":   "bg-purple-50 text-purple-700",
  "platform.staff_updated":   "bg-purple-50 text-purple-700",
  "platform.tenant.enter":    "bg-indigo-50 text-indigo-700",
  "subscription.create":      "bg-indigo-50 text-indigo-700",
  "subscription.update":      "bg-indigo-50 text-indigo-700",
  "email.test_sent":          "bg-sky-50 text-sky-700",
  "login":                    "bg-slate-100 text-slate-500",
  "auth.management.login":    "bg-blue-50 text-blue-700",
  "auth.staff.login":         "bg-sky-50 text-sky-700",
  "auth.management.logout":   "bg-slate-100 text-slate-500",
  "auth.staff.logout":        "bg-slate-100 text-slate-500",
  "hospital.settings.update": "bg-amber-50 text-amber-700",
};

function portalBadgeClass(portal: string) {
  if (portal === "platform") return "bg-purple-50 text-purple-700";
  if (portal === "management") return "bg-blue-50 text-blue-700";
  if (portal === "staff") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-600";
}

function actionBadgeClass(action: string) {
  if (ACTION_COLOR[action]) return ACTION_COLOR[action];
  if (action.startsWith("insert.")) return "bg-emerald-50 text-emerald-700";
  if (action.startsWith("update.")) return "bg-amber-50 text-amber-700";
  if (action.startsWith("delete.")) return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function parsePayload(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== "object" || Array.isArray(obj)) return null;
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)])
    );
  } catch { return null; }
}

// ─── Expanded row detail ──────────────────────────────────────────────────────
function LogDetail({ log }: { log: LogRow }) {
  const { headline, detail } = describeAction(log);
  const payload = parsePayload(log.payload);

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 space-y-4">
      {/* Plain-text description */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">What happened</p>
        <p className="text-sm font-semibold text-slate-800">{headline}</p>
        <p className="text-sm text-slate-600 leading-relaxed">{detail}</p>
      </div>

      {/* Structured metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Event metadata</p>
          {[
            { label: "Action",      value: log.action },
            { label: "Portal",      value: log.portal },
            { label: "Hospital",    value: log.hospital_name ?? log.hospital_slug ?? "—" },
            { label: "Department",  value: log.department ?? "—" },
            { label: "Performed by", value: log.actor_name ?? "Unknown" },
            { label: "Timestamp",   value: formatTime(log.created_at) },
            { label: "IP address",  value: log.ip_address ?? "Not recorded" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3 text-sm">
              <span className="shrink-0 text-slate-500">{label}</span>
              <span className="text-right font-medium text-slate-800 break-all">{value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Entity reference</p>
          {[
            { label: "Entity type", value: log.entity_type ?? "—" },
            { label: "Entity ID",   value: log.entity_id ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3 text-sm">
              <span className="shrink-0 text-slate-500">{label}</span>
              <span className="text-right font-mono text-xs text-slate-600 break-all">{value}</span>
            </div>
          ))}

          {payload && Object.keys(payload).length > 0 && (
            <>
              <p className="pt-2 text-xs font-bold uppercase tracking-wide text-slate-400">Payload</p>
              {Object.entries(payload).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 text-sm">
                  <span className="shrink-0 font-mono text-xs text-slate-500">{k}</span>
                  <span className="text-right font-mono text-xs text-slate-700 break-all">{v}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────
export function LogsClient({ logs }: { logs: LogRow[] }) {
  const [search, setSearch]           = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());

  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort();
  const uniquePortals = [...new Set(logs.map((l) => l.portal))].sort();

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.action.toLowerCase().includes(q) ||
      (l.actor_name ?? "").toLowerCase().includes(q) ||
      (l.hospital_name ?? "").toLowerCase().includes(q) ||
      (l.hospital_slug ?? "").toLowerCase().includes(q) ||
      (l.entity_type ?? "").toLowerCase().includes(q) ||
      (l.entity_id ?? "").toLowerCase().includes(q) ||
      (l.payload ?? "").toLowerCase().includes(q);
    return matchSearch &&
      (actionFilter === "all" || l.action === actionFilter) &&
      (portalFilter === "all" || l.portal === portalFilter);
  });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const csv = [
      "Time,Action,Portal,Hospital,Actor,Department,Entity Type,Entity ID,IP,Payload",
      ...filtered.map((r) =>
        `"${formatTime(r.created_at)}","${r.action}","${r.portal}","${r.hospital_name ?? ""}","${r.actor_name ?? ""}","${r.department ?? ""}","${r.entity_type ?? ""}","${r.entity_id ?? ""}","${r.ip_address ?? ""}","${(r.payload ?? "").replace(/"/g, "'")}"`
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <Card>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs…"
          className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <select value={portalFilter} onChange={(e) => setPortalFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400">
          <option value="all">All Portals</option>
          {uniquePortals.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400">
          <option value="all">All Actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="self-center text-xs text-slate-400">{filtered.length} entries</span>
        <button type="button" onClick={exportCsv}
          className={platformBtnOutlineSm}>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="w-8 px-3 py-3" />
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Portal</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hospital</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Performed by</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entity</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => toggle(r.id)}
                    className={`cursor-pointer border-b border-slate-100 transition-colors ${isOpen ? "bg-indigo-50/40" : "hover:bg-slate-50/50"}`}
                  >
                    <td className="px-3 py-3.5 text-center">
                      <svg
                        className={`mx-auto h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{formatTime(r.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${portalBadgeClass(r.portal)}`}>
                        {r.portal}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.hospital_name ? (
                        <div>
                          <span className="font-medium text-slate-700">{r.hospital_name}</span>
                          {r.hospital_slug ? (
                            <div className="text-xs text-slate-400">{r.hospital_slug}</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionBadgeClass(r.action)}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-700">{r.actor_name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.entity_type
                        ? <span className="capitalize text-slate-600">{r.entity_type.replace(/_/g, " ")}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{r.ip_address ?? "—"}</td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-slate-100">
                      <td colSpan={8} className="p-0">
                        <LogDetail log={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">
                  No audit events yet. Hospital activity and platform actions will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
