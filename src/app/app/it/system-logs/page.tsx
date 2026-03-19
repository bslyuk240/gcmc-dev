import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function ITSystemLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Logs"
        description="Authentication and system events."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search user or event..."
            className="min-w-[200px] rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">No records yet.</p>
          <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
        </div>
      </Card>
    </div>
  );
}
