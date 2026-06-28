import { Suspense } from "react";
import { StoreReportsClient } from "@/components/store/store-reports-client";

export default function StoreReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading reports…</p>}>
      <StoreReportsClient />
    </Suspense>
  );
}
