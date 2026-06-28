import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type {
  ITStaffRecord,
  ITTicket,
  ITTicketCategory,
  ITTicketPriority,
  ITTicketStatus,
} from "@/lib/it/types";

function mapTicket(row: Record<string, unknown>): ITTicket {
  return {
    id: String(row.id),
    ticketRef: String(row.ticket_ref),
    title: String(row.title),
    description: String(row.description ?? ""),
    category: row.category as ITTicketCategory,
    department: String(row.department),
    priority: row.priority as ITTicketPriority,
    status: row.status as ITTicketStatus,
    assignedTo: String(row.assigned_to_name ?? "Unassigned"),
    assignedToId: row.assigned_to_id != null ? String(row.assigned_to_id) : null,
    openedBy: String(row.opened_by_name),
    openedById: row.opened_by_id != null ? String(row.opened_by_id) : null,
    openedAt: String(row.opened_at),
    resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
  };
}

async function nextTicketRef(
  admin: NonNullable<Awaited<ReturnType<typeof createTenantAdminClient>>>["admin"],
  hospitalId: string,
): Promise<string> {
  const { count } = await admin
    .from("it_tickets")
    .select("id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId);

  const seq = (count ?? 0) + 1;
  return `TK-${String(seq).padStart(5, "0")}`;
}

export async function listItTicketsAdmin(): Promise<ITTicket[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("it_tickets")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("opened_at", { ascending: false });

  if (error) {
    console.error("[listItTicketsAdmin]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapTicket(row as Record<string, unknown>));
}

export async function createItTicketAdmin(input: {
  title: string;
  description: string;
  category: ITTicketCategory;
  department: string;
  priority: ITTicketPriority;
  assignedToId: string | null;
  assignedToName: string;
  openedById: string;
  openedByName: string;
}): Promise<{ ticket: ITTicket } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const ticketRef = await nextTicketRef(admin, hospitalId);
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("it_tickets")
    .insert({
      hospital_id: hospitalId,
      ticket_ref: ticketRef,
      title: input.title,
      description: input.description,
      category: input.category,
      department: input.department,
      priority: input.priority,
      status: "Open",
      assigned_to_id: input.assignedToId,
      assigned_to_name: input.assignedToName,
      opened_by_id: input.openedById,
      opened_by_name: input.openedByName,
      opened_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create ticket." };
  }

  return { ticket: mapTicket(data as Record<string, unknown>) };
}

export async function updateItTicketAdmin(input: {
  ticketId: string;
  status?: ITTicketStatus;
  priority?: ITTicketPriority;
  assignedToId?: string | null;
  assignedToName?: string;
}): Promise<{ ticket: ITTicket } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await admin
    .from("it_tickets")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("id", input.ticketId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Ticket not found." };

  const payload: Record<string, unknown> = { updated_at: now };
  if (input.status) {
    payload.status = input.status;
    if (input.status === "Resolved" || input.status === "Closed") {
      payload.resolved_at = now;
    }
  }
  if (input.priority) payload.priority = input.priority;
  if (input.assignedToName !== undefined) payload.assigned_to_name = input.assignedToName;
  if (input.assignedToId !== undefined) payload.assigned_to_id = input.assignedToId;

  const { data, error } = await admin
    .from("it_tickets")
    .update(payload)
    .eq("id", input.ticketId)
    .eq("hospital_id", hospitalId)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not update ticket." };
  }

  return { ticket: mapTicket(data as Record<string, unknown>) };
}

export async function listHospitalStaffAdmin(): Promise<ITStaffRecord[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("staff_profiles")
    .select("id, full_name, email, department, role, is_active")
    .eq("hospital_id", hospitalId)
    .order("full_name");

  if (error) {
    console.error("[listHospitalStaffAdmin]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.full_name),
    email: String(row.email),
    role: String(row.role),
    department: String(row.department),
    isActive: Boolean(row.is_active),
    status: row.is_active ? "Active" as const : "Inactive" as const,
  }));
}

export async function updateStaffAccessAdmin(input: {
  staffId: string;
  isActive?: boolean;
  role?: string;
}): Promise<{ staff: ITStaffRecord } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.isActive !== undefined) payload.is_active = input.isActive;
  if (input.role) payload.role = input.role;

  const { data, error } = await admin
    .from("staff_profiles")
    .update(payload)
    .eq("id", input.staffId)
    .eq("hospital_id", hospitalId)
    .select("id, full_name, email, department, role, is_active")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not update staff access." };
  }

  return {
    staff: {
      id: String(data.id),
      name: String(data.full_name),
      email: String(data.email),
      role: String(data.role),
      department: String(data.department),
      isActive: Boolean(data.is_active),
      status: data.is_active ? "Active" : "Inactive",
    },
  };
}

export async function getStaffEmailInHospital(input: {
  staffId: string;
}): Promise<string | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { admin, hospitalId } = scoped;
  const { data } = await admin
    .from("staff_profiles")
    .select("email")
    .eq("hospital_id", hospitalId)
    .eq("id", input.staffId)
    .maybeSingle();

  return data?.email ? String(data.email) : null;
}
