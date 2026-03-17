import Link from "next/link";
import { appConfig } from "@/lib/config/app";
import { publicNavigation } from "@/lib/constants/navigation";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="surface sticky top-4 z-20 flex flex-col gap-4 rounded-[30px] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white">
              {appConfig.appShortName}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
                Healthcare Operations Platform
              </p>
              <h1 className="text-lg font-semibold text-slate-950">
                {appConfig.appName}
              </h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="py-6">{children}</div>

        <footer className="surface rounded-[30px] px-6 py-5 text-sm text-slate-500">
          © {new Date().getFullYear()} {appConfig.appName}. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
