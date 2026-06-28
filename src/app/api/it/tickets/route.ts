import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { canManageItHelpdesk, canViewItHelpdesk } from "@/lib/it/access";
import {
  createItTicketAdmin,
  listItTicketsAdmin,
  updateItTicketAdmin,
} from "@/lib/it/service";
import type { ITTicketCategory, ITTicketPriority, ITTicketStatus } from "@/lib/it/types";
import {
  notifyItTicketCreated,
  notifyItTicketUpdated,
} from "@/lib/email/notifications";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canViewItHelpdesk(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tickets = await listItTicketsAdmin();
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canManageItHelpdesk(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const category = String(body?.category ?? "Other").trim();
  const department = String(body?.department ?? "").trim();
  const priority = String(body?.priority ?? "Medium").trim();
  const assignedToId = body?.assignedToId ? String(body.assignedToId).trim() : null;
  const assignedToName = String(body?.assignedToName ?? "Unassigned").trim();

  const validCategories = ["Network", "Access", "Software", "Hardware", "Email", "System", "Other"];
  const validPriorities = ["Low", "Medium", "High", "Critical", "Normal", "Urgent"];

  if (!title || !department || !validCategories.includes(category) || !validPriorities.includes(priority)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await createItTicketAdmin({
    title,
    description,
    category: category as ITTicketCategory,
    department,
    priority: priority as ITTicketPriority,
    assignedToId,
    assignedToName,
    openedById: session.staff_id,
    openedByName: session.full_name,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyItTicketCreated({
    ticketRef: result.ticket.ticketRef,
    title: result.ticket.title,
    priority: result.ticket.priority,
    openedBy: result.ticket.openedBy,
    assignedToId: result.ticket.assignedToId,
  });

  return NextResponse.json({ ticket: result.ticket });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canManageItHelpdesk(session) && !canViewItHelpdesk(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ticketId = String(body?.ticketId ?? "").trim();
  const status = body?.status ? String(body.status).trim() : undefined;
  const priority = body?.priority ? String(body.priority).trim() : undefined;
  const assignedToId = body?.assignedToId !== undefined
    ? (body.assignedToId ? String(body.assignedToId).trim() : null)
    : undefined;
  const assignedToName = body?.assignedToName !== undefined
    ? String(body.assignedToName).trim()
    : undefined;

  if (!ticketId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await updateItTicketAdmin({
    ticketId,
    status: status as ITTicketStatus | undefined,
    priority: priority as ITTicketPriority | undefined,
    assignedToId,
    assignedToName,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyItTicketUpdated({
    ticketRef: result.ticket.ticketRef,
    title: result.ticket.title,
    status: result.ticket.status,
    openedById: result.ticket.openedById,
    assignedToId: result.ticket.assignedToId,
  });

  return NextResponse.json({ ticket: result.ticket });
}
