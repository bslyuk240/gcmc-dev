import Link from "next/link";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

const tabs = ["Overview", "Visits", "Billing", "Prescriptions", "Attachments", "Audit trail"];

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-50 bg-slate-100 text-2xl font-bold text-slate-600">
            JD
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                John Doe
              </h1>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-green-700">
                Stable
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Patient ID</p>
                <p className="text-sm font-semibold text-slate-900">{patientId}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Age / Sex</p>
                <p className="text-sm font-semibold text-slate-900">34 years / Male</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Phone</p>
                <p className="text-sm font-semibold text-slate-900">+1 234-567-8900</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Last Visit</p>
                <p className="text-sm font-semibold text-slate-900">Oct 12, 2023</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
              Edit Demographics
            </button>
            <Link
              href={`${INTERNAL_PREFIX}/frontdesk/visits`}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white"
            >
              Create Visit
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${index === 0 ? "bg-[var(--accent)] text-white" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-bold text-red-800">Active Allergy Alerts</h3>
            <p className="mt-1 text-sm text-red-700">
              Patient is allergic to Penicillin and Peanuts. Avoid related medications.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900">Recent Activities</h3>
            <div className="mt-5 space-y-4">
              {[
                "Consultation - Cardiology",
                "Lab Results - Blood Work",
                "Prescription Refill",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{item}</p>
                    <span className="text-xs font-bold text-[var(--accent-foreground)]">Oct 12, 2023</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Activity log and patient history entry for this record.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-4 space-y-3">
              {["Register New Visit", "Create Invoice", "View Prescriptions", "Open Audit Trail"].map(
                (action) => (
                  <button
                    key={action}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {action}
                    <span className="text-slate-300">›</span>
                  </button>
                ),
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
