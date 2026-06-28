import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  canManageInpatientBilling,
  canOpenInpatientStay,
  canViewInpatientBilling,
} from "@/lib/inpatient/access";
import {
  addBedDayCharge,
  createInpatientStay,
  dischargeInpatientStay,
  getInpatientStaySummary,
  listInpatientStays,
  transferInpatientStay,
} from "@/lib/inpatient/service";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || !canViewInpatientBilling(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const stayId = searchParams.get("stayId");
  if (stayId) {
    const summary = await getInpatientStaySummary(stayId);
    if (!summary) return NextResponse.json({ error: "Stay not found." }, { status: 404 });
    return NextResponse.json({ summary });
  }

  const status = searchParams.get("status");
  const patientId = searchParams.get("patientId") ?? undefined;
  const stays = await listInpatientStays({
    status: status === "active" || status === "discharged" ? status : undefined,
    patientId,
  });

  return NextResponse.json({ stays });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || !canOpenInpatientStay(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.patientId || !body?.patientName || !body?.unit) {
    return NextResponse.json({ error: "patientId, patientName, and unit are required." }, { status: 400 });
  }

  const result = await createInpatientStay({
    patientId: String(body.patientId),
    patientName: String(body.patientName),
    unit: String(body.unit),
    bed: body.bed != null ? String(body.bed) : null,
    admissionOrderId: body.admissionOrderId != null ? String(body.admissionOrderId) : null,
    wardPatientId: body.wardPatientId != null ? String(body.wardPatientId) : null,
    doctorInCharge: body.doctorInCharge != null ? String(body.doctorInCharge) : null,
    recordedBy: session.full_name,
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ stay: result.stay }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  if (body.action === "discharge") {
    if (!canOpenInpatientStay(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await dischargeInpatientStay({
      stayId: body.stayId != null ? String(body.stayId) : undefined,
      patientId: body.patientId != null ? String(body.patientId) : undefined,
      unit: body.unit != null ? String(body.unit) : undefined,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ stay: result.stay });
  }

  if (body.action === "add_bed_day") {
    if (!canManageInpatientBilling(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.stayId) return NextResponse.json({ error: "stayId is required." }, { status: 400 });
    const result = await addBedDayCharge({
      stayId: String(body.stayId),
      recordedBy: session.full_name,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ charge: result.charge });
  }

  if (body.action === "transfer") {
    if (!canOpenInpatientStay(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.patientId || !body.patientName || !body.fromUnit || !body.toUnit) {
      return NextResponse.json({ error: "patientId, patientName, fromUnit, and toUnit are required." }, { status: 400 });
    }
    const result = await transferInpatientStay({
      patientId: String(body.patientId),
      patientName: String(body.patientName),
      fromUnit: String(body.fromUnit),
      toUnit: String(body.toUnit),
      bed: body.bed != null ? String(body.bed) : null,
      wardPatientId: body.wardPatientId != null ? String(body.wardPatientId) : null,
      doctorInCharge: body.doctorInCharge != null ? String(body.doctorInCharge) : null,
      recordedBy: session.full_name,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ stay: result.stay });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
