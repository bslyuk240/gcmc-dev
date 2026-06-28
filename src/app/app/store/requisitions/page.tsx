import { Suspense } from "react";
import { StoreRequisitionsClient } from "@/components/store/store-requisitions-client";

export default function StoreRequisitionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading requisitions…</p>}>
      <StoreRequisitionsClient />
    </Suspense>
  );
}
