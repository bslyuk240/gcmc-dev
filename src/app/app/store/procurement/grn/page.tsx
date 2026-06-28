import { Suspense } from "react";
import { StoreGrnClient } from "@/components/store/store-grn-client";

export default function StoreGrnPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading GRN…</p>}>
      <StoreGrnClient />
    </Suspense>
  );
}
