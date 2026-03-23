"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { printReceipt } from "@/lib/utils/print-receipt";
import {
  fetchInvoices,
  fetchPatientRegistrations,
  insertInvoice,
  type InvoiceRecord,
  type InvoiceStatus,
  type PatientRegistration,
} from "@/lib/supabase/db";

const STATUS_BADGE: Record<InvoiceStatus, "success" | "warning" | "destructive" | "neutral"> = {
  draft: "neutral",
  issued: "warning",
  part_paid: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "neutral",
};

const STATUS_FILTERS = [
  "All status",
  "Draft",
  "Issued",
  "Part paid",
  "Paid",
  "Overdue",
  "Cancelled",
] as const;

const PAGE_SIZE = 8;

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AccountsInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [patients, setPatients] = useState<PatientRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All status");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newItems, setNewItems] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDue, setNewDue] = useState("");

  useEffect(() => {
    let alive = true;

    fetchInvoices()
      .then((data) => {
        if (alive) setInvoices(data);
      })
      .catch((error) => {
        if (!alive) return;
        setToast({
          message: error instanceof Error ? error.message : "Failed to load invoices.",
          type: "error",
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    fetchPatientRegistrations()
      .then((data) => {
        if (alive) setPatients(data);
      })
      .catch((error) => {
        if (!alive) return;
        setToast({
          message: error instanceof Error ? error.message : "Failed to load front desk patients.",
          type: "error",
        });
      })
      .finally(() => {
        if (alive) setPatientsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filtered = invoices.filter((invoice) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.patient.toLowerCase().includes(query) ||
      invoice.items.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "All status" ||
      invoice.status === statusFilter.toLowerCase().replace(/ /g, "_");

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );
  const patientMatches = useMemo(() => {
    const query = patientQuery.toLowerCase().trim();
    if (!query) return patients.slice(0, 8);
    return patients
      .filter((patient) => {
        const fields = [
          patient.patientName,
          patient.patientId,
          patient.contact ?? "",
          patient.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return fields.includes(query);
      })
      .slice(0, 8);
  }, [patients, patientQuery]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedPatient || !newAmount.trim()) return;

    setSaving(true);

    try {
      const invoiceNumber = `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const created = await insertInvoice({
        invoiceNumber,
        patient: selectedPatient.patientName,
        items: newItems.trim() || "General services",
        amountDue: Number.parseFloat(newAmount),
        amountPaid: 0,
        dueDate: newDue || new Date().toISOString().slice(0, 10),
        status: "draft",
        notes: JSON.stringify({
          patient: selectedPatient.patientName,
          patientRecordId: selectedPatient.id,
          patientDisplayId: selectedPatient.patientId,
          patientContact: selectedPatient.contact ?? "",
          items: newItems.trim() || "General services",
        }),
      });

      setInvoices((previous) => [created, ...previous]);
      setToast({ message: `Invoice ${created.invoiceNumber} created as draft.`, type: "success" });
      setShowCreate(false);
      setPatientQuery("");
      setSelectedPatientId("");
      setNewItems("");
      setNewAmount("");
      setNewDue("");
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Failed to create invoice.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Invoices"
        description="Patient invoices and payment tracking."
        action={
          <Button
            onClick={() => {
              setPatientQuery("");
              setSelectedPatientId("");
              setShowCreate(true);
            }}
          >
            + Create New Invoice
          </Button>
        }
      />

      {loading && <p className="text-sm text-slate-400">Loading invoices...</p>}

      <div className="space-y-3 md:hidden">
        {paginated.map((row) => {
          const balance = Math.max(0, row.amountDue - row.amountPaid);
          const isSettled = row.status === "paid" || row.status === "cancelled";
          return (
            <Card key={row.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{row.patient}</p>
                  <p className="text-xs text-slate-500">{row.invoiceNumber}</p>
                </div>
                <StatusBadge variant={STATUS_BADGE[row.status]}>{row.status}</StatusBadge>
              </div>

              <div className="mt-4 space-y-2">
                <MobileMeta label="Services" value={row.items} />
                <MobileMeta label="Amount Due" value={`NGN ${row.amountDue.toLocaleString()}`} />
                <MobileMeta label="Paid" value={`NGN ${row.amountPaid.toLocaleString()}`} />
                <MobileMeta label="Balance" value={`NGN ${balance.toLocaleString()}`} />
                <MobileMeta label="Due Date" value={row.dueDate} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                {isSettled ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-500 hover:text-[var(--accent)] transition"
                    onClick={() =>
                      printReceipt({
                        title: "Payment Receipt",
                        subtitle: `${row.invoiceNumber} | ${row.items}`,
                        refNumber: row.invoiceNumber,
                        lines: [
                          { label: "Patient", value: row.patient },
                          { label: "Invoice", value: row.invoiceNumber },
                          { label: "Services", value: row.items },
                          { label: "Due Date", value: row.dueDate },
                          { label: "Amount Due", value: `NGN ${row.amountDue.toLocaleString()}` },
                          { label: "Amount Paid", value: `NGN ${row.amountPaid.toLocaleString()}`, bold: true },
                        ],
                        total: { label: "Balance", value: `NGN ${balance.toLocaleString()}` },
                        copyLabel: "PATIENT COPY",
                      })
                    }
                  >
                    Print Receipt
                  </button>
                ) : (
                  <Link
                    href={`${INTERNAL_PREFIX}/accounts/receive-payment?invoice=${encodeURIComponent(row.invoiceNumber)}`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Receive Payment
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
        {paginated.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-400">No invoices found.</Card>
        ) : null}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search invoice or patient..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number]);
              setPage(0);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[var(--accent)]"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  "Invoice ID",
                  "Patient",
                  "Services",
                  "Amount Due (NGN)",
                  "Paid",
                  "Due Date",
                  "Status",
                  "",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((row) => {
                const balance = Math.max(0, row.amountDue - row.amountPaid);
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">
                      {row.invoiceNumber}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {row.patient}
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-3 text-slate-500">
                      {row.items}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      NGN {row.amountDue.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      NGN {row.amountPaid.toLocaleString()}
                      {balance > 0 ? <span className="ml-2 text-xs text-slate-400">(bal. {balance.toLocaleString()})</span> : null}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{row.dueDate}</td>
                    <td className="px-5 py-3">
                      <StatusBadge variant={STATUS_BADGE[row.status]}>{row.status}</StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      {row.status !== "paid" && row.status !== "cancelled" ? (
                        <Link
                          href={`${INTERNAL_PREFIX}/accounts/receive-payment?invoice=${encodeURIComponent(row.invoiceNumber)}`}
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          Receive Payment
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-700">Paid</span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-500 hover:text-accent transition"
                            onClick={() =>
                              printReceipt({
                                title: "Payment Receipt",
                                subtitle: `${row.invoiceNumber} | ${row.items}`,
                                refNumber: row.invoiceNumber,
                                lines: [
                                  { label: "Patient", value: row.patient },
                                  { label: "Invoice", value: row.invoiceNumber },
                                  { label: "Services", value: row.items },
                                  { label: "Due Date", value: row.dueDate },
                                  { label: "Amount Due", value: `NGN ${row.amountDue.toLocaleString()}` },
                                  { label: "Amount Paid", value: `NGN ${row.amountPaid.toLocaleString()}`, bold: true },
                                ],
                                total: { label: "Balance", value: `NGN ${balance.toLocaleString()}` },
                                copyLabel: "PATIENT COPY",
                              })
                            }
                          >
                            Print Receipt
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-xs text-slate-400">
            {filtered.length} invoices - Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Invoice">
        <form id="invoice-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Patient <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="search"
              placeholder={patientsLoading ? "Loading front desk patients..." : "Search front desk patient..."}
              value={patientQuery}
              onChange={(event) => {
                setPatientQuery(event.target.value);
                if (selectedPatient && event.target.value.toLowerCase() !== selectedPatient.patientName.toLowerCase()) {
                  setSelectedPatientId("");
                }
              }}
              className={inputCls}
              disabled={patientsLoading}
            />
            <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
              {patientMatches.length > 0 ? (
                patientMatches.map((patient) => {
                  const selected = selectedPatientId === patient.id;
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(patient.id);
                        setPatientQuery(patient.patientName);
                      }}
                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-b-0 ${
                        selected ? "bg-[var(--accent)]/10" : "hover:bg-white"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">{patient.patientName}</span>
                        <span className="block text-xs text-slate-500">
                          {patient.patientId || "No patient ID"} {patient.contact ? `· ${patient.contact}` : ""}
                        </span>
                      </span>
                      {selected ? <span className="text-xs font-bold text-[var(--accent)]">Selected</span> : null}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-3 text-xs text-slate-400">No matching front desk patients found.</p>
              )}
            </div>
            {selectedPatient ? (
              <p className="mt-2 text-xs text-slate-500">
                Selected: <span className="font-semibold text-slate-700">{selectedPatient.patientName}</span>
                {selectedPatient.patientId ? ` (${selectedPatient.patientId})` : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Choose a patient record from Front Desk before creating the invoice.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Services / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Outpatient consultation + meds"
              value={newItems}
              onChange={(event) => setNewItems(event.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Amount (NGN) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={newAmount}
                onChange={(event) => setNewAmount(event.target.value)}
                placeholder="e.g. 5500"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Due Date
              </label>
              <input
                type="date"
                value={newDue}
                onChange={(event) => setNewDue(event.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </form>
        <ModalFooter>
          <Button
            variant="ghost"
            size="md"
            type="button"
            onClick={() => {
              setShowCreate(false);
              setPatientQuery("");
              setSelectedPatientId("");
            }}
          >
            Cancel
          </Button>
          <Button size="md" type="submit" form="invoice-form" disabled={saving || !selectedPatient}>
            {saving ? "Creating..." : "Create Invoice"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
