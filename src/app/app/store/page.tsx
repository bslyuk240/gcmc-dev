import { Suspense } from "react";
import { StoreDashboardClient } from "@/components/store/store-dashboard-client";

export default function StoreDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading store dashboard…</p>}>
      <StoreDashboardClient />
    </Suspense>
  );
}
