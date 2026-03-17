import { PageHeader } from "@/components/layout/page-header";

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Register New Patient"
        description="Capture demographics; on save, redirect to patient detail or create visit."
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "First name",
              "Last name",
              "Date of birth",
              "Gender",
              "Phone number",
              "Address",
              "Next of kin",
              "Patient identifier",
            ].map((field) => (
              <div
                key={field}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500"
              >
                {field}
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white">
              Save Patient
            </button>
            <button className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700">
              Save and Create Visit
            </button>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Registration flow
          </h3>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>1. Capture patient demographics.</li>
            <li>2. Check duplicates before save.</li>
            <li>3. Save master record.</li>
            <li>4. Redirect to patient detail or create visit.</li>
          </ol>
        </aside>
      </section>
    </div>
  );
}
