import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

const history = [
  { id: "CON-001", patient: "Alice Meriwether", doctor: "Dr. Nwosu", date: "2024-03-15", observations: "Routine check", status: "completed" as const },
  { id: "CON-002", patient: "John Doe", doctor: "Dr. Madu", date: "2024-03-14", observations: "Follow-up", status: "completed" as const },
];

export default function DoctorsHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation History"
        description="Past consultations and encounter notes."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search patients..."
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
          <select className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm">
            <option>All status</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-3 font-semibold text-slate-500">Patient</th>
                <th className="pb-3 font-semibold text-slate-500">Doctor</th>
                <th className="pb-3 font-semibold text-slate-500">Date</th>
                <th className="pb-3 font-semibold text-slate-500">Observations</th>
                <th className="pb-3 font-semibold text-slate-500">Status</th>
                <th className="pb-3 text-right font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 font-medium text-slate-900">{row.patient}</td>
                  <td className="py-3 text-slate-600">{row.doctor}</td>
                  <td className="py-3 text-slate-600">{row.date}</td>
                  <td className="py-3 text-slate-600">{row.observations}</td>
                  <td className="py-3">
                    <StatusBadge variant="success">{row.status}</StatusBadge>
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/doctors/consultations/${row.id}`} className="text-[var(--accent-foreground)] font-semibold hover:underline">
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </Card>
    </div>
  );
}
