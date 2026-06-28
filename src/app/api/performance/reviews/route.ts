import { NextResponse } from "next/server";
import { getServerSession, getStaffPortalSession } from "@/lib/auth/session";
import { isDBDepartmentKey } from "@/lib/constants/navigation";
import {
  canManagePerformanceForDepartment,
  canViewAnyPerformance,
  isHodSelfReview,
} from "@/lib/performance/access";
import {
  acknowledgePerformanceReviewAdmin,
  listPerformanceReviewsAdmin,
  listPerformanceReviewsForStaff,
  upsertPerformanceReviewAdmin,
} from "@/lib/performance/service";
import type { KpiScore } from "@/lib/performance/types";
import {
  notifyPerformanceReviewAcknowledged,
  notifyPerformanceReviewSubmitted,
} from "@/lib/email/notifications";

async function resolveSession() {
  const management = await getServerSession();
  if (management) return management;
  return getStaffPortalSession();
}

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department") ?? "";
  const mine = searchParams.get("mine") === "1";

  if (mine) {
    const reviews = session.hospital_id
      ? await listPerformanceReviewsForStaff({
          hospitalId: session.hospital_id,
          staffId: session.staff_id,
        })
      : [];
    return NextResponse.json({ reviews });
  }

  if (department) {
    if (!isDBDepartmentKey(department)) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 });
    }
    if (!canManagePerformanceForDepartment(session, department)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const reviews = await listPerformanceReviewsAdmin({ department });
    return NextResponse.json({ reviews });
  }

  if (!canViewAnyPerformance(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const reviews = await listPerformanceReviewsAdmin({});
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const staffId = String(body?.staffId ?? "").trim();
  const staffName = String(body?.staffName ?? "").trim();
  const department = String(body?.department ?? "").trim();
  const period = String(body?.period ?? "").trim();
  const periodLabel = String(body?.periodLabel ?? "").trim();
  const kpiScores = Array.isArray(body?.kpiScores) ? body.kpiScores as KpiScore[] : [];
  const overallRating = body?.overallRating != null ? Number(body.overallRating) : null;
  const strengths = String(body?.strengths ?? "");
  const improvements = String(body?.improvements ?? "");
  const comments = String(body?.comments ?? "");
  const status = String(body?.status ?? "draft").trim();
  const id = body?.id ? String(body.id).trim() : undefined;

  if (
    !staffId
    || !staffName
    || !isDBDepartmentKey(department)
    || !period
    || !periodLabel
    || !["draft", "submitted"].includes(status)
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!canManagePerformanceForDepartment(session, department)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (isHodSelfReview(session, staffId)) {
    return NextResponse.json({ error: "hod_cannot_review_self" }, { status: 403 });
  }

  if (status === "submitted" && (overallRating == null || overallRating <= 0)) {
    return NextResponse.json({ error: "rating_required" }, { status: 400 });
  }

  const result = await upsertPerformanceReviewAdmin({
    id,
    staffId,
    staffName,
    department,
    reviewerId: session.staff_id,
    reviewerName: session.full_name,
    period,
    periodLabel,
    kpiScores,
    overallRating,
    strengths,
    improvements,
    comments,
    status: status as "draft" | "submitted",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (result.review.status === "submitted") {
    await notifyPerformanceReviewSubmitted({
      staffId: result.review.staffId,
      staffName: result.review.staffName,
      periodLabel: result.review.periodLabel,
      overallRating: result.review.overallRating,
      reviewerName: session.full_name,
    });
  }

  return NextResponse.json({ review: result.review });
}

export async function PATCH(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reviewId = String(body?.reviewId ?? "").trim();
  const action = String(body?.action ?? "").trim();

  if (!reviewId || action !== "acknowledge") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await acknowledgePerformanceReviewAdmin({
    reviewId,
    staffId: session.staff_id,
  });

  if ("error" in result) {
    const status = result.error.includes("not found") ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  await notifyPerformanceReviewAcknowledged({
    staffName: result.review.staffName,
    department: result.review.department,
    periodLabel: result.review.periodLabel,
  });

  return NextResponse.json({ review: result.review });
}
