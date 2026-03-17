type StatsCardProps = {
  label: string;
  value: string;
  change: string;
};

export function StatsCard({ label, value, change }: StatsCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">{change}</p>
    </article>
  );
}
