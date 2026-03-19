"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";

type Shift = "Morning" | "Afternoon" | "Night";
type Note = { id: string; shift: Shift; author: string; summary: string; detail: string; time: string; date: string; patientsHandedOver: number };

const SHIFT_STYLES: Record<Shift, string> = {
  Morning: "bg-amber-50 text-amber-700",
  Afternoon: "bg-sky-50 text-sky-700",
  Night: "bg-violet-50 text-violet-700",
};

export default function NursesHandoverNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewNote, setViewNote] = useState<Note | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [shift, setShift] = useState<Shift>("Morning");
  const [author, setAuthor] = useState("Nurse (You)");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [patients, setPatients] = useState("0");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!summary || !author) return;
    const note: Note = {
      id: `HN-${String(notes.length + 1).padStart(3, "0")}`,
      shift, author, summary, detail,
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      patientsHandedOver: parseInt(patients) || 0,
    };
    setNotes((prev) => [note, ...prev]);
    setToast({ message: "Handover note added.", type: "success" });
    setShowAdd(false);
    setShift("Morning"); setAuthor("Nurse (You)"); setSummary(""); setDetail(""); setPatients("0");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Handover Notes"
        description="Shift handover summaries for continuity of care."
        action={<Button onClick={() => setShowAdd(true)}>+ Add Handover Note</Button>}
      />

      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SHIFT_STYLES[note.shift]}`}>{note.shift} Shift</span>
                  <span className="text-xs text-slate-400">{note.date} · {note.time}</span>
                  <span className="text-xs text-slate-400">{note.patientsHandedOver} patients</span>
                </div>
                <p className="font-bold text-slate-900">{note.summary}</p>
                <p className="mt-1 text-xs text-slate-500">By {note.author}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setViewNote(note)}>View</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add note modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Handover Note" className="max-w-xl">
        <form id="handover-form" onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shift</label>
              <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className={inputCls}>
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Nurse Grace" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Summary <span className="text-red-500">*</span></label>
            <input required value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-line overview of the shift" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Notes</label>
            <textarea rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Patient updates, incidents, medications, follow-ups…" className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Patients Handed Over</label>
            <input type="number" min="0" value={patients} onChange={(e) => setPatients(e.target.value)} className={inputCls} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button size="md" type="submit" form="handover-form">Save Note</Button>
        </ModalFooter>
      </Modal>

      {/* View note modal */}
      {viewNote && (
        <Modal open={true} onClose={() => setViewNote(null)} title={`${viewNote.shift} Shift — ${viewNote.date}`} className="max-w-xl">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SHIFT_STYLES[viewNote.shift]}`}>{viewNote.shift} Shift</span>
              <span className="text-slate-400">{viewNote.time}</span>
            </div>
            <p className="font-semibold text-slate-900">{viewNote.summary}</p>
            <p className="text-slate-500">By <strong>{viewNote.author}</strong> · {viewNote.patientsHandedOver} patients handed over</p>
            {viewNote.detail && (
              <div className="rounded-lg bg-slate-50 p-4 text-slate-600 leading-relaxed whitespace-pre-line">{viewNote.detail}</div>
            )}
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setViewNote(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
