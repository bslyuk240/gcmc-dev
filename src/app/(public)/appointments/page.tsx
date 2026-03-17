export default function AppointmentsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
      <section className="surface rounded-[34px] p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
          Public appointment booking
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Minimal public intake, isolated from internal records.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {["Patient name", "Phone number", "Preferred department", "Preferred date", "Reason for visit", "Turnstile verification"].map(
            (field) => (
              <div key={field} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                {field}
              </div>
            ),
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="surface rounded-[30px] p-6">
          <p className="text-sm font-semibold text-slate-950">Public safety rules</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Rate limit all public forms.</li>
            <li>Return only minimal success responses.</li>
            <li>Never expose internal staff or patient records directly.</li>
            <li>Verify requests server-side with schema validation.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
