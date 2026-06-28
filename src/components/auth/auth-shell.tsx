import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
  brandName: string;
  brandSubtitle?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  cardClassName?: string;
};

function BrandMark() {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 shadow-[0_18px_45px_rgba(14,116,224,0.35)]">
      <div className="absolute inset-1 rounded-[1rem] border border-white/30" />
      <svg className="h-8 w-8 text-white" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 5v22M5 16h22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M7 17h6l2-5 3 10 2-5h5" stroke="#dff8ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function VisualPanel() {
  return (
    <aside className="relative hidden min-h-[680px] overflow-hidden bg-[#06265a] px-12 py-12 text-white lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(56,189,248,0.42),transparent_24%),radial-gradient(circle_at_18%_82%,rgba(37,99,235,0.52),transparent_30%),linear-gradient(135deg,#061842_0%,#08316d_52%,#041431_100%)]" />
      <div className="absolute -right-20 top-0 h-72 w-72 rounded-full border border-sky-300/20" />
      <div className="absolute right-8 top-24 h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_30px_8px_rgba(103,232,249,0.45)]" />
      <div className="absolute bottom-20 left-14 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_26px_8px_rgba(103,232,249,0.4)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#031129] to-transparent" />

      <div className="relative z-10 flex items-center gap-4">
        <BrandMark />
        <div>
          <p className="text-xl font-black tracking-tight">CareWell</p>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/80">Health System</p>
        </div>
      </div>

      <div className="relative z-10 mt-16 max-w-md">
        <h2 className="text-4xl font-black leading-tight tracking-tight">Smarter care.<br />Better outcomes.</h2>
        <p className="mt-5 text-base font-medium text-sky-50/85">Integrated. Secure. Efficient.</p>
      </div>

      <div className="relative z-10 mt-14 flex-1">
        <div className="absolute left-0 top-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 shadow-[0_18px_70px_rgba(14,165,233,0.22)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" /></svg>
            </span>
            <div>
              <p className="text-2xl font-black">72</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-sky-100/70">BPM</p>
            </div>
          </div>
          <div className="mt-3 h-8 w-36">
            <svg viewBox="0 0 144 32" className="h-full w-full text-cyan-200" fill="none" aria-hidden="true">
              <path d="M2 24 15 18l9 4 8-14 12 18 12-8 12 4 10-13 10 17 11-9 12 5 12-14 19 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="absolute left-24 top-24 w-[430px] rounded-[1.5rem] border border-white/25 bg-white/14 p-5 shadow-[0_26px_90px_rgba(2,8,23,0.32)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Today&apos;s overview</p>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-300/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {[
              ["Patients", "1,254", "+12%"],
              ["Appointments", "320", "+8%"],
              ["Admissions", "85", "-4%"],
              ["Discharges", "60", "+5%"],
            ].map(([label, value, delta]) => (
              <div key={label} className="rounded-xl bg-white/12 px-3 py-3">
                <p className="text-[10px] font-semibold text-sky-100/75">{label}</p>
                <p className="mt-2 text-lg font-black">{value}</p>
                <p className={delta.startsWith("-") ? "text-[10px] font-bold text-rose-200" : "text-[10px] font-bold text-emerald-200"}>{delta}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#07275f]/55 p-4">
            <div className="flex items-center justify-between text-[10px] font-semibold text-sky-100/70">
              <span>Patient trend</span><span>Mon - Sun</span>
            </div>
            <svg className="mt-3 h-28 w-full text-cyan-200" viewBox="0 0 360 110" fill="none" aria-hidden="true">
              <path d="M0 90H360M0 55H360M0 20H360" stroke="rgba(255,255,255,.12)" />
              <path d="M12 92C38 80 53 82 75 64C99 44 117 70 141 64C170 56 175 28 203 34C229 40 232 72 264 58C289 47 294 24 321 34C340 41 345 28 356 22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M12 92C38 80 53 82 75 64C99 44 117 70 141 64C170 56 175 28 203 34C229 40 232 72 264 58C289 47 294 24 321 34C340 41 345 28 356 22V110H12Z" fill="url(#trendFill)" />
              <defs><linearGradient id="trendFill" x1="180" x2="180" y1="22" y2="110"><stop stopColor="#67e8f9" stopOpacity=".28" /><stop offset="1" stopColor="#67e8f9" stopOpacity="0" /></linearGradient></defs>
            </svg>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex items-end gap-2">
          {[58, 82, 120, 92, 140].map((height, index) => (
            <div key={index} className="w-12 rounded-t-lg border border-sky-100/20 bg-gradient-to-b from-sky-100 to-sky-400/75" style={{ height }} />
          ))}
        </div>

        <div className="absolute bottom-2 right-8 rounded-3xl border border-white/35 bg-white/12 px-5 py-5 text-center shadow-2xl backdrop-blur">
          <svg className="mx-auto h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="2" />
            <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-2 text-xs font-black uppercase tracking-wide">Secure</p>
          <p className="text-[10px] text-sky-100/75">Access control</p>
        </div>
      </div>
    </aside>
  );
}

export function AuthShell({
  children,
  brandName,
  brandSubtitle = "Streamline operations. Elevate care.",
  eyebrow,
  title,
  subtitle,
  footer,
  cardClassName = "",
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_10%,#ffffff_0,#f8fbff_24%,#eef4fb_60%,#e8eef6_100%)] px-4 py-6 text-[#071942] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/72 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:grid lg:grid-cols-[1.08fr_1fr]">
          <VisualPanel />

          <section className="flex min-h-[680px] items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
            <div className={`w-full max-w-[470px] rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.10)] sm:p-8 ${cardClassName}`}>
              <div className="text-center">
                <div className="mx-auto flex justify-center">
                  <BrandMark />
                </div>
                {eyebrow ? <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p> : null}
                <h1 className="mt-4 text-2xl font-black tracking-tight text-[#061849]">{brandName}</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">{brandSubtitle}</p>
                <div className="mx-auto mt-5 h-px w-12 bg-slate-300" />
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-black tracking-tight text-[#061849]">{title}</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>
              </div>

              <div className="mt-6">{children}</div>

              {footer ? <div className="mt-6">{footer}</div> : null}

              <div className="-mx-6 -mb-6 mt-8 rounded-b-[1.5rem] border-t border-slate-100 bg-slate-50 px-6 py-5 sm:-mx-8 sm:-mb-8 sm:px-8">
                <div className="flex items-center justify-center gap-3 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="2" />
                      <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-black text-[#061849]">Secure access for authorized staff</p>
                    <p className="text-xs font-medium text-slate-500">All data is encrypted and protected</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function AuthHelpLine({ href = "/contact" }: { href?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
      <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13a8 8 0 0 1 16 0v3a3 3 0 0 1-3 3h-1v-6h4M4 16v-3m0 3a3 3 0 0 0 3 3h1v-6H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Need help?</span>
      <Link href={href} className="font-bold text-blue-700 hover:text-blue-800">
        Contact admin
      </Link>
    </div>
  );
}
