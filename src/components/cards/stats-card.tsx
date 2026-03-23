type StatsCardProps = {
  label: string;
  value: string;
  change: string;
};

export function StatsCard({ label, value, change }: StatsCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:mt-3 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium text-slate-500 sm:mt-2 sm:text-sm">{change}</p>
    </article>
  );
}
