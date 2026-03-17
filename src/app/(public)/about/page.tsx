export default function AboutPage() {
  return (
    <section className="surface rounded-[34px] p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
        Product vision
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
        A modern, accountable operating system for hospital teams.
      </h2>
      <p className="page-copy mt-5 max-w-3xl text-base leading-8">
        This build is structured around departmental workspaces, role-based access,
        audit trails, and a patient flow that moves cleanly from registration to
        care delivery, dispensing, and finance.
      </p>
    </section>
  );
}
