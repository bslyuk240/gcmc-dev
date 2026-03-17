import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function ProfileAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Your clock-in and attendance history."
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-3 font-semibold text-slate-500">Date</th>
                <th className="pb-3 font-semibold text-slate-500">Check in</th>
                <th className="pb-3 font-semibold text-slate-500">Check out</th>
                <th className="pb-3 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr>
                <td className="py-3 text-slate-600">—</td>
                <td className="py-3 text-slate-600">—</td>
                <td className="py-3 text-slate-600">—</td>
                <td className="py-3 text-slate-600">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
