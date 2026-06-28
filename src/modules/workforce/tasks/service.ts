import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type {
  WorkforceTask,
  WorkforceTaskCategory,
  WorkforceTaskPriority,
  WorkforceTaskStatus,
} from "@/lib/workforce/types";

function mapTask(row: Record<string, unknown>): WorkforceTask {
  return {
    id: String(row.id),
    hospitalId: String(row.hospital_id),
    department: String(row.department ?? "non_clinical"),
    unitName: String(row.unit_name),
    title: String(row.title),
    description: row.description != null ? String(row.description) : undefined,
    category: (row.category as WorkforceTaskCategory) ?? "general",
    assigneeId: row.assignee_id != null ? String(row.assignee_id) : undefined,
    assigneeName: row.assignee_name != null ? String(row.assignee_name) : undefined,
    assignedBy: row.assigned_by != null ? String(row.assigned_by) : undefined,
    status: (row.status as WorkforceTaskStatus) ?? "pending",
    priority: (row.priority as WorkforceTaskPriority) ?? "routine",
    dueAt: row.due_at != null ? String(row.due_at) : undefined,
    completedAt: row.completed_at != null ? String(row.completed_at) : undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listWorkforceTasks(input: {
  unitName?: string;
  assigneeId?: string;
  status?: WorkforceTaskStatus;
}): Promise<WorkforceTask[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  let query = admin
    .from("workforce_tasks")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false });

  if (input.unitName) query = query.eq("unit_name", input.unitName);
  if (input.assigneeId) query = query.eq("assignee_id", input.assigneeId);
  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) {
    console.error("[listWorkforceTasks]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapTask(row as Record<string, unknown>));
}

export async function createWorkforceTask(input: {
  unitName: string;
  title: string;
  description?: string;
  category?: WorkforceTaskCategory;
  assigneeId?: string;
  assigneeName?: string;
  assignedBy?: string;
  priority?: WorkforceTaskPriority;
  dueAt?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ task: WorkforceTask } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("workforce_tasks")
    .insert({
      hospital_id: hospitalId,
      department: "non_clinical",
      unit_name: input.unitName,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? "general",
      assignee_id: input.assigneeId ?? null,
      assignee_name: input.assigneeName ?? null,
      assigned_by: input.assignedBy ?? null,
      priority: input.priority ?? "routine",
      due_at: input.dueAt ?? null,
      metadata: input.metadata ?? {},
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create task." };
  }

  return { task: mapTask(data as Record<string, unknown>) };
}

export async function updateWorkforceTaskStatus(
  taskId: string,
  status: WorkforceTaskStatus,
): Promise<{ task: WorkforceTask } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "completed") {
    patch.completed_at = new Date().toISOString();
  }

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("workforce_tasks")
    .update(patch)
    .eq("hospital_id", hospitalId)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not update task." };
  }

  return { task: mapTask(data as Record<string, unknown>) };
}

export async function getWorkforceTaskById(taskId: string): Promise<WorkforceTask | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { data, error } = await scoped.admin
    .from("workforce_tasks")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", taskId)
    .maybeSingle();

  if (error || !data) return null;
  return mapTask(data as Record<string, unknown>);
}
