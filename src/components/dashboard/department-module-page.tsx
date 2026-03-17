import { PageHeader } from "@/components/layout/page-header";

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DepartmentModulePage({
  department,
  slug,
}: {
  department: string;
  slug: string[];
}) {
  const title = slug.map(formatSegment).join(" / ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`Department workspace. Full page implementation will follow the design system.`}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Module workspace</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            This route exists so staff can move through their departmental sidebar
            from login onward without hitting missing pages. The final implementation
            should be designed from the closest available stitch reference and only
            extrapolated where no design exists yet.
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            Pending full UI build for <span className="font-semibold text-slate-700">{title}</span>.
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Next implementation
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Match the closest stitch desktop screen where available.</li>
            <li>Preserve the department sidebar and shared shell.</li>
            <li>Wire server actions and validations for this module.</li>
            <li>Apply department permissions and audit logging.</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
