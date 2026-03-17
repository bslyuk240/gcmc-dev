import { Icon } from "@/components/ui/icon";

const metrics = [
  {
    label: "Patients Registered",
    value: "42",
    note: "Total registrations today",
    trend: "+12%",
    tone: "text-emerald-600 bg-emerald-50",
  },
  {
    label: "Waiting Patients",
    value: "12",
    note: "Currently in waiting area",
    trend: "Stable",
    tone: "text-teal-700 bg-teal-50",
  },
  {
    label: "Charges to Accounts",
    value: "8",
    note: "Sent to Accounts for collection",
    trend: "-5%",
    tone: "text-sky-600 bg-sky-50",
  },
  {
    label: "Consultation Queue",
    value: "15",
    note: "In consultation or scheduled",
    trend: "+4%",
    tone: "text-emerald-600 bg-emerald-50",
  },
];

const registrations = [
  ["Alice Meriwether", "#P-89230", "09:15 AM", "+1 234-567-8901", "AM"],
  ["Johnathan Doe", "#P-89231", "09:42 AM", "+1 234-567-8902", "JD"],
  ["Sarah Kinsley", "#P-89232", "10:05 AM", "+1 234-567-8903", "SK"],
  ["Robert Brown", "#P-89233", "10:20 AM", "+1 234-567-8904", "RB"],
  ["Emma Lou", "#P-89234", "11:10 AM", "+1 234-567-8905", "EL"],
];

const quickActions = [
  {
    title: "Register New Patient",
    copy: "Add to system registry",
    solid: true,
    icon: "user-add" as const,
  },
  {
    title: "Find Patient",
    copy: "Search existing records",
    solid: false,
    icon: "search" as const,
  },
  {
    title: "Create Visit",
    copy: "New check-in instance",
    solid: false,
    icon: "plus" as const,
  },
];

export default function FrontdeskPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Front Desk</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Patient registration, check-in, and consultation queue</p>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
                {metric.label}
              </p>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:py-1 sm:text-xs ${metric.tone}`}>
                {metric.trend}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{metric.value}</h2>
            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{metric.note}</p>
          </article>
        ))}
      </section>

      {/* Main content grid */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-4 xl:gap-6">
        {/* Recent registrations table */}
        <div className="space-y-4 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
              <span className="rounded-lg bg-(--accent)/10 p-1.5 text-accent-foreground">
                <Icon name="patients" className="h-4 w-4" />
              </span>
              Recent Registrations
            </h3>
            <button className="text-xs font-semibold text-accent-foreground hover:underline sm:text-sm">
              View All
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["Patient Name", "ID", "Time", "Contact", ""].map((col, i) => (
                      <th
                        key={col + i}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${i === 4 ? "text-right" : ""}`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.map((patient) => (
                    <tr key={patient[1]} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                            {patient[4]}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {patient[0]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{patient[1]}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{patient[2]}</td>
                      <td className="hidden px-4 py-3 text-xs text-slate-500 sm:table-cell">{patient[3]}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="rounded p-1 text-slate-500 transition hover:text-accent-foreground">
                          <Icon name="view" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 p-3 text-center">
              <button className="text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:text-accent-foreground">
                Load more activity
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions sidebar */}
        <aside className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
            <span className="rounded-lg bg-(--accent)/10 p-1.5 text-accent-foreground">
              <Icon name="plus" className="h-4 w-4" />
            </span>
            Quick Actions
          </h3>

          <div className="space-y-2.5">
            {quickActions.map((action) => (
              <button
                key={action.title}
                className={
                  action.solid
                    ? "flex w-full items-center gap-3 rounded-xl bg-accent p-3.5 text-left text-white shadow-md shadow-(--accent)/20 transition hover:-translate-y-0.5 sm:p-4"
                    : "flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-(--accent)/40 sm:p-4"
                }
              >
                <div
                  className={
                    action.solid
                      ? "rounded-lg bg-white/20 p-1.5"
                      : "rounded-lg bg-(--accent)/10 p-1.5 text-accent-foreground"
                  }
                >
                  <Icon name={action.icon} className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${action.solid ? "text-white" : "text-slate-900"}`}>
                    {action.title}
                  </p>
                  <p className={`text-[10px] font-medium ${action.solid ? "text-white/80" : "text-slate-500"}`}>
                    {action.copy}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-(--accent)/10 bg-(--accent)/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 sm:text-sm">Upcoming Shift</h4>
              <span className="text-[10px] font-bold uppercase text-accent-foreground">
                Staff View
              </span>
            </div>
            <div className="space-y-3 text-xs text-slate-600 sm:text-sm">
              <div className="flex items-start gap-2.5">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div>
                  <p className="font-semibold text-slate-900">Afternoon intake coverage</p>
                  <p>12:00 PM – 6:00 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <div>
                  <p className="font-semibold text-slate-900">Card replacement window</p>
                  <p>Identity confirmation required before re-issue.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
