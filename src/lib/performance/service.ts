import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { DBDepartmentKey } from "@/lib/constants/navigation";
import type {
  PerformanceReview,
  UpsertPerformanceReviewInput,
} from "@/lib/performance/types";

function mapReview(row: Record<string, unknown>): PerformanceReview {
  return {
    id: String(row.id),
    staffId: String(row.staff_id),
    staffName: String(row.staff_name),
    department: String(row.department),
    reviewerId: String(row.reviewer_id),
    reviewerName: String(row.reviewer_name),
    period: String(row.period),
    periodLabel: String(row.period_label),
    kpiScores: (row.kpi_scores as PerformanceReview["kpiScores"]) ?? [],
    overallRating: row.overall_rating != null ? Number(row.overall_rating) : null,
    strengths: String(row.strengths ?? ""),
    improvements: String(row.improvements ?? ""),
    comments: String(row.comments ?? ""),
    status: row.status as PerformanceReview["status"],
    submittedAt: row.submitted_at != null ? String(row.submitted_at) : null,
    acknowledgedAt: row.acknowledged_at != null ? String(row.acknowledged_at) : null,
    createdAt: String(row.created_at),
  };
}

export async function listPerformanceReviewsAdmin(input: {
  department?: DBDepartmentKey;
  staffId?: string;
}): Promise<PerformanceReview[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  let query = admin
    .from("performance_reviews")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false });

  if (input.department) query = query.eq("department", input.department);
  if (input.staffId) query = query.eq("staff_id", input.staffId);

  const { data, error } = await query;
  if (error) {
    console.error("[listPerformanceReviewsAdmin]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapReview(row as Record<string, unknown>));
}

export async function upsertPerformanceReviewAdmin(
  input: UpsertPerformanceReviewInput,
): Promise<{ review: PerformanceReview } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const now = new Date().toISOString();
  const submittedAt = input.status === "submitted" ? now : null;

  if (input.id) {
    const { data: existing, error: fetchError } = await admin
      .from("performance_reviews")
      .select("*")
      .eq("hospital_id", hospitalId)
      .eq("id", input.id)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!existing) return { error: "Review not found." };
    if (String(existing.status) === "acknowledged") {
      return { error: "Acknowledged reviews cannot be edited." };
    }
  }

  const payload: Record<string, unknown> = {
    hospital_id: hospitalId,
    staff_id: input.staffId,
    staff_name: input.staffName,
    department: input.department,
    reviewer_id: input.reviewerId,
    reviewer_name: input.reviewerName,
    period: input.period,
    period_label: input.periodLabel,
    kpi_scores: input.kpiScores,
    overall_rating: input.overallRating,
    strengths: input.strengths,
    improvements: input.improvements,
    comments: input.comments,
    status: input.status,
    submitted_at: submittedAt,
    updated_at: now,
  };

  const query = input.id
    ? admin
      .from("performance_reviews")
      .update(payload)
      .eq("id", input.id)
      .eq("hospital_id", hospitalId)
    : admin.from("performance_reviews").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "A review for this staff member and period already exists." };
    }
    return { error: error?.message ?? "Could not save performance review." };
  }

  return { review: mapReview(data as Record<string, unknown>) };
}

export async function acknowledgePerformanceReviewAdmin(input: {
  reviewId: string;
  staffId: string;
}): Promise<{ review: PerformanceReview } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await admin
    .from("performance_reviews")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("id", input.reviewId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Review not found." };
  if (String(existing.staff_id) !== input.staffId) {
    return { error: "You can only acknowledge your own reviews." };
  }
  if (String(existing.status) !== "submitted") {
    return { error: "Only submitted reviews can be acknowledged." };
  }

  const { data, error } = await admin
    .from("performance_reviews")
    .update({
      status: "acknowledged",
      acknowledged_at: now,
      updated_at: now,
    })
    .eq("id", input.reviewId)
    .eq("hospital_id", hospitalId)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not acknowledge review." };
  }

  return { review: mapReview(data as Record<string, unknown>) };
}

export async function listPerformanceReviewsForStaff(input: {
  hospitalId: string;
  staffId: string;
}): Promise<PerformanceReview[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("performance_reviews")
    .select("*")
    .eq("hospital_id", input.hospitalId)
    .eq("staff_id", input.staffId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listPerformanceReviewsForStaff]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapReview(row as Record<string, unknown>));
}
