"use client";

import { useEffect, useMemo, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import {
  fetchHandoverNotes,
  insertHandoverNote,
  type HandoverNote,
} from "@/lib/supabase/db";

type Shift = "Morning" | "Afternoon" | "Night";
type WardFilter = "Ward" | "Emergency" | "ICU" | "Outpatient";

const SHIFT_STYLES: Record<Shift, string> = {
  Morning: "bg-amber-50 text-amber-700",
  Afternoon: "bg-sky-50 text-sky-700",
  Night: "bg-violet-50 text-violet-700",
};

function fmtDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The action could not be completed.";
}

export default function NursesHandoverNotesPage() {
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Nurse";

  const [notes, setNotes] = useState<HandoverNote[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewNote, setViewNote] = useState<HandoverNote | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedWard, setSelectedWard] = useState<WardFilter>("Emergency");
  const [formWard, setFormWard] = useState<WardFilter>("Emergency");
  const [shift, setShift] = useState<Shift>("Morning");
  const [author, setAuthor] = useState(staffName);
  const [content, setContent] = useState("");

  useEffect(() => {
    setAuthor(staffName);
  }, [staffName]);

  async function loadNotes(ward: WardFilter) {
    setLoading(true);
    try {
      const rows = await fetchHandoverNotes(ward);
      setNotes(rows);
    } catch (error) {
      setNotes([]);
      setToast({ message: `Failed to load ${ward} handover notes: ${getErrorMessage(error)}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes(selectedWard);
  }, [selectedWard]);

  function openAddModal() {
    setFormWard(selectedWard);
    setShift("Morning");
    setAuthor(staffName);
    setContent("");
    setShowAdd(true);
  }

  const shiftStats = useMemo(
    () => ({
      Morning: notes.filter((note) => note.shift === "Morning").length,
      Afternoon: notes.filter((note) => note.shift === "Afternoon").length,
      Night: notes.filter((note) => note.shift === "Night").length,
    }),
    [notes],
  );

  const latestNote = notes[0] ?? null;

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) {
      setToast({ message: "Handover note content is required.", type: "error" });
      return;
    }
    if (!author.trim()) {
      setToast({ message: "Author name is required.", type: "error" });
      return;
    }

    setSubmitting(true);
    const note: HandoverNote = {
      id: createLocalId("HN"),
      ward: formWard,
      shift,
      writtenBy: author.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await insertHandoverNote(note);
      const rows = await fetchHandoverNotes(formWard);
      if (!rows.some((row) => row.id === note.id)) {
        throw new Error(`The note was saved, but it did not appear in the ${formWard} handover board reload.`);
      }

      setSelectedWard(formWard);
      setNotes(rows);
      setToast({ message: `${formWard} handover note saved and published to the board.`, type: "success" });
      setShowAdd(false);
      setShift("Morning");
      setAuthor(staffName);
      setContent("");
    } catch (error) {
      setToast({ message: `Handover save failed: ${getErrorMessage(error)}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Handover Notes"
        description="Shift handover summaries for continuity of care. Notes must save and reload on the receiving unit board before success is shown."
        action={<Button onClick={openAddModal}>+ Add Handover Note</Button>}
      />

      <div className="flex flex-wrap gap-2">
        {(["Emergency", "Ward", "ICU", "Outpatient"] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setSelectedWard(entry)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              selectedWard === entry
                ? "bg-accent text-white"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-0 bg-slate-50 px-4 py-3">
          <p className="text-2xl font-bold text-slate-900">{notes.length}</p>
          <p className="text-xs font-semibold text-slate-500">{selectedWard} Notes</p>
        </Card>
        <Card className="border-0 bg-amber-50 px-4 py-3">
          <p className="text-2xl font-bold text-amber-700">{shiftStats.Morning}</p>
          <p className="text-xs font-semibold text-slate-500">Morning Shift</p>
        </Card>
        <Card className="border-0 bg-sky-50 px-4 py-3">
          <p className="text-2xl font-bold text-sky-700">{shiftStats.Afternoon}</p>
          <p className="text-xs font-semibold text-slate-500">Afternoon Shift</p>
        </Card>
        <Card className="border-0 bg-violet-50 px-4 py-3">
          <p className="text-2xl font-bold text-violet-700">{shiftStats.Night}</p>
          <p className="text-xs font-semibold text-slate-500">Night Shift</p>
        </Card>
      </div>

      {latestNote ? (
        <Card className="border border-slate-200 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SHIFT_STYLES[latestNote.shift as Shift] ?? "bg-slate-100 text-slate-600"}`}>
              Latest {latestNote.shift}
            </span>
            <span className="text-xs text-slate-400">{fmtDateTime(latestNote.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-700 line-clamp-2">{latestNote.content}</p>
          <p className="mt-2 text-xs text-slate-500">By {latestNote.writtenBy}</p>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SHIFT_STYLES[note.shift as Shift] ?? "bg-slate-100 text-slate-600"}`}>
                      {note.shift} Shift
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {note.ward}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDateTime(note.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-800">{note.content}</p>
                  <p className="mt-2 text-xs text-slate-500">By {note.writtenBy}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setViewNote(note)}>View</Button>
              </div>
            </Card>
          ))}
          {notes.length === 0 ? (
            <Card className="py-12 text-center text-sm text-slate-400">
              No handover notes found for {selectedWard}. Add one and it will only report success after the board reload sees it.
            </Card>
          ) : null}
        </div>
      )}

      <Modal open={showAdd} onClose={() => !submitting && setShowAdd(false)} title="Add Handover Note" className="max-w-xl">
        <form id="handover-form" onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ward</label>
              <select value={formWard} onChange={(event) => setFormWard(event.target.value as WardFilter)} className={inputCls} disabled={submitting}>
                {["Emergency", "Ward", "ICU", "Outpatient"].map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Shift</label>
              <select value={shift} onChange={(event) => setShift(event.target.value as Shift)} className={inputCls} disabled={submitting}>
                {["Morning", "Afternoon", "Night"].map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Your Name</label>
            <input value={author} onChange={(event) => setAuthor(event.target.value)} className={inputCls} disabled={submitting} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Handover Note</label>
            <textarea
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Patient updates, transfers, pending tasks, monitoring concerns..."
              className={`${inputCls} resize-none`}
              disabled={submitting}
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Save checks two steps: the database write must succeed, and the note must appear when the receiving ward board reloads.
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowAdd(false)} disabled={submitting}>Cancel</Button>
          <Button size="md" type="submit" form="handover-form" disabled={submitting || !author.trim() || !content.trim()}>
            {submitting ? "Saving..." : "Save Note"}
          </Button>
        </ModalFooter>
      </Modal>

      {viewNote ? (
        <Modal open={true} onClose={() => setViewNote(null)} title={`${viewNote.ward} - ${viewNote.shift} Shift`} className="max-w-xl">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SHIFT_STYLES[viewNote.shift as Shift] ?? "bg-slate-100 text-slate-600"}`}>
                {viewNote.shift} Shift
              </span>
              <span className="text-slate-400">{fmtDateTime(viewNote.createdAt)}</span>
            </div>
            <p className="text-slate-500">By <strong>{viewNote.writtenBy}</strong></p>
            <div className="whitespace-pre-line rounded-lg bg-slate-50 p-4 text-slate-700">
              {viewNote.content}
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setViewNote(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
