import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { getAdminBillingOverviewAction } from "@/server/actions/admin/billing";
import { AdminBillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  const result = await getAdminBillingOverviewAction();
  if (!result.success) {
    return (
      <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {result.error}
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading billing…</div>}>
      <AdminBillingClient overview={result.data} />
    </Suspense>
  );
}
