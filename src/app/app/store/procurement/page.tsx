import { Suspense } from "react";
import { StoreProcurementClient } from "@/components/store/store-procurement-client";

export default function StoreProcurementPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading procurement…</p>}>
      <StoreProcurementClient />
    </Suspense>
  );
}
