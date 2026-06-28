import "server-only";

import { listHmoClaims } from "@/modules/nhis/claims/service";
import { listHmoEnrollments, listPendingHmoRegistrations } from "@/modules/nhis/enrollments/service";
import { listPreauthorizations } from "@/modules/nhis/preauth/service";
import { listHmoSchemes } from "@/modules/nhis/schemes/service";
import type { HmoClaimStatus, NhisDashboardSummary } from "@/modules/nhis/types";

export async function getNhisDashboard(): Promise<NhisDashboardSummary> {
  const [schemes, enrollments, claims, pendingRegistrations, preauths] = await Promise.all([
    listHmoSchemes(),
    listHmoEnrollments(),
    listHmoClaims(),
    listPendingHmoRegistrations(),
    listPreauthorizations({ status: "pending" }),
  ]);

  const activeEnrollments = enrollments.filter(
    (e) => e.isActive && e.verificationStatus === "verified",
  );
  const pendingVerifications = enrollments.filter((e) => e.verificationStatus === "pending");
  const activeClaims = claims.filter((c) => c.status !== "paid" && c.status !== "rejected");
  const draftClaims = claims.filter((c) => c.status === "draft");
  const hmoReceivables = claims
    .filter((c) => ["submitted", "approved", "partial"].includes(c.status))
    .reduce((sum, c) => sum + c.hmoAmount - (c.amountPaid ?? 0), 0);

  const statusCounts: Record<HmoClaimStatus, number> = {
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    partial: 0,
  };
  for (const c of claims) {
    if (c.status in statusCounts) statusCounts[c.status]++;
  }

  const recentClaims = [...claims]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  const schemeBreakdown = schemes
    .filter((s) => s.isActive)
    .map((scheme) => {
      const enrolledCount = activeEnrollments.filter((e) => e.schemeId === scheme.id).length;
      const pendingAmount = claims
        .filter(
          (c) =>
            c.schemeId === scheme.id &&
            ["submitted", "approved", "partial"].includes(c.status),
        )
        .reduce((sum, c) => sum + c.hmoAmount - (c.amountPaid ?? 0), 0);
      return { scheme, enrolledCount, pendingAmount };
    })
    .filter((x) => x.enrolledCount > 0 || x.pendingAmount > 0);

  return {
    activeEnrollments: activeEnrollments.length,
    pendingVerifications: pendingVerifications.length,
    pendingRegistrations: pendingRegistrations.length,
    activeClaims: activeClaims.length,
    draftClaims: draftClaims.length,
    hmoReceivables,
    statusCounts,
    recentClaims,
    schemeBreakdown,
    pendingRegistrationsList: pendingRegistrations,
    pendingVerificationsList: pendingVerifications,
    pendingPreauthorizations: preauths.length,
  };
}
