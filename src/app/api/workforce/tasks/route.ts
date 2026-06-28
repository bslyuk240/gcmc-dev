import { NextResponse } from "next/server";
import { getServerSession, getStaffPortalSession } from "@/lib/auth/session";
import { fetchMyNcUnit } from "@/lib/supabase/db";
import {
  isWorkforceAdmin,
  isWorkforceUnitHod,
} from "@/lib/workforce/access";
import {
  createWorkforceTask,
  getWorkforceTaskById,
  listWorkforceTasks,
  updateWorkforceTaskStatus,
} from "@/modules/workforce/tasks/service";
import { canUpdateWorkforceTask } from "@/modules/staff-portal/access";
import type { WorkforceTaskStatus } from "@/lib/workforce/types";
import {
  notifyWorkforceTaskAssigned,
  notifyWorkforceTaskStatusChanged,
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
  const unitName = searchParams.get("unitName") ?? undefined;
  const mine = searchParams.get("mine") === "1";

  if (mine) {
    const tasks = await listWorkforceTasks({ assigneeId: session.staff_id });
    return NextResponse.json({ tasks });
  }

  if (isWorkforceAdmin(session)) {
    const tasks = await listWorkforceTasks({ unitName });
    return NextResponse.json({ tasks });
  }

  if (isWorkforceUnitHod(session)) {
    const hodUnit = await fetchMyNcUnit(session.staff_id);
    const scopedUnit = unitName && unitName === hodUnit ? unitName : hodUnit ?? undefined;
    const tasks = await listWorkforceTasks({ unitName: scopedUnit ?? undefined });
    return NextResponse.json({ tasks });
  }

  if (session.department === "non_clinical") {
    const tasks = await listWorkforceTasks({ assigneeId: session.staff_id });
    return NextResponse.json({ tasks });
  }

  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const unitName = String(body?.unitName ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const description = body?.description ? String(body.description) : undefined;
  const category = body?.category ? String(body.category) : undefined;
  const assigneeId = body?.assigneeId ? String(body.assigneeId) : undefined;
  const assigneeName = body?.assigneeName ? String(body.assigneeName) : undefined;
  const priority = body?.priority ? String(body.priority) : undefined;
  const dueAt = body?.dueAt ? String(body.dueAt) : undefined;

  if (!unitName || !title) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (isWorkforceUnitHod(session) && !isWorkforceAdmin(session)) {
    const hodUnit = await fetchMyNcUnit(session.staff_id);
    if (hodUnit !== unitName) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (!isWorkforceAdmin(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await createWorkforceTask({
    unitName,
    title,
    description,
    category: category as Parameters<typeof createWorkforceTask>[0]["category"],
    assigneeId,
    assigneeName,
    assignedBy: session.full_name,
    priority: priority as Parameters<typeof createWorkforceTask>[0]["priority"],
    dueAt,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyWorkforceTaskAssigned({
    assigneeId: result.task.assigneeId,
    assigneeName: result.task.assigneeName,
    title: result.task.title,
    unitName: result.task.unitName,
    priority: result.task.priority,
    dueAt: result.task.dueAt,
  });

  return NextResponse.json({ task: result.task });
}

export async function PATCH(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const taskId = String(body?.id ?? "").trim();
  const status = String(body?.status ?? "").trim() as WorkforceTaskStatus;

  if (!taskId || !status) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const existing = await getWorkforceTaskById(taskId);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const hodUnit = isWorkforceUnitHod(session) ? await fetchMyNcUnit(session.staff_id) : null;
  if (!canUpdateWorkforceTask(session, existing, hodUnit)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await updateWorkforceTaskStatus(taskId, status);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyWorkforceTaskStatusChanged({
    title: result.task.title,
    status: result.task.status,
    unitName: result.task.unitName,
  });

  return NextResponse.json({ task: result.task });
}
