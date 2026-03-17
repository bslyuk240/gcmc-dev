import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/cards/stats-card";
import { DataTable } from "@/components/tables/data-table";
import { workspaceBoards, type DepartmentKey } from "@/lib/constants/navigation";

export function WorkspaceOverview({
  department,
}: {
  department: DepartmentKey;
}) {
  const board = workspaceBoards[department];

  return (
    <div className="space-y-4">
      <PageHeader
        title={board.heading}
        description={board.subheading}
        action={
          <>
            <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Export snapshot
            </button>
            <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-95">
              New action
            </button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {board.stats.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <DataTable columns={board.table.columns} rows={board.table.rows} />

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-900">Priority queue</p>
            <div className="mt-4 space-y-3">
              {board.queue.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.label}
                    </p>
                    <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-foreground)]">
                      {item.state}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-900">Operational notes</p>
            <div className="mt-4 space-y-3">
              {board.highlights.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
