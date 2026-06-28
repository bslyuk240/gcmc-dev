import { Suspense } from "react";
import { CashDeskClient } from "@/components/billing/cash-desk-client";

export default function CashDeskPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading cash desk…</p>}>
      <CashDeskClient />
    </Suspense>
  );
}
