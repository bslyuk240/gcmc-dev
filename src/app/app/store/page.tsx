import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function StoreDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Store Dashboard"
        description="Inventory overview, pending stock requests, and procurement status."
      />

      {/* KPIs — zeroed until real data is wired */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total SKUs", value: "—", change: "Active items", color: "text-slate-900" },
          { label: "Low / Out of Stock", value: "—", change: "Needs attention", color: "text-red-600" },
          { label: "Pending Requests", value: "—", change: "Awaiting approval", color: "text-amber-600" },
          { label: "Orders This Week", value: "—", change: "Procurement orders", color: "text-emerald-600" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-sm text-slate-500">{k.change}</p>
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
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">No records yet.</p>
              <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
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
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">No records yet.</p>
              <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
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
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-slate-500">No records yet.</p>
              <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
