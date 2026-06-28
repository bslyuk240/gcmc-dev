import { notFound } from "next/navigation";
import { getPlatformInvoiceAction } from "@/server/actions/platform/invoices";
import { InvoiceDetailClient } from "./invoice-detail-client";

export default async function PlatformInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPlatformInvoiceAction(id);

  if (!result.success) {
    if (result.error === "Invoice not found.") notFound();
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {result.error}
      </div>
    );
  }

  return <InvoiceDetailClient invoice={result.data} />;
}
