import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

const KPI = [
  { label: "Total SKUs", value: "148", change: "Active items", up: true, color: "text-slate-900" },
  { label: "Low / Out of Stock", value: "7", change: "Needs attention", up: false, color: "text-red-600" },
  { label: "Pending Requests", value: "4", change: "Awaiting approval", up: false, color: "text-amber-600" },
  { label: "Orders This Week", value: "3", change: "₦8,440 value", up: true, color: "text-emerald-600" },
];

const RECENT_REQUESTS = [
  { id: "REQ-2841", item: "N95 Respirators", qty: 50, dept: "Nurses", urgency: "Urgent", status: "Pending" },
  { id: "REQ-2840", item: "Gauze Bandages 10cm", qty: 100, dept: "Doctors", urgency: "Critical", status: "Approved" },
  { id: "REQ-2839", item: "Disposable Syringes 5ml", qty: 10, dept: "Pharmacy", urgency: "Routine", status: "Fulfilled" },
  { id: "REQ-2838", item: "Patient Wristbands", qty: 5, dept: "Front Desk", urgency: "Urgent", status: "Pending" },
];

const LOW_STOCK_ITEMS = [
  { name: "N95 Respirators", qty: 35, reorder: 40, status: "Low Stock" },
  { name: "Gauze Bandages 10cm", qty: 8, reorder: 20, status: "Critical" },
  { name: "Patient Wristbands", qty: 0, reorder: 10, status: "Out of Stock" },
  { name: "Oxygen Masks (Adult)", qty: 18, reorder: 25, status: "Low Stock" },
];

const PENDING_ORDERS = [
  { id: "PO-1142", supplier: "MedSupply Co.", value: 2840, expected: "Mar 19", status: "Confirmed" },
  { id: "PO-1141", supplier: "SafeGuard Ltd.", value: 1260, expected: "Mar 18", status: "Sent" },
  { id: "PO-1143", supplier: "MedSupply Co.", value: 760, expected: "Mar 21", status: "Draft" },
];

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-sky-50 text-sky-700",
  Fulfilled: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700",
  "Out of Stock": "bg-slate-100 text-slate-500",
  Confirmed: "bg-violet-50 text-violet-700",
  Sent: "bg-sky-50 text-sky-700",
  Draft: "bg-slate-100 text-slate-600",
};

const URGENCY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-orange-50 text-orange-700",
  Critical: "bg-red-50 text-red-700",
};

export default function StoreDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Store Dashboard"
        description="Inventory overview, pending stock requests, and procurement status."
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className={`mt-1 flex items-center gap-1 text-sm ${k.up ? "text-emerald-600" : "text-slate-500"}`}>
              {k.up && (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {k.change}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Recent requests */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Stock Requests</h3>
              <Link href={`${INTERNAL_PREFIX}/store/requests`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                All requests →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    {["Ref", "Item", "Qty", "Department", "Urgency", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RECENT_REQUESTS.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{r.item}</td>
                      <td className="px-5 py-3 text-slate-700">{r.qty}</td>
                      <td className="px-5 py-3 text-slate-500">{r.dept}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${URGENCY_STYLES[r.urgency]}`}>{r.urgency}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pending orders */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Purchase Orders in Progress</h3>
              <Link href={`${INTERNAL_PREFIX}/store/procurement`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                All orders →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {PENDING_ORDERS.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{o.id} · {o.supplier}</p>
                    <p className="text-xs text-slate-400">Expected {o.expected}</p>
                  </div>
                  <p className="shrink-0 font-bold text-slate-900">₦{o.value.toLocaleString()}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Inventory", href: `${INTERNAL_PREFIX}/store/inventory` },
                { label: "Requests", href: `${INTERNAL_PREFIX}/store/requests` },
                { label: "Procurement", href: `${INTERNAL_PREFIX}/store/procurement` },
                { label: "Chat to IT", href: `${INTERNAL_PREFIX}/store/chat` },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Stock Alerts</h3>
            <ul className="mt-3 space-y-3">
              {LOW_STOCK_ITEMS.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.status === "Out of Stock" ? "bg-slate-400" : item.status === "Critical" ? "bg-red-500" : "bg-amber-400"}`} />
                    <span className="truncate text-sm text-slate-700">{item.name}</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>{item.qty}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
