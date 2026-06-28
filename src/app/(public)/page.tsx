import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve";

export default async function HomePage() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "";
  const tenantSlug = resolveTenantSlugFromHost(host);

  if (tenantSlug) {
    redirect("/login");
  }

  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();
  if (marketingUrl) {
    redirect(marketingUrl);
  }

  redirect("/hospital-signup");
}
