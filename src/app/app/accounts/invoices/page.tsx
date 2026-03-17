"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { printReceipt } from "@/lib/utils/print-receipt";

type InvoiceStatus = "paid" | "pending" | "overdue" | "draft";

type Invoice = {
  id: string;
  patient: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  items: string;
};

const INITIAL: Invoice[] = [
  {
    id: "INV-2026-0081",
    patient: "Mary Ibrahim",
    amount: 36000,
    dueDate: "2026-03-10",
    status: "paid",
    items: "Lab tests + consultation",
  },
  {
    id: "INV-2026-0082",
    patient: "Joseph James",
    amount: 84000,
    dueDate: "2026-03-20",
    status: "pending",
    items: "Surgery (Appendectomy)",
  },
  {
    id: "INV-2026-0083",
    patient: "Ruth Cole",
    amount: 12500,
    dueDate: "2026-03-01",
    status: "overdue",
    items: "Physiotherapy (3 sessions)",
  },
  {
    id: "INV-2026-0084",
    patient: "Kwame Asante",
    amount: 5500,
    dueDate: "2026-03-25",
    status: "pending",
    items: "Outpatient consultation + meds",
  },
  {
    id: "INV-2026-0085",
    patient: "Ama Owusu",
    amount: 18200,
    dueDate: "2026-04-01",
    status: "draft",
    items: "Antenatal visit package",
  },
];

const STATUS_BADGE: Record<
  InvoiceStatus,
  "success" | "warning" | "destructive" | "neutral"
> = {
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  draft: "neutral",
};

const PAGE_SIZE = 8;

const PATIENTS = [
  "Kwame Asante",
  "Ama Owusu",
  "Kofi Mensah",
  "Efua Boateng",
  "Yaw Darko",
  "Abena Kyei",
];

const SERVICE_ITEMS = [
  "Outpatient consultation",
  "Lab tests",
  "X-Ray",
  "Surgery",
  "Antenatal visit",
  "Physiotherapy",
  "Medication dispensed",
  "Ward admission",
];

export default function AccountsInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [newPatient, setNewPatient] = useState("");
  const [newItems, setNewItems] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDue, setNewDue] = useState("");

  const filtered = invoices.filter((invoice) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      invoice.id.toLowerCase().includes(query) ||
      invoice.patient.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "All status" ||
      invoice.status === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!newPatient || !newAmount) return;

    const invoice: Invoice = {
      id: `INV-2026-${String(86 + invoices.length).padStart(4, "0")}`,
      patient: newPatient,
      items: newItems || "General services",
      amount: parseFloat(newAmount),
      dueDate: newDue || "2026-04-01",
      status: "draft",
    };

    setInvoices((previous) => [invoice, ...previous]);
    setToast({
      message: `Invoice ${invoice.id} created as draft.`,
      type: "success",
    });
    setShowCreate(false);
    setNewPatient("");
    setNewItems("");
    setNewAmount("");
    setNewDue("");
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Patient invoices and payment tracking."
        action={<Button onClick={() => setShowCreate(true)}>+ Create New Invoice</Button>}
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
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
              setStatusFilter(event.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[var(--accent)]"
          >
            {["All status", "Paid", "Pending", "Overdue", "Draft"].map(
              (status) => (
                <option key={status}>{status}</option>
              ),
            )}
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
                  "Amount (N)",
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
              {paginated.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">
                    {row.id}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {row.patient}
                  </td>
                  <td className="max-w-[180px] truncate px-5 py-3 text-slate-500">
                    {row.items}
                  </td>
                  <td className="px-5 py-3 font-bold text-slate-900">
                    {row.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.dueDate}</td>
                  <td className="px-5 py-3">
                    <StatusBadge variant={STATUS_BADGE[row.status]}>
                      {row.status}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    {row.status !== "paid" ? (
                      <Link
                        href={`${INTERNAL_PREFIX}/accounts/receive-payment?invoice=${row.id}`}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Receive Payment →
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700">✓ Paid</span>
                        <button
                          className="text-xs font-semibold text-slate-500 hover:text-accent transition"
                          onClick={() => printReceipt({
                            title: "Payment Receipt",
                            subtitle: row.items,
                            refNumber: row.id,
                            lines: [
                              { label: "Patient",   value: row.patient },
                              { label: "Invoice",   value: row.id },
                              { label: "Services",  value: row.items },
                              { label: "Due Date",  value: row.dueDate },
                              { label: "Status",    value: "PAID", bold: true },
                            ],
                            total: { label: "Amount Paid", value: `₦${row.amount.toLocaleString()}` },
                            copyLabel: "PATIENT COPY",
                          })}
                        >
                          🖨 Receipt
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    No invoices found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-400">
            {filtered.length} invoices - Page {page + 1} of{" "}
            {Math.max(1, totalPages)}
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
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, current + 1))
              }
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Invoice"
      >
        <form id="invoice-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Patient <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={newPatient}
              onChange={(event) => setNewPatient(event.target.value)}
              className={inputCls}
            >
              <option value="">Select patient...</option>
              {PATIENTS.map((patient) => (
                <option key={patient}>{patient}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Services / Description
            </label>
            <select
              value={newItems}
              onChange={(event) => setNewItems(event.target.value)}
              className={inputCls}
            >
              <option value="">Select service...</option>
              {SERVICE_ITEMS.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Amount (N) <span className="text-red-500">*</span>
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
            onClick={() => setShowCreate(false)}
          >
            Cancel
          </Button>
          <Button size="md" type="submit" form="invoice-form">
            Create Invoice
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
