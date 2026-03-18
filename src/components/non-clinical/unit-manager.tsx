"use client";

import { useCallback, useEffect, useState } from "react";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import {
  fetchNonClinicalUnits,
  addNonClinicalUnit,
  deleteNonClinicalUnit,
  fetchNcUnitHODs,
  setNcUnitHOD,
  type NcUnit,
  type NcUnitHOD,
} from "@/lib/supabase/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnitManager() {
  const session = useHMSSession();
  const { staff } = useHRStore();

  const [units, setUnits]     = useState<NcUnit[]>([]);
  const [hods, setHods]       = useState<NcUnitHOD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Add-unit form ──────────────────────────────────────────────────────────
  const [adding, setAdding]       = useState(false);
  const [newName, setNewName]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [addError, setAddError]   = useState<string | null>(null);

  // ── HOD assignment modal ───────────────────────────────────────────────────
  const [hodModal, setHodModal]       = useState<NcUnit | null>(null);
  const [hodSearch, setHodSearch]     = useState("");
  const [selectedHod, setSelectedHod] = useState("");
  const [hodSaving, setHodSaving]     = useState(false);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<NcUnit | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const ncStaff = staff.filter((s) => s.department === "Non-Clinical Staff");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedUnits, fetchedHods] = await Promise.all([
        fetchNonClinicalUnits(),
        fetchNcUnitHODs(),
      ]);
      setUnits(fetchedUnits);
      setHods(fetchedHods);
    } catch {
      setError("Could not load units. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  // ── Add unit ───────────────────────────────────────────────────────────────
  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (units.some((u) => u.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddError("A unit with that name already exists.");
      return;
    }
    setSaving(true);
    setAddError(null);
    const created = await addNonClinicalUnit(trimmed, session?.full_name);
    if (!created) {
      setAddError("Failed to save unit. Please try again.");
    } else {
      setUnits((prev) => [...prev, created]);
      setNewName("");
      setAdding(false);
    }
    setSaving(false);
  }

  // ── Delete unit ────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteNonClinicalUnit(deleteTarget.id);
    setUnits((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setHods((prev) => prev.filter((h) => h.unitName !== deleteTarget.name));
    setDeleteTarget(null);
    setDeleting(false);
  }

  // ── Assign HOD ─────────────────────────────────────────────────────────────
  async function handleAssignHod() {
    if (!hodModal || !selectedHod) return;
    const member = ncStaff.find((s) => s.id === selectedHod);
    if (!member || !session) return;
    setHodSaving(true);
    await setNcUnitHOD({
      unitName:   hodModal.name,
      staffId:    member.id,
      staffName:  member.name,
      assignedBy: session.full_name,
    });
    setHods((prev) => {
      const next = prev.filter((h) => h.unitName !== hodModal.name);
      next.push({
        unitName:   hodModal.name,
        staffId:    member.id,
        staffName:  member.name,
        assignedOn: new Date().toISOString().slice(0, 10),
      });
      return next;
    });
    setHodModal(null);
    setSelectedHod("");
    setHodSearch("");
    setHodSaving(false);
  }

  const filteredHodCandidates = ncStaff.filter(
    (s) =>
      s.status === "Active" &&
      (hodSearch === "" ||
        s.name.toLowerCase().includes(hodSearch.toLowerCase()) ||
        s.role.toLowerCase().includes(hodSearch.toLowerCase())),
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Units</h2>
          <p className="text-xs text-slate-500">{units.length} unit{units.length !== 1 ? "s" : ""} · {ncStaff.length} non-clinical staff total</p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setNewName(""); setAddError(null); }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2.5" strokeLinecap="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Unit
          </button>
        )}
      </div>

      {/* Add-unit inline form */}
      {adding && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">New Unit Name</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
              placeholder="e.g. Laundry, Kitchen, Porters…"
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <button
              type="button"
              disabled={!newName.trim() || saving}
              onClick={() => void handleAdd()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setAddError(null); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          {addError && <p className="mt-1.5 text-xs font-medium text-red-600">{addError}</p>}
        </div>
      )}

      {/* Unit cards */}
      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-slate-500">No units yet</p>
          <p className="mt-1 text-xs text-slate-400">Click "Add Unit" to create the first unit.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => {
            const hod = hods.find((h) => h.unitName === unit.name);
            const unitStaff = ncStaff.filter((s) => s.unit === unit.name);
            const activeCount = unitStaff.filter((s) => s.status === "Active").length;
            return (
              <div
                key={unit.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                {/* Unit header */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-50">
                      <svg className="h-4.5 w-4.5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{unit.name}</p>
                      <p className="text-xs text-slate-400">{activeCount}/{unitStaff.length} active</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Delete unit"
                    onClick={() => setDeleteTarget(unit)}
                    className="ml-1 rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* HOD section */}
                <div className="mt-auto border-t border-slate-100 pt-3">
                  {hod ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-100 text-xs font-bold text-lime-700">
                          {getInitials(hod.staffName)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{hod.staffName}</p>
                          <p className="text-[10px] text-slate-400">Unit Head · since {hod.assignedOn}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setHodModal(unit); setSelectedHod(hod.staffId); setHodSearch(""); }}
                        className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setHodModal(unit); setSelectedHod(""); setHodSearch(""); }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2.5" strokeLinecap="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Assign Unit Head
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HOD Assignment Modal ──────────────────────────────────────────── */}
      {hodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Assign Unit Head — {hodModal.name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Select an active non-clinical staff member to lead this unit.
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <input
                type="text"
                placeholder="Search staff by name or role…"
                value={hodSearch}
                onChange={(e) => setHodSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
              <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {filteredHodCandidates.length === 0 ? (
                  <p className="px-4 py-5 text-center text-sm text-slate-400">No active non-clinical staff found.</p>
                ) : (
                  filteredHodCandidates.map((s) => {
                    const isSelected = s.id === selectedHod;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedHod(s.id)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 ${isSelected ? "bg-lime-50" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-100 text-xs font-bold text-lime-700">
                            {getInitials(s.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.role}{s.unit ? ` · ${s.unit}` : ""}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <svg className="h-4 w-4 text-lime-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => { setHodModal(null); setSelectedHod(""); setHodSearch(""); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedHod || hodSaving}
                onClick={() => void handleAssignHod()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {hodSaving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="px-5 py-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900">Delete "{deleteTarget.name}"?</h3>
              <p className="mt-1 text-sm text-slate-500">
                This removes the unit. Staff assigned to it will need to be reassigned.
                Existing rotas for this unit are not deleted.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
