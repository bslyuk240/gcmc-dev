import Link from "next/link";
import { publicNavigation } from "@/lib/constants/navigation";
import { getTenantBrandingOrNull } from "@/lib/tenant/get-branding";

const PLATFORM_NAME       = "HMS Platform";
const PLATFORM_SHORT_NAME = "HMS";
const PLATFORM_TAGLINE    = "Hospital Management System";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // null → root/platform domain; non-null → tenant subdomain (e.g. gcmc.skolahq.com)
  const branding = await getTenantBrandingOrNull();

  const displayName  = branding?.name      ?? PLATFORM_NAME;
  const shortName    = branding?.shortName  ?? PLATFORM_SHORT_NAME;
  const logoUrl      = branding?.logoUrl    ?? null;
  const tagline      = branding ? "Healthcare Operations Platform" : PLATFORM_TAGLINE;

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="surface sticky top-4 z-20 flex flex-col gap-4 rounded-[30px] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-11 w-11 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white">
                {shortName.slice(0, 3)}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
                {tagline}
              </p>
              <h1 className="text-lg font-semibold text-slate-950">{displayName}</h1>
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
            {/* On root domain, show a CTA to the hospital signup */}
            {!branding && (
              <Link
                href="/hospital-signup"
                className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Register your hospital
              </Link>
            )}
          </nav>
        </header>

        <div className="py-6">{children}</div>

        <footer className="surface rounded-[30px] px-6 py-5 text-sm text-slate-500">
          © {new Date().getFullYear()} {displayName}. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
