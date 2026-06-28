import { Suspense } from "react";
import { StoreMovementsClient } from "@/components/store/store-movements-client";

export default function StoreMovementsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading ledger…</p>}>
      <StoreMovementsClient />
    </Suspense>
  );
}
