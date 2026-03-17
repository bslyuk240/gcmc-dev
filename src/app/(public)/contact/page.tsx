export default function ContactPage() {
  return (
    <section className="surface rounded-[34px] p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
        Contact
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
        Public contact and general hospital enquiries.
      </h2>
      <p className="page-copy mt-5 max-w-3xl text-base leading-8">
        This route is reserved for public-safe submissions and should later be
        connected to a restricted service layer with rate limiting, abuse checks,
        and minimal response payloads.
      </p>
    </section>
  );
}
