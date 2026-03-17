export default function PatientVerifyPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
      <section className="surface rounded-[34px] p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
          Patient verification
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Minimal patient ID confirmation for public users.
        </h2>
        <p className="page-copy mt-5 max-w-3xl text-base leading-8">
          This flow should confirm a patient record with patient ID plus phone
          number or date of birth and return only the minimal confirmation
          response required for the user.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {["Patient ID", "Phone number or DOB", "Turnstile verification", "Verify"].map(
            (field) => (
              <div
                key={field}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
              >
                {field}
              </div>
            ),
          )}
        </div>
      </section>

      <aside className="surface rounded-[30px] p-6">
        <p className="text-sm font-semibold text-slate-950">Public-safe response</p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          <li>Return minimal confirmation only.</li>
          <li>Do not expose diagnosis, balances, or internal notes.</li>
          <li>Rate limit verification attempts.</li>
          <li>Log attempts for abuse review.</li>
        </ul>
      </aside>
    </div>
  );
}
