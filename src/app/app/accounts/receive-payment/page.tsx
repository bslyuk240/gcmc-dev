import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyReceivePaymentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const invoice = typeof params.invoice === "string" ? params.invoice : undefined;
  if (invoice) {
    redirect(`/app/accounts/invoices?invoice=${encodeURIComponent(invoice)}`);
  }
  redirect("/app/accounts/cash-desk");
}
