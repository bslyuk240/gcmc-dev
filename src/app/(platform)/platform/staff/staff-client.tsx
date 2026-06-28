"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createPlatformStaffAction, togglePlatformStaffActiveAction } from "@/server/actions/platform/staff";
import { Avatar, Card, platformInputClass, platformBtnGhostSm } from "@/components/platform/page-shell";

type StaffRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean | null;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Super Admin",
  platform_staff: "Staff",
};

const ROLE_STYLES: Record<string, string> = {
  platform_admin: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  platform_staff: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

export function StaffClient({
  staff: initial,
  error: serverError,
}: {
  staff: StaffRow[];
  error: string | null;
}) {
  const [staff, setStaff] = useState(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"platform_admin" | "platform_staff">("platform_staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(serverError);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setTempPassword(null);
    const result = await createPlatformStaffAction({ full_name: name, email, role });
    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setTempPassword(result.data.tempPassword);
    setName(""); setEmail("");
    setStaff((prev) => [
      ...prev,
      { id: crypto.randomUUID(), full_name: name, email, role, is_active: true, created_at: new Date().toISOString() },
    ]);
  }

  async function toggleActive(id: string, currentlyActive: boolean | null) {
    setTogglingId(id);
    const result = await togglePlatformStaffActiveAction(id, !currentlyActive);
    setTogglingId(null);
    if (!result.success) { setError(result.error); return; }
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !currentlyActive } : s));
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Active staff ({staff.length})
        </h2>
        <Card className="divide-y divide-slate-100">
          {staff.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={s.full_name ?? s.email ?? "?"} />
                <div>
                  <p className="font-semibold text-slate-800">{s.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-500">{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLES[s.role] ?? ""}`}>
                  {ROLE_LABELS[s.role] ?? s.role}
                </span>
                {s.is_active === false && (
                  <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                    Inactive
                  </span>
                )}
                <button
                  type="button"
                  disabled={togglingId === s.id}
                  onClick={() => toggleActive(s.id, s.is_active)}
                  className={platformBtnGhostSm}
                >
                  {togglingId === s.id ? "…" : s.is_active !== false ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No platform staff yet.</p>
          )}
        </Card>
      </section>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-800">Add platform staff</h2>
        <p className="mt-1 text-sm text-slate-500">
          Creates a new account with platform access. Temporary password shown once.
        </p>

        {tempPassword && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-sm font-semibold text-emerald-800">Account created — copy this password now:</p>
            <p className="mt-2 font-mono text-lg font-bold text-emerald-900 select-all">{tempPassword}</p>
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={platformInputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={platformInputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={platformInputClass}>
              <option value="platform_staff">Staff — restricted access</option>
              <option value="platform_admin">Super Admin — full access</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Creating…" : "Create account"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
