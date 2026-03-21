"use client";

/**
 * Supabase browser-side data layer.
 *
 * All functions use the anon key + RLS — the user must be authenticated
 * (Supabase session active) for writes to succeed.
 *
 * Field mapping: DB snake_case → TypeScript camelCase handled here.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  DoctorProfile,
  ConsultationRecord,
  AdmissionOrder,
} from "@/lib/data/doctors-store";
import type {
  SharedPrescription,
  NurseMedRequest,
  PharmacyRestockRequest,
  StoreInventorySnapshot,
  PharmacyBill,
  PharmacyDrugItem,
} from "@/lib/data/pharmacy-store";
import type {
  LabTest,
  TestCatalogItem,
} from "@/lib/data/lab-store";
import type {
  WardPatient,
  NursingProcedure,
  NurseSampleRequest,
  ICUVitalsEntry,
} from "@/lib/data/nurses-store";
import type {
  FrontDeskCharge,
  ConsultationFee,
  SupplierPayment,
  PayrollBatch,
  PayrollEntry,
  KioskSale,
  LabCharge,
  NursingCharge,
} from "@/lib/data/accounts-store";
import type {
  StaffMember,
  DepartmentHead,
  LeaveRequest,
  OnboardingRecord,
  OffboardingRecord,
  PayrollPrep,
  GeneratedPayslip,
} from "@/lib/data/hr-store";
import { normalizeDoctorSpecialty } from "@/lib/utils/doctor-routing";
import {
  DB_TO_STAFF_DEPT as dbToStaffDeptMap,
  ROLE_KEY_LABELS,
  STAFF_DEPT_TO_DB,
} from "@/lib/data/hr-store";
import type {
  AdminApproval,
  DeptAlert,
  ITTicket,
  StoreItem,
  StorePO,
} from "@/lib/data/admin-store";
import { pushNotification } from "@/lib/data/notification-store";
import type { AppNotification } from "@/lib/data/notification-store";
import type {
  HmoScheme,
  HmoTariff,
  HmoEnrollment,
  HmoClaim,
} from "@/lib/data/nhis-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient();
}

function describeSupabaseError(
  error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined,
  context: string,
) {
  if (!error) return context;
  const parts = [error.message, error.details, error.hint, error.code ? `code ${error.code}` : ""].filter(Boolean);
  return parts.length ? `${context}: ${parts.join(" | ")}` : context;
}

function isMissingColumnError(error: { message?: string } | null | undefined, column: string) {
  return (error?.message ?? "").toLowerCase().includes(`column ${column.toLowerCase()} does not exist`);
}

function withoutSpecialty<T extends { specialty?: unknown }>(payload: T): Omit<T, "specialty"> {
  const fallbackPayload = { ...payload };
  delete fallbackPayload.specialty;
  return fallbackPayload;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toIsoTimestamp(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

// ─── Doctors ─────────────────────────────────────────────────────────────────

function mapDoctor(r: Record<string, unknown>): DoctorProfile {
  return {
    id: r.id as string,
    name: r.name as string,
    specialty: r.specialty as string,
    qualifications: r.qualifications as string,
    status: r.status as DoctorProfile["status"],
    consultationsToday: (r.consultations_today as number) ?? 0,
    avgConsultMins: (r.avg_consult_mins as number) ?? 0,
  };
}

function mapConsultation(r: Record<string, unknown>): ConsultationRecord {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: r.patient_id as string,
    doctorName: r.doctor_name as string,
    consultType: r.consult_type as ConsultationRecord["consultType"],
    date: r.date as string,
    time: (r.time as string) ?? "",
    status: r.status as ConsultationRecord["status"],
    chiefComplaint: (r.chief_complaint as string) ?? "",
    diagnosis: r.diagnosis as string | undefined,
    notes: r.notes as string | undefined,
    rxWritten: Boolean(r.rx_written),
    labOrdered: Boolean(r.lab_ordered),
    admissionOrdered: Boolean(r.admission_ordered),
    admissionUnit: r.admission_unit as ConsultationRecord["admissionUnit"],
    consultFee: (r.consult_fee as number) ?? 0,
    feePaid: Boolean(r.fee_paid),
  };
}

function mapAdmissionOrder(r: Record<string, unknown>): AdmissionOrder {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: r.patient_id as string,
    orderedBy: r.ordered_by as string,
    unit: r.unit as AdmissionOrder["unit"],
    reason: (r.reason as string) ?? "",
    orderedAt: (r.ordered_at as string) ?? "",
    status: r.status as AdmissionOrder["status"],
  };
}

export async function fetchDoctors(): Promise<DoctorProfile[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const [{ data: profileRows, error: profileError }, staffResponse] = await Promise.all([
    sb.from("doctor_profiles").select("*"),
    sb
      .from("staff_profiles")
      .select("id, full_name, role")
      .eq("department", "doctors")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  if (profileError) throw new Error(profileError.message);
  const staffRows = staffResponse.data ?? [];
  const staffError = staffResponse.error;
  if (staffError) throw new Error(staffError.message);

  const profiles = (profileRows ?? []).map(mapDoctor);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const profileByName = new Map(profiles.map((profile) => [profile.name.trim().toLowerCase(), profile]));

  if ((staffRows ?? []).length > 0) {
    return (staffRows ?? []).map((row) => {
      const staffId = row.id as string;
      const staffName = ((row.full_name as string) ?? "").trim();
      const matchedProfile = profileById.get(staffId) ?? profileByName.get(staffName.toLowerCase());

      return {
        id: staffId,
        name: staffName,
        specialty: matchedProfile?.specialty || "",
        qualifications: matchedProfile?.qualifications ?? "",
        status: "On Duty" as const,
        consultationsToday: matchedProfile?.consultationsToday ?? 0,
        avgConsultMins: matchedProfile?.avgConsultMins ?? 0,
      };
    });
  }

  return profiles;
}

export async function fetchConsultations(): Promise<ConsultationRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("consultations").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapConsultation);
}

export async function fetchAdmissionOrders(): Promise<AdmissionOrder[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("admission_orders").select("*").order("ordered_at", { ascending: false });
  return (data ?? []).map(mapAdmissionOrder);
}

export async function insertConsultation(c: ConsultationRecord): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("consultations").upsert({
    id: c.id, patient_name: c.patientName, patient_id: c.patientId,
    doctor_name: c.doctorName, consult_type: c.consultType, date: c.date,
    time: c.time, status: c.status, chief_complaint: c.chiefComplaint,
    diagnosis: c.diagnosis, notes: c.notes, rx_written: c.rxWritten,
    lab_ordered: c.labOrdered, admission_ordered: c.admissionOrdered,
    admission_unit: c.admissionUnit, consult_fee: c.consultFee, fee_paid: c.feePaid,
  });
  if (error) throw new Error(error.message);
}

export async function upsertConsultation(id: string, updates: Partial<ConsultationRecord>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const patch: Record<string, unknown> = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.diagnosis !== undefined) patch.diagnosis = updates.diagnosis;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.rxWritten !== undefined) patch.rx_written = updates.rxWritten;
  if (updates.labOrdered !== undefined) patch.lab_ordered = updates.labOrdered;
  if (updates.admissionOrdered !== undefined) patch.admission_ordered = updates.admissionOrdered;
  if (updates.admissionUnit !== undefined) patch.admission_unit = updates.admissionUnit;
  if (updates.feePaid !== undefined) patch.fee_paid = updates.feePaid;
  const { error } = await sb.from("consultations").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertAdmissionOrder(a: AdmissionOrder): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("admission_orders").upsert({
    id: a.id, patient_name: a.patientName, patient_id: a.patientId,
    ordered_by: a.orderedBy, unit: a.unit, reason: a.reason,
    ordered_at: a.orderedAt, status: a.status,
  });
  if (error) throw new Error(error.message);
}

// ─── Pharmacy ─────────────────────────────────────────────────────────────────

function mapPrescription(r: Record<string, unknown>, drugs: Record<string, unknown>[]): SharedPrescription {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: r.patient_id as string,
    doctorName: r.doctor_name as string,
    department: (r.department as string) ?? "",
    urgency: r.urgency as SharedPrescription["urgency"],
    drugs: drugs.map((d) => ({
      name: d.name as string,
      dosage: (d.dosage as string) ?? "",
      frequency: (d.frequency as string) ?? "",
      duration: (d.duration as string) ?? "",
      qty: String(d.qty ?? ""),
      unitPrice: (d.unit_price as number) ?? 0,
    })),
    notes: r.notes as string | undefined,
    createdAt: (r.created_at as string) ?? "",
    status: r.status as SharedPrescription["status"],
    dispensedAt: r.dispensed_at as string | undefined,
    dispensedBy: r.dispensed_by as string | undefined,
    totalCost: r.total_cost as number | undefined,
  };
}

function mapNurseMedRequest(r: Record<string, unknown>): NurseMedRequest {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: r.patient_id as string,
    ward: (r.ward as string) ?? "",
    requestedBy: r.requested_by as string,
    drug: r.drug as string,
    dosage: (r.dosage as string) ?? "",
    route: (r.route as string) ?? "",
    qty: String(r.qty ?? ""),
    urgency: r.urgency as NurseMedRequest["urgency"],
    notes: r.notes as string | undefined,
    requestedAt: (r.requested_at as string) ?? "",
    status: r.status as NurseMedRequest["status"],
    preparedAt: r.prepared_at as string | undefined,
    preparedBy: r.prepared_by as string | undefined,
  };
}

function mapRestockRequest(r: Record<string, unknown>): PharmacyRestockRequest {
  const snapshot = r.store_snapshot as Record<string, unknown> | null | undefined;
  return {
    id: r.id as string,
    drug: r.drug as string,
    inventoryItemId: (r.inventory_item_id as string) ?? undefined,
    storeInventoryId: (r.store_inventory_id as string) ?? undefined,
    storeSnapshot: snapshot
      ? {
          id: (snapshot.id as string) ?? "",
          name: (snapshot.name as string) ?? "",
          category: (snapshot.category as string) ?? "",
          form: snapshot.form as string | undefined,
          unit: (snapshot.unit as string) ?? "Units",
          qty: Number(snapshot.qty ?? 0),
          reorder: Number(snapshot.reorder ?? 0),
          unitCost: Number(snapshot.unitCost ?? 0),
          supplier: (snapshot.supplier as string) ?? "",
          status: (snapshot.status as string) ?? "",
        }
      : undefined,
    currentStock: (r.current_stock as number) ?? 0,
    reorderLevel: (r.reorder_level as number) ?? 0,
    qtyRequested: r.qty_requested === null || r.qty_requested === undefined ? null : Number(r.qty_requested),
    unit: (r.unit as string) ?? "",
    urgency: r.urgency as PharmacyRestockRequest["urgency"],
    requestedBy: (r.requested_by as string) ?? "",
    requestedAt: (r.requested_at as string) ?? "",
    status: r.status as PharmacyRestockRequest["status"],
    notes: r.notes as string | undefined,
    approvedQty: r.approved_qty === null || r.approved_qty === undefined ? null : Number(r.approved_qty),
    fulfilledAt: r.fulfilled_at as string | undefined,
  };
}

function mapPharmacyBill(r: Record<string, unknown>): PharmacyBill {
  return {
    id: r.id as string,
    prescriptionId: (r.prescription_id as string) ?? "",
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    drugs: (r.drugs as string) ?? "",
    totalCost: (r.total_cost as number) ?? 0,
    dispensedAt: (r.dispensed_at as string) ?? "",
    billStatus: r.bill_status as PharmacyBill["billStatus"],
    source: (r.source as PharmacyBill["source"]) ?? "prescription",
    paidAt: (r.paid_at as string) ?? undefined,
    paymentMethod: (r.payment_method as PharmacyBill["paymentMethod"]) ?? undefined,
  };
}

function mapDrugItem(r: Record<string, unknown>): PharmacyDrugItem {
  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string) ?? "",
    unitPrice: (r.unit_price as number) ?? 0,
    defaultDosage: (r.default_dosage as string) ?? "",
    unit: (r.unit as string) ?? "",
  };
}

export async function fetchPrescriptions(): Promise<SharedPrescription[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: rxs } = await sb.from("prescriptions").select("*, prescribed_drugs(*)").order("created_at", { ascending: false });
  return (rxs ?? []).map((r) => {
    const drugs = (r.prescribed_drugs as Record<string, unknown>[]) ?? [];
    const { prescribed_drugs: _, ...rest } = r;
    return mapPrescription(rest as Record<string, unknown>, drugs);
  });
}

export async function fetchNurseMedRequests(): Promise<NurseMedRequest[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("nurse_med_requests").select("*").order("requested_at", { ascending: false });
  return (data ?? []).map(mapNurseMedRequest);
}

export async function fetchPharmacyRestockRequests(): Promise<PharmacyRestockRequest[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("pharmacy_restock_requests").select("*").order("requested_at", { ascending: false });
  return (data ?? []).map(mapRestockRequest);
}

export async function fetchPharmacyBills(): Promise<PharmacyBill[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("pharmacy_bills").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapPharmacyBill);
}

export async function fetchPharmacyDrugItems(): Promise<PharmacyDrugItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("pharmacy_drug_items").select("*").order("name");
  return (data ?? []).map(mapDrugItem);
}

export async function insertPrescription(p: SharedPrescription): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("prescriptions").upsert({
    id: p.id, patient_name: p.patientName, patient_id: p.patientId,
    doctor_name: p.doctorName, department: p.department, urgency: p.urgency,
    notes: p.notes, status: p.status, dispensed_at: p.dispensedAt,
    dispensed_by: p.dispensedBy, total_cost: p.totalCost,
  });
  if (error) throw new Error(error.message);
  if (!error && p.drugs.length > 0) {
    const { error: drugsError } = await sb.from("prescribed_drugs").upsert(
      p.drugs.map((d) => ({
        prescription_id: p.id,
        name: d.name, dosage: d.dosage, frequency: d.frequency,
        duration: d.duration, qty: Number(d.qty) || 0, unit_price: d.unitPrice,
      }))
    );
    if (drugsError) throw new Error(drugsError.message);
  }
}

export async function upsertPrescriptionStatus(id: string, status: SharedPrescription["status"], extra?: Partial<SharedPrescription>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("prescriptions").update({
    status,
    // dispensedAt is display-only ("HH:MM · DD Mon YYYY"); always write ISO to DB
    ...(extra?.dispensedAt ? { dispensed_at: new Date().toISOString() } : {}),
    ...(extra?.dispensedBy ? { dispensed_by: extra.dispensedBy } : {}),
    ...(extra?.totalCost !== undefined ? { total_cost: extra.totalCost } : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Lab ─────────────────────────────────────────────────────────────────────

function mapLabTest(r: Record<string, unknown>): LabTest {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    testName: r.test_name as string,
    testCode: (r.test_code as string) ?? "",
    category: (r.category as string) ?? "",
    orderedBy: (r.ordered_by as string) ?? "",
    orderedAt: (r.ordered_at as string) ?? "",
    priority: r.priority as LabTest["priority"],
    status: r.status as LabTest["status"],
    sampleType: (r.sample_type as string) ?? "",
    price: (r.price as number) ?? 0,
    sampleCollectedBy: r.sample_collected_by as string | undefined,
    sampleCollectedAt: r.sample_collected_at as string | undefined,
    technicianName: r.technician_name as string | undefined,
    equipmentUsed: r.equipment_used as string | undefined,
    processingStartedAt: r.processing_started_at as string | undefined,
    resultValue: r.result_value as string | undefined,
    resultUnit: r.result_unit as string | undefined,
    referenceRange: r.reference_range as string | undefined,
    interpretation: r.interpretation as LabTest["interpretation"],
    resultNotes: r.result_notes as string | undefined,
    resultEnteredBy: r.result_entered_by as string | undefined,
    completedAt: r.completed_at as string | undefined,
    billStatus: r.bill_status as LabTest["billStatus"],
  };
}

function mapTestCatalog(r: Record<string, unknown>): TestCatalogItem {
  return {
    id: r.id as string,
    name: r.name as string,
    code: r.code as string,
    category: (r.category as string) ?? "",
    sampleType: (r.sample_type as string) ?? "",
    price: (r.price as number) ?? 0,
    turnaroundHours: (r.turnaround_hours as number) ?? 0,
    department: (r.department as string) ?? "",
    description: (r.description as string) ?? "",
  };
}

export async function fetchLabTests(): Promise<LabTest[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("lab_tests").select("*").order("ordered_at", { ascending: false });
  return (data ?? []).map(mapLabTest);
}

export async function fetchTestCatalog(): Promise<TestCatalogItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("test_catalog").select("*").order("name");
  return (data ?? []).map(mapTestCatalog);
}

export async function insertLabTest(t: LabTest): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("lab_tests").upsert({
    id: t.id, patient_name: t.patientName, patient_id: t.patientId,
    test_name: t.testName, test_code: t.testCode, category: t.category,
    ordered_by: t.orderedBy, ordered_at: t.orderedAt, priority: t.priority,
    status: t.status, sample_type: t.sampleType, price: t.price,
    bill_status: t.billStatus,
  });
  if (error) throw new Error(error.message);
}

export async function upsertLabTestResult(id: string, updates: Partial<LabTest>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const patch: Record<string, unknown> = {};
  if (updates.status) patch.status = updates.status;
  if (updates.sampleCollectedBy) patch.sample_collected_by = updates.sampleCollectedBy;
  if (updates.sampleCollectedAt) patch.sample_collected_at = updates.sampleCollectedAt;
  if (updates.technicianName) patch.technician_name = updates.technicianName;
  if (updates.resultValue !== undefined) patch.result_value = updates.resultValue;
  if (updates.resultUnit) patch.result_unit = updates.resultUnit;
  if (updates.referenceRange) patch.reference_range = updates.referenceRange;
  if (updates.interpretation) patch.interpretation = updates.interpretation;
  if (updates.resultNotes) patch.result_notes = updates.resultNotes;
  if (updates.resultEnteredBy) patch.result_entered_by = updates.resultEnteredBy;
  if (updates.completedAt) patch.completed_at = updates.completedAt;
  if (updates.billStatus) patch.bill_status = updates.billStatus;
  const { error } = await sb.from("lab_tests").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Nurses ───────────────────────────────────────────────────────────────────

function mapWardPatient(r: Record<string, unknown>): WardPatient {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    unit: r.unit as WardPatient["unit"],
    bed: (r.bed as string) ?? "",
    diagnosis: (r.diagnosis as string) ?? "",
    admittedAt: (r.admitted_at as string) ?? "",
    assignedNurse: (r.assigned_nurse as string) ?? "",
    priority: r.priority as WardPatient["priority"],
    status: r.status as WardPatient["status"],
    vitals: {
      bp: (r.bp as string) ?? "",
      pulse: (r.pulse as string) ?? "",
      temp: (r.temp as string) ?? "",
      spo2: (r.spo2 as string) ?? "",
      recordedAt: (r.last_vitals_at as string) ?? "",
      recordedBy: (r.assigned_nurse as string) ?? "",
    },
    doctorInCharge: (r.doctor_in_charge as string) ?? "",
    doctorSpecialty: (r.doctor_specialty as string) ?? "",
    notes: (r.notes as string) ?? "",
    lastVitalsAt: r.last_vitals_at as string | undefined,
    labTestsOrdered: (r.lab_tests_ordered as number) ?? 0,
    medsScheduled: (r.meds_scheduled as number) ?? 0,
  };
}

function mapNursingProcedure(r: Record<string, unknown>): NursingProcedure {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    unit: r.unit as NursingProcedure["unit"],
    procedureType: r.procedure_type as NursingProcedure["procedureType"],
    description: (r.description as string) ?? "",
    performedBy: (r.performed_by as string) ?? "",
    performedAt: (r.performed_at as string) ?? "",
    amount: (r.amount as number) ?? 0,
    billStatus: r.bill_status as NursingProcedure["billStatus"],
  };
}

function mapNurseSampleRequest(r: Record<string, unknown>): NurseSampleRequest {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    unit: r.unit as NurseSampleRequest["unit"],
    testName: r.test_name as string,
    testCode: (r.test_code as string) ?? "",
    sampleType: (r.sample_type as string) ?? "",
    collectedBy: r.collected_by as string | undefined,
    collectedAt: r.collected_at as string | undefined,
    status: r.status as NurseSampleRequest["status"],
    priority: r.priority as NurseSampleRequest["priority"],
    orderedBy: (r.ordered_by as string) ?? "",
    orderedAt: (r.ordered_at as string) ?? "",
  };
}

function mapICUVitals(r: Record<string, unknown>): ICUVitalsEntry {
  return {
    id: r.id as string,
    patientId: (r.patient_id as string) ?? "",
    patientName: r.patient_name as string,
    bp: (r.bp as string) ?? "",
    pulse: (r.pulse as string) ?? "",
    temp: (r.temp as string) ?? "",
    spo2: (r.spo2 as string) ?? "",
    gcs: (r.gcs as string) ?? "",
    urine: (r.urine as string) ?? "",
    rrRate: (r.rr_rate as string) ?? "",
    recordedBy: (r.recorded_by as string) ?? "",
    recordedAt: (r.recorded_at as string) ?? "",
    notes: (r.notes as string) ?? "",
  };
}

export async function fetchWardPatients(): Promise<WardPatient[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("ward_patients").select("*").order("admitted_at", { ascending: false });
  return (data ?? []).map(mapWardPatient);
}

export async function fetchNursingProcedures(): Promise<NursingProcedure[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("nursing_procedures").select("*").order("performed_at", { ascending: false });
  return (data ?? []).map(mapNursingProcedure);
}

export async function fetchNurseSampleRequests(): Promise<NurseSampleRequest[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("nurse_sample_requests").select("*").order("ordered_at", { ascending: false });
  return (data ?? []).map(mapNurseSampleRequest);
}

export async function insertNurseSampleRequest(r: NurseSampleRequest): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("nurse_sample_requests").upsert({
    id: r.id,
    patient_name: r.patientName,
    patient_id: r.patientId,
    unit: r.unit,
    test_name: r.testName,
    test_code: r.testCode,
    sample_type: r.sampleType,
    collected_by: r.collectedBy ?? null,
    collected_at: r.collectedAt ? new Date(r.collectedAt).toISOString() : null,
    status: r.status,
    priority: r.priority,
    ordered_by: r.orderedBy,
    ordered_at: r.orderedAt ? new Date(r.orderedAt).toISOString() : new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function fetchICUVitals(): Promise<ICUVitalsEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("icu_vitals").select("*").order("recorded_at", { ascending: false });
  return (data ?? []).map(mapICUVitals);
}

export async function insertWardPatient(p: WardPatient): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const payload = {
    id: p.id, patient_name: p.patientName, patient_id: p.patientId,
    unit: p.unit, bed: p.bed, diagnosis: p.diagnosis, admitted_at: p.admittedAt,
    assigned_nurse: p.assignedNurse, priority: p.priority, status: p.status,
    bp: p.vitals?.bp, pulse: p.vitals?.pulse, temp: p.vitals?.temp,
    spo2: p.vitals?.spo2,
    doctor_in_charge: p.doctorInCharge, doctor_specialty: p.doctorSpecialty,
    notes: p.notes, last_vitals_at: p.lastVitalsAt,
  };

  let { error } = await sb.from("ward_patients").upsert(payload);

  if (error && isMissingColumnError(error, "ward_patients.doctor_specialty")) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.doctor_specialty;
    const fallbackResponse = await sb.from("ward_patients").upsert(fallbackPayload);
    error = fallbackResponse.error;
  }

  if (error) throw new Error(error.message);
}

export async function insertNursingProcedure(p: NursingProcedure): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("nursing_procedures").upsert({
    id: p.id, patient_name: p.patientName, patient_id: p.patientId,
    unit: p.unit, procedure_type: p.procedureType, description: p.description,
    performed_by: p.performedBy, performed_at: p.performedAt, amount: p.amount,
    bill_status: p.billStatus,
  });
  if (error) throw new Error(error.message);
}

export async function insertICUVitals(v: ICUVitalsEntry): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("icu_vitals").upsert({
    id: v.id, patient_id: v.patientId, patient_name: v.patientName,
    bp: v.bp, pulse: v.pulse, temp: v.temp, spo2: v.spo2, gcs: v.gcs,
    urine: v.urine, rr_rate: v.rrRate, recorded_by: v.recordedBy,
    recorded_at: v.recordedAt, notes: v.notes,
  });
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

function mapFrontDeskCharge(r: Record<string, unknown>): FrontDeskCharge {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    chargeType: r.charge_type as FrontDeskCharge["chargeType"],
    amount: (r.amount as number) ?? 0,
    description: (r.description as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
    createdBy: (r.created_by as string) ?? "",
    visitId: (r.visit_id as string) ?? "",
    status: r.status as FrontDeskCharge["status"],
  };
}

function mapConsultationFee(r: Record<string, unknown>): ConsultationFee {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    doctorName: (r.doctor_name as string) ?? "",
    consultationType: r.consultation_type as ConsultationFee["consultationType"],
    fee: (r.fee as number) ?? 0,
    consultedAt: (r.consulted_at as string) ?? "",
    status: r.status as ConsultationFee["status"],
    paidAt: r.paid_at as string | undefined,
    paymentMethod: r.payment_method as ConsultationFee["paymentMethod"] | undefined,
  };
}

function mapSupplierPayment(r: Record<string, unknown>): SupplierPayment {
  return {
    id: r.id as string,
    poId: (r.po_id as string) ?? "",
    supplier: r.supplier as string,
    amount: (r.amount as number) ?? 0,
    description: (r.description as string) ?? "",
    items: (r.items as SupplierPayment["items"]) ?? [],
    submittedBy: (r.submitted_by as string) ?? "",
    submittedAt: (r.submitted_at as string) ?? "",
    dueDate: (r.due_date as string) ?? "",
    status: r.status as SupplierPayment["status"],
    paidAt: r.paid_at as string | undefined,
  };
}

function mapPayrollBatch(r: Record<string, unknown>): PayrollBatch {
  const entries = parseJsonArray<PayrollEntry>(r.entries);
  const payslipIds = parseJsonArray<string>(r.payslip_ids);
  return {
    id: r.id as string,
    period: r.period as string,
    totalStaff: (r.total_staff as number) ?? 0,
    totalAmount: (r.total_amount as number) ?? 0,
    preparedBy: (r.prepared_by as string) ?? "",
    preparedAt: (r.prepared_at as string) ?? "",
    status: r.status as PayrollBatch["status"],
    approvedAt: r.approved_at as string | undefined,
    paidAt: r.paid_at as string | undefined,
    payslipIds,
    entries,
  };
}

function mapGeneratedPayslip(r: Record<string, unknown>): GeneratedPayslip {
  return {
    id: r.id as string,
    period: r.period as string,
    monthKey: (r.month_key as string) ?? "",
    department: r.department as GeneratedPayslip["department"],
    staffId: (r.staff_id as string) ?? "",
    staffName: (r.staff_name as string) ?? "",
    role: (r.role as string) ?? "",
    unit: (r.unit as string) ?? undefined,
    bankName: (r.bank_name as string) ?? undefined,
    bankAccount: (r.bank_account as string) ?? undefined,
    taxId: (r.tax_id as string) ?? undefined,
    baseSalary: Number(r.base_salary ?? 0),
    earnings: parseJsonArray<GeneratedPayslip["earnings"][number]>(r.earnings),
    deductions: parseJsonArray<GeneratedPayslip["deductions"][number]>(r.deductions),
    grossPay: Number(r.gross_pay ?? 0),
    totalDeductions: Number(r.total_deductions ?? 0),
    netPay: Number(r.net_pay ?? 0),
    paymentStatus: (r.payment_status as GeneratedPayslip["paymentStatus"]) ?? "Processing",
    workflowStatus: (r.workflow_status as GeneratedPayslip["workflowStatus"]) ?? "Generated",
    createdAt: (r.created_at as string) ?? "",
    createdBy: (r.created_by as string) ?? "",
    batchId: (r.batch_id as string) ?? undefined,
    paidAt: (r.paid_at as string) ?? undefined,
  };
}

function mapKioskSale(r: Record<string, unknown>): KioskSale {
  return {
    id: r.id as string,
    date: r.date as string,
    totalRevenue: (r.total_revenue as number) ?? 0,
    cashRevenue: (r.cash_revenue as number) ?? 0,
    mobileRevenue: (r.mobile_revenue as number) ?? 0,
    itemsSold: (r.items_sold as number) ?? 0,
    reportedBy: (r.reported_by as string) ?? "",
    reportedAt: (r.reported_at as string) ?? "",
    status: r.status as KioskSale["status"],
    notes: r.notes as string | undefined,
  };
}

function mapLabCharge(r: Record<string, unknown>): LabCharge {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    testName: (r.test_name as string) ?? "",
    testId: (r.test_id as string) ?? "",
    amount: (r.amount as number) ?? 0,
    orderedBy: (r.ordered_by as string) ?? "",
    completedAt: (r.completed_at as string) ?? "",
    status: r.status as LabCharge["status"],
  };
}

function mapNursingCharge(r: Record<string, unknown>): NursingCharge {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    unit: (r.unit as string) ?? "",
    procedureType: (r.procedure_type as string) ?? "",
    description: (r.description as string) ?? "",
    performedBy: (r.performed_by as string) ?? "",
    performedAt: (r.performed_at as string) ?? "",
    amount: (r.amount as number) ?? 0,
    status: r.status as NursingCharge["status"],
  };
}

export async function fetchFrontDeskCharges(): Promise<FrontDeskCharge[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("front_desk_charges").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapFrontDeskCharge);
}

export async function fetchConsultationFees(): Promise<ConsultationFee[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("consultation_fees").select("*").order("consulted_at", { ascending: false });
  return (data ?? []).map(mapConsultationFee);
}

export async function fetchSupplierPayments(): Promise<SupplierPayment[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("supplier_payments").select("*").order("submitted_at", { ascending: false });
  return (data ?? []).map(mapSupplierPayment);
}

export async function fetchPayrollBatches(): Promise<PayrollBatch[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("payroll_batches").select("*").order("prepared_at", { ascending: false });
  return (data ?? []).map(mapPayrollBatch);
}

export async function fetchGeneratedPayslips(): Promise<GeneratedPayslip[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("generated_payslips").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapGeneratedPayslip);
}

export async function fetchKioskSales(): Promise<KioskSale[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("kiosk_sales").select("*").order("date", { ascending: false });
  return (data ?? []).map(mapKioskSale);
}

export async function fetchLabCharges(): Promise<LabCharge[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("lab_charges").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapLabCharge);
}

export async function fetchNursingCharges(): Promise<NursingCharge[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("nursing_charges").select("*").order("performed_at", { ascending: false });
  return (data ?? []).map(mapNursingCharge);
}

export async function insertFrontDeskCharge(c: FrontDeskCharge): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  await sb.from("front_desk_charges").upsert({
    id: c.id, patient_name: c.patientName, patient_id: c.patientId,
    charge_type: c.chargeType, amount: c.amount, description: c.description,
    created_by: c.createdBy, visit_id: c.visitId, status: c.status,
  });
}

export async function upsertFrontDeskChargeStatus(
  id: string,
  status: string,
  extra?: { paidAt?: string; paymentMethod?: string },
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (status === "Paid") {
    patch.paid_at = extra?.paidAt ?? new Date().toISOString();
    if (extra?.paymentMethod) patch.payment_method = extra.paymentMethod;
  }
  const { error } = await sb.from("front_desk_charges").update(patch).eq("id", id);
  if (error) console.error("[db] upsertFrontDeskChargeStatus:", error.message);
}

export async function insertConsultationFee(f: ConsultationFee): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("consultation_fees").upsert({
    id: f.id, patient_name: f.patientName, patient_id: f.patientId,
    doctor_name: f.doctorName, consultation_type: f.consultationType,
    fee: f.fee, consulted_at: f.consultedAt || new Date().toISOString(),
    status: f.status ?? "Pending",
    paid_at: f.paidAt ? new Date(f.paidAt).toISOString() : null,
    payment_method: f.paymentMethod ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function upsertConsultationFeeStatus(
  id: string,
  status: ConsultationFee["status"],
  extra?: { paidAt?: string; paymentMethod?: ConsultationFee["paymentMethod"] },
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (status === "Paid") {
    patch.paid_at = extra?.paidAt ?? new Date().toISOString();
    if (extra?.paymentMethod) patch.payment_method = extra.paymentMethod;
  }
  const { error } = await sb.from("consultation_fees").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertLabCharge(c: LabCharge): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("lab_charges").upsert({
    id: c.id, patient_name: c.patientName, patient_id: c.patientId,
    test_name: c.testName, test_id: c.testId, amount: c.amount,
    ordered_by: c.orderedBy,
    completed_at: c.completedAt ? new Date(c.completedAt).toISOString() : new Date().toISOString(),
    status: c.status ?? "Pending",
  });
  if (error) throw new Error(error.message);
}

export async function upsertLabChargeStatus(
  id: string,
  status: LabCharge["status"],
  extra?: { paidAt?: string; paymentMethod?: string },
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (status === "Paid") {
    patch.paid_at = extra?.paidAt ?? new Date().toISOString();
    if (extra?.paymentMethod) patch.payment_method = extra.paymentMethod;
  }
  const { error } = await sb.from("lab_charges").update(patch).eq("id", id);
  if (error) console.error("[db] upsertLabChargeStatus:", error.message);
}

export async function insertNursingCharge(c: NursingCharge): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("nursing_charges").upsert({
    id: c.id, patient_name: c.patientName, patient_id: c.patientId,
    unit: c.unit, procedure_type: c.procedureType, description: c.description,
    performed_by: c.performedBy,
    performed_at: c.performedAt ? new Date(c.performedAt).toISOString() : new Date().toISOString(),
    amount: c.amount, status: c.status ?? "Pending",
  });
  if (error) throw new Error(error.message);
}

export async function upsertNursingChargeStatus(
  id: string,
  status: NursingCharge["status"],
  extra?: { paidAt?: string; paymentMethod?: string },
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (status === "Paid") {
    patch.paid_at = extra?.paidAt ?? new Date().toISOString();
    if (extra?.paymentMethod) patch.payment_method = extra.paymentMethod;
  }
  const { error } = await sb.from("nursing_charges").update(patch).eq("id", id);
  if (error) console.error("[db] upsertNursingChargeStatus:", error.message);
}

export async function insertPharmacyBill(bill: PharmacyBill): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("pharmacy_bills").upsert({
    id: bill.id, prescription_id: bill.prescriptionId,
    patient_name: bill.patientName, patient_id: bill.patientId,
    drugs: bill.drugs, total_cost: bill.totalCost,
    dispensed_at: bill.dispensedAt ? new Date(bill.dispensedAt).toISOString() : new Date().toISOString(),
    bill_status: bill.billStatus ?? "Pending", source: bill.source ?? "prescription",
    paid_at: bill.paidAt ?? null,
    payment_method: bill.paymentMethod ?? null,
  });
  if (error) throw new Error(error.message);
}

type PharmacyPaymentMethod = "Cash" | "POS / Card" | "Mobile Money" | "Insurance";

export async function upsertPharmacyBillStatus(
  id: string,
  billStatus: PharmacyBill["billStatus"],
  extra?: Partial<PharmacyBill>,
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const paidAt = billStatus === "Paid" ? extra?.paidAt ?? new Date().toISOString() : extra?.paidAt ?? null;
  const paymentMethod = (extra?.paymentMethod as PharmacyPaymentMethod | undefined) ?? null;
  const { error } = await sb.from("pharmacy_bills").update({
    bill_status: billStatus,
    paid_at: paidAt,
    payment_method: paymentMethod,
  }).eq("id", id);
  if (error) console.error("[db] upsertPharmacyBillStatus:", error.message);
}

export async function insertNurseMedRequest(r: NurseMedRequest): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("nurse_med_requests").upsert({
    id: r.id, patient_name: r.patientName, patient_id: r.patientId,
    ward: r.ward, requested_by: r.requestedBy, drug: r.drug,
    dosage: r.dosage, route: r.route, qty: Number(r.qty) || 1,
    urgency: r.urgency, notes: r.notes ?? null,
    requested_at: r.requestedAt ? new Date(r.requestedAt).toISOString() : new Date().toISOString(),
    status: r.status ?? "Requested",
    prepared_at: r.preparedAt ? new Date(r.preparedAt).toISOString() : null,
    prepared_by: r.preparedBy ?? null,
  });
  if (error) console.error("[db] insertNurseMedRequest:", error.message);
}

export async function upsertNurseMedRequestStatus(
  id: string, status: NurseMedRequest["status"], extra?: Partial<NurseMedRequest>
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (extra?.preparedAt) patch.prepared_at = new Date(extra.preparedAt).toISOString();
  if (extra?.preparedBy) patch.prepared_by = extra.preparedBy;
  const { error } = await sb.from("nurse_med_requests").update(patch).eq("id", id);
  if (error) console.error("[db] upsertNurseMedRequestStatus:", error.message);
}

export async function insertRestockRequest(r: PharmacyRestockRequest): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("pharmacy_restock_requests").upsert({
    id: r.id, drug: r.drug, inventory_item_id: r.inventoryItemId ?? null,
    store_inventory_id: r.storeInventoryId ?? null,
    store_snapshot: r.storeSnapshot ?? null,
    current_stock: r.currentStock, reorder_level: r.reorderLevel,
    qty_requested: r.qtyRequested ?? null, unit: r.unit, urgency: r.urgency,
    requested_by: r.requestedBy,
    requested_at: r.requestedAt ? new Date(r.requestedAt).toISOString() : new Date().toISOString(),
    status: r.status ?? "Pending", notes: r.notes ?? null,
    approved_qty: r.approvedQty ?? null,
    fulfilled_at: r.fulfilledAt ? new Date(r.fulfilledAt).toISOString() : null,
  });
  if (error) console.error("[db] insertRestockRequest:", error.message);
}

export async function upsertRestockStatus(
  id: string, status: PharmacyRestockRequest["status"], extra?: Partial<PharmacyRestockRequest>
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (extra?.approvedQty !== undefined) patch.approved_qty = extra.approvedQty;
  if (extra?.fulfilledAt) patch.fulfilled_at = new Date(extra.fulfilledAt).toISOString();
  const { error } = await sb.from("pharmacy_restock_requests").update(patch).eq("id", id);
  if (error) console.error("[db] upsertRestockStatus:", error.message);
}

export async function insertSupplierPayment(p: SupplierPayment): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("supplier_payments").upsert({
    id: p.id, po_id: p.poId, supplier: p.supplier, amount: p.amount,
    description: p.description, items: p.items ?? null,
    submitted_by: p.submittedBy,
    submitted_at: p.submittedAt ? new Date(p.submittedAt).toISOString() : new Date().toISOString(),
    due_date: p.dueDate || null, status: p.status ?? "Pending",
    paid_at: p.paidAt ? new Date(p.paidAt).toISOString() : null,
  });
  if (error) console.error("[db] insertSupplierPayment:", error.message);
}

export async function upsertSupplierPaymentStatus(
  id: string, status: SupplierPayment["status"], extra?: Partial<SupplierPayment>
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (extra?.paidAt) patch.paid_at = new Date(extra.paidAt).toISOString();
  const { error } = await sb.from("supplier_payments").update(patch).eq("id", id);
  if (error) console.error("[db] upsertSupplierPaymentStatus:", error.message);
}

export async function insertPayrollBatch(b: PayrollBatch): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("payroll_batches").upsert({
    id: b.id, period: b.period, total_staff: b.totalStaff,
    total_amount: b.totalAmount, prepared_by: b.preparedBy,
    prepared_at: b.preparedAt ? new Date(b.preparedAt).toISOString() : new Date().toISOString(),
    status: b.status ?? "Draft",
    approved_at: b.approvedAt ? new Date(b.approvedAt).toISOString() : null,
    paid_at: b.paidAt ? new Date(b.paidAt).toISOString() : null,
    payslip_ids: b.payslipIds ?? [],
    entries: b.entries ?? [],
  });
  if (error) console.error("[db] insertPayrollBatch:", error.message);
}

export async function upsertGeneratedPayslip(payslip: GeneratedPayslip): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("generated_payslips").upsert({
    id: payslip.id,
    period: payslip.period,
    month_key: payslip.monthKey,
    department: payslip.department,
    staff_id: payslip.staffId,
    staff_name: payslip.staffName,
    role: payslip.role,
    unit: payslip.unit ?? null,
    bank_name: payslip.bankName ?? null,
    bank_account: payslip.bankAccount ?? null,
    tax_id: payslip.taxId ?? null,
    base_salary: payslip.baseSalary,
    earnings: payslip.earnings ?? [],
    deductions: payslip.deductions ?? [],
    gross_pay: payslip.grossPay,
    total_deductions: payslip.totalDeductions,
    net_pay: payslip.netPay,
    payment_status: payslip.paymentStatus,
    workflow_status: payslip.workflowStatus,
    created_at: toIsoTimestamp(payslip.createdAt),
    created_by: payslip.createdBy,
    batch_id: payslip.batchId ?? null,
    paid_at: payslip.paidAt ? toIsoTimestamp(payslip.paidAt) : null,
  });
  if (error) console.error("[db] upsertGeneratedPayslip:", error.message);
}

export async function upsertPayrollBatchStatus(
  id: string, status: PayrollBatch["status"], extra?: Partial<PayrollBatch>
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (extra?.approvedAt) patch.approved_at = new Date(extra.approvedAt).toISOString();
  if (extra?.paidAt) patch.paid_at = new Date(extra.paidAt).toISOString();
  const { error } = await sb.from("payroll_batches").update(patch).eq("id", id);
  if (error) console.error("[db] upsertPayrollBatchStatus:", error.message);
}

export async function insertKioskSale(s: KioskSale): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  // date column is type 'date' in DB — extract YYYY-MM-DD
  let dbDate = s.date;
  try {
    const parsed = new Date(s.date);
    if (!isNaN(parsed.getTime())) dbDate = parsed.toISOString().slice(0, 10);
  } catch { /* keep as-is */ }
  const { error } = await sb.from("kiosk_sales").upsert({
    id: s.id, date: dbDate, total_revenue: s.totalRevenue,
    cash_revenue: s.cashRevenue, mobile_revenue: s.mobileRevenue,
    items_sold: s.itemsSold, reported_by: s.reportedBy,
    reported_at: s.reportedAt ? new Date(s.reportedAt).toISOString() : new Date().toISOString(),
    status: s.status ?? "Pending", notes: s.notes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function upsertKioskSaleStatus(id: string, status: KioskSale["status"]): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("kiosk_sales").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Staff by Department ──────────────────────────────────────────────────────

export type StaffBasic = { id: string; name: string; department: string; role: string };

export async function fetchStaffByDepartment(department: string): Promise<StaffBasic[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb
    .from("staff_profiles")
    .select("id, full_name, department, role")
    .eq("department", department)
    .eq("is_active", true)
    .order("full_name");
  if (error) { console.error("[db] fetchStaffByDepartment:", error.message); return []; }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: (r.full_name as string) ?? "",
    department: (r.department as string) ?? "",
    role: (r.role as string) ?? "",
  }));
}

// ─── Handover Notes ───────────────────────────────────────────────────────────

export type HandoverNote = {
  id: string;
  ward: string;
  shift: string;
  writtenBy: string;
  content: string;
  createdAt: string;
};

function mapHandoverNote(r: Record<string, unknown>): HandoverNote {
  return {
    id: r.id as string,
    ward: r.ward as string,
    shift: (r.shift as string) ?? "Morning",
    writtenBy: (r.written_by as string) ?? "",
    content: (r.content as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
  };
}

export async function fetchHandoverNotes(ward: string): Promise<HandoverNote[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb
    .from("handover_notes")
    .select("*")
    .eq("ward", ward)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapHandoverNote);
}

export async function insertHandoverNote(n: HandoverNote): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("handover_notes").insert({
    id: n.id, ward: n.ward, shift: n.shift,
    written_by: n.writtenBy, content: n.content,
  });
  if (error) throw new Error(error.message);
}

// ─── Patient Observations ─────────────────────────────────────────────────────

export type PatientObservation = {
  id: string;
  patientId: string;
  patientName: string;
  unit: string;
  observation: string;
  recordedBy: string;
  recordedAt: string;
};

function mapPatientObservation(r: Record<string, unknown>): PatientObservation {
  return {
    id: r.id as string,
    patientId: (r.patient_id as string) ?? "",
    patientName: (r.patient_name as string) ?? "",
    unit: (r.unit as string) ?? "",
    observation: (r.observation as string) ?? "",
    recordedBy: (r.recorded_by as string) ?? "",
    recordedAt: (r.recorded_at as string) ?? "",
  };
}

export async function fetchPatientObservations(patientId: string): Promise<PatientObservation[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb
    .from("patient_observations")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(50);
  if (error) { console.error("[db] fetchPatientObservations:", error.message); return []; }
  return (data ?? []).map(mapPatientObservation);
}

export async function insertPatientObservation(obs: PatientObservation): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("patient_observations").insert({
    id: obs.id, patient_id: obs.patientId, patient_name: obs.patientName,
    unit: obs.unit, observation: obs.observation,
    recorded_by: obs.recordedBy,
    recorded_at: obs.recordedAt ? new Date(obs.recordedAt).toISOString() : new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// ─── MAR Entries (Medication Administration Record) ───────────────────────────

export type MAREntry = {
  id: string;
  patientId: string;
  patientName: string;
  unit: string;
  drug: string;
  dose: string;
  route: string;
  scheduledAt?: string;
  givenAt?: string;
  givenBy?: string;
  status: "Scheduled" | "Given" | "Missed" | "Held";
  notes?: string;
  createdAt: string;
};

function mapMAREntry(r: Record<string, unknown>): MAREntry {
  return {
    id: r.id as string,
    patientId: (r.patient_id as string) ?? "",
    patientName: (r.patient_name as string) ?? "",
    unit: (r.unit as string) ?? "",
    drug: (r.drug as string) ?? "",
    dose: (r.dose as string) ?? "",
    route: (r.route as string) ?? "Oral",
    scheduledAt: (r.scheduled_at as string) ?? undefined,
    givenAt: (r.given_at as string) ?? undefined,
    givenBy: (r.given_by as string) ?? undefined,
    status: (r.status as MAREntry["status"]) ?? "Scheduled",
    notes: (r.notes as string) ?? undefined,
    createdAt: (r.created_at as string) ?? "",
  };
}

export async function fetchMAREntries(patientId: string): Promise<MAREntry[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb
    .from("mar_entries")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) { console.error("[db] fetchMAREntries:", error.message); return []; }
  return (data ?? []).map(mapMAREntry);
}

export async function insertMAREntry(entry: MAREntry): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("mar_entries").insert({
    id: entry.id, patient_id: entry.patientId, patient_name: entry.patientName,
    unit: entry.unit, drug: entry.drug, dose: entry.dose, route: entry.route,
    scheduled_at: entry.scheduledAt ?? null,
    given_at: entry.givenAt ? new Date(entry.givenAt).toISOString() : null,
    given_by: entry.givenBy ?? null,
    status: entry.status ?? "Scheduled", notes: entry.notes ?? null,
  });
  if (error) console.error("[db] insertMAREntry:", error.message);
}

export async function upsertMAREntryStatus(
  id: string, status: MAREntry["status"], givenBy?: string
): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (givenBy) { patch.given_by = givenBy; patch.given_at = new Date().toISOString(); }
  const { error } = await sb.from("mar_entries").update(patch).eq("id", id);
  if (error) console.error("[db] upsertMAREntryStatus:", error.message);
}

// ─── HR ───────────────────────────────────────────────────────────────────────

function mapStaffMember(r: Record<string, unknown>): StaffMember {
  const departmentKey = String(r.department ?? "");
  const roleKey = r.role as StaffMember["roleKey"];
  const fullName = (r.full_name as string) ?? (r.name as string) ?? "";
  const createdAt = (r.created_at as string) ?? "";

  return {
    id: r.id as string,
    name: fullName,
    department: dbToStaffDeptMap[departmentKey] ?? "Administration",
    unit: (r.unit_name as string) ?? (r.unit as string | undefined),
    specialty: r.specialty as string | undefined,
    role: ROLE_KEY_LABELS[roleKey ?? "viewer"] ?? "Staff Member",
    roleKey,
    contractType: (r.contract_type as StaffMember["contractType"]) ?? "Permanent",
    email: (r.email as string) ?? "",
    phone: (r.phone as string) ?? "",
    joinDate: createdAt ? new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
    contractEndDate: r.contract_end_date as string | undefined,
    status: typeof r.is_active === "boolean" ? (r.is_active ? "Active" : "Terminated") : ((r.status as StaffMember["status"]) ?? "Active"),
    licenseNumber: r.license_number as string | undefined,
    licenseExpiry: r.license_expiry as string | undefined,
    salary: (r.salary as number) ?? 0,
    systemAccessCreated: typeof r.system_access_created === "boolean" ? Boolean(r.system_access_created) : true,
    notes: r.notes as string | undefined,
  };
}

function mapLeaveRequest(r: Record<string, unknown>): LeaveRequest {
  return {
    id: r.id as string,
    staffId: (r.staff_id as string) ?? "",
    staffName: r.staff_name as string,
    department: r.department as LeaveRequest["department"],
    role: (r.role as string) ?? "",
    leaveType: r.leave_type as LeaveRequest["leaveType"],
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    days: (r.days as number) ?? 0,
    reason: (r.reason as string) ?? "",
    status: r.status as LeaveRequest["status"],
    submittedAt: (r.submitted_at as string) ?? "",
    reviewedBy: r.reviewed_by as string | undefined,
    reviewedAt: r.reviewed_at as string | undefined,
    hrNotes: r.hr_notes as string | undefined,
  };
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("staff_profiles").select("*").order("full_name");
  return (data ?? []).map(mapStaffMember);
}

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  const sb = getSupabase(); if (!sb) return [];
  try {
    const { data } = await sb.from("leave_requests").select("*").order("submitted_at", { ascending: false });
    return (data ?? []).map(mapLeaveRequest);
  } catch {
    return [];
  }
}

export async function insertStaffMember(s: StaffMember): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  if (!/^[0-9a-fA-F-]{36}$/.test(s.id)) return;
  const payload = {
    id: s.id,
    full_name: s.name,
    email: s.email,
    department: STAFF_DEPT_TO_DB[s.department],
    role: s.roleKey ?? "viewer",
    unit_name: s.unit ?? null,
    specialty: s.specialty ?? null,
    is_active: s.status === "Active" || s.status === "On Leave" || s.status === "Probation",
  };
  let { error } = await sb.from("staff_profiles").upsert(payload);
  if (error && isMissingColumnError(error, "staff_profiles.specialty")) {
    ({ error } = await sb.from("staff_profiles").upsert(withoutSpecialty(payload)));
  }
  if (error) throw new Error(error.message);
}

export async function insertLeaveRequest(r: LeaveRequest): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  await sb.from("leave_requests").upsert({
    id: r.id, staff_id: r.staffId, staff_name: r.staffName, department: r.department,
    role: r.role, leave_type: r.leaveType, start_date: r.startDate, end_date: r.endDate,
    days: r.days, reason: r.reason, status: r.status, submitted_at: r.submittedAt,
    reviewed_by: r.reviewedBy, reviewed_at: r.reviewedAt, hr_notes: r.hrNotes,
  });
}

export async function fetchLeaveRequestsByDept(department: string): Promise<LeaveRequest[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("leave_requests")
    .select("*")
    .eq("department", department)
    .order("submitted_at", { ascending: false });
  return (data ?? []).map(mapLeaveRequest);
}

export async function reviewLeaveRequestByHOD(
  id: string,
  status: "Approved" | "Rejected",
  reviewedBy: string,
  notes: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("leave_requests").update({
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    hr_notes: notes,
  }).eq("id", id);
}

// ─── Performance Reviews ──────────────────────────────────────────────────────

export type KpiScore = {
  category: string;
  rating: number;
  comment: string;
};

export type PerformanceReview = {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  reviewerId: string;
  reviewerName: string;
  period: string;
  periodLabel: string;
  kpiScores: KpiScore[];
  overallRating: number | null;
  strengths: string;
  improvements: string;
  comments: string;
  status: "draft" | "submitted" | "acknowledged";
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
};

function mapReview(r: Record<string, unknown>): PerformanceReview {
  return {
    id: r.id as string,
    staffId: r.staff_id as string,
    staffName: r.staff_name as string,
    department: r.department as string,
    reviewerId: r.reviewer_id as string,
    reviewerName: r.reviewer_name as string,
    period: r.period as string,
    periodLabel: r.period_label as string,
    kpiScores: (r.kpi_scores as KpiScore[]) ?? [],
    overallRating: r.overall_rating as number | null,
    strengths: (r.strengths as string) ?? "",
    improvements: (r.improvements as string) ?? "",
    comments: (r.comments as string) ?? "",
    status: (r.status as PerformanceReview["status"]) ?? "draft",
    submittedAt: r.submitted_at as string | null,
    acknowledgedAt: r.acknowledged_at as string | null,
    createdAt: r.created_at as string,
  };
}

export async function fetchReviewsByDept(department: string): Promise<PerformanceReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("performance_reviews")
    .select("*")
    .eq("department", department)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapReview);
}

export async function fetchReviewsForStaff(staffId: string): Promise<PerformanceReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("performance_reviews")
    .select("*")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapReview);
}

export async function upsertPerformanceReview(
  review: Omit<PerformanceReview, "id" | "createdAt"> & { id?: string },
): Promise<PerformanceReview | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const payload: Record<string, unknown> = {
    staff_id: review.staffId,
    staff_name: review.staffName,
    department: review.department,
    reviewer_id: review.reviewerId,
    reviewer_name: review.reviewerName,
    period: review.period,
    period_label: review.periodLabel,
    kpi_scores: review.kpiScores,
    overall_rating: review.overallRating,
    strengths: review.strengths,
    improvements: review.improvements,
    comments: review.comments,
    status: review.status,
    submitted_at: review.submittedAt,
    updated_at: new Date().toISOString(),
  };
  if (review.id) payload.id = review.id;
  const { data, error } = await sb
    .from("performance_reviews")
    .upsert(payload)
    .select("*")
    .single();
  if (error || !data) return null;
  return mapReview(data as Record<string, unknown>);
}

export async function acknowledgeReview(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("performance_reviews").update({
    status: "acknowledged",
    acknowledged_at: new Date().toISOString(),
  }).eq("id", id);
}

// ─── Admin / IT / Store ───────────────────────────────────────────────────────

function mapAdminApproval(r: Record<string, unknown>): AdminApproval {
  return {
    id: r.id as string,
    department: r.department as AdminApproval["department"],
    category: r.category as AdminApproval["category"],
    title: r.title as string,
    description: (r.description as string) ?? "",
    requestedBy: (r.requested_by as string) ?? "",
    requestedAt: (r.requested_at as string) ?? "",
    amount: r.amount as number | undefined,
    priority: r.priority as AdminApproval["priority"],
    status: r.status as AdminApproval["status"],
    reviewedBy: r.reviewed_by as string | undefined,
    reviewedAt: r.reviewed_at as string | undefined,
    notes: r.notes as string | undefined,
  };
}

function mapDeptAlert(r: Record<string, unknown>): DeptAlert {
  return {
    id: r.id as string,
    department: r.department as DeptAlert["department"],
    level: r.level as DeptAlert["level"],
    message: r.message as string,
    time: (r.time as string) ?? "",
    resolved: Boolean(r.resolved),
  };
}

function mapITTicket(r: Record<string, unknown>): ITTicket {
  return {
    id: r.id as string,
    title: r.title as string,
    department: (r.department as string) ?? "",
    priority: r.priority as ITTicket["priority"],
    status: r.status as ITTicket["status"],
    assignedTo: (r.assigned_to as string) ?? "",
    openedAt: (r.opened_at as string) ?? "",
    resolvedAt: r.resolved_at as string | undefined,
  };
}

function mapStoreItem(r: Record<string, unknown>): StoreItem {
  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string) ?? "",
    currentStock: (r.current_stock as number) ?? 0,
    reorderLevel: (r.reorder_level as number) ?? 0,
    unit: (r.unit as string) ?? "",
    status: r.status as StoreItem["status"],
  };
}

function mapStorePO(r: Record<string, unknown>): StorePO {
  return {
    id: r.id as string,
    supplier: r.supplier as string,
    items: (r.items as StorePO["items"]) ?? [],
    value: (r.value as number) ?? 0,
    requestedBy: (r.requested_by as string) ?? "",
    requestedAt: (r.requested_at as string) ?? "",
    expectedDate: (r.expected_date as string) ?? "",
    status: r.status as StorePO["status"],
  };
}

export async function fetchAdminApprovals(): Promise<AdminApproval[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("admin_approvals").select("*").order("requested_at", { ascending: false });
  return (data ?? []).map(mapAdminApproval);
}

export async function fetchDeptAlerts(): Promise<DeptAlert[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("dept_alerts").select("*").order("time", { ascending: false });
  return (data ?? []).map(mapDeptAlert);
}

export async function fetchITTickets(): Promise<ITTicket[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("it_tickets").select("*").order("opened_at", { ascending: false });
  return (data ?? []).map(mapITTicket);
}

export async function fetchStoreItems(): Promise<StoreItem[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("store_items").select("*").order("name");
  return (data ?? []).map(mapStoreItem);
}

export async function fetchStorePOs(): Promise<StorePO[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("store_pos").select("*").order("requested_at", { ascending: false });
  return (data ?? []).map(mapStorePO);
}

export async function insertAdminApproval(a: AdminApproval): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  await sb.from("admin_approvals").upsert({
    id: a.id, department: a.department, category: a.category, title: a.title,
    description: a.description, requested_by: a.requestedBy, requested_at: a.requestedAt,
    amount: a.amount, priority: a.priority, status: a.status,
    reviewed_by: a.reviewedBy, reviewed_at: a.reviewedAt, notes: a.notes,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

function mapNotification(r: Record<string, unknown>): AppNotification {
  return {
    id: r.id as string,
    category: r.category as AppNotification["category"],
    severity: r.severity as AppNotification["severity"],
    title: r.title as string,
    body: (r.body as string) ?? "",
    href: (r.href as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
    isRead: Boolean(r.is_read),
    targetDepartments: (r.target_departments as AppNotification["targetDepartments"]) ?? [],
  };
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  return (data ?? []).map(mapNotification);
}

export async function insertNotification(n: AppNotification): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  await sb.from("notifications").upsert({
    id: n.id, category: n.category, severity: n.severity, title: n.title,
    body: n.body, href: n.href, is_read: n.isRead,
    target_departments: n.targetDepartments, created_at: n.createdAt,
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  await sb.from("notifications").update({ is_read: true }).eq("id", id);
}

// ─── Pharmacy Inventory ───────────────────────────────────────────────────────

export type PharmacyInventoryItem = {
  id: string;
  product: string;
  category: string;
  form: string;
  storeInventoryId?: string;
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  expiry: string;
  supplier: string;
  status: "ok" | "low" | "critical" | "out";
};

function mapPharmacyInventoryItem(r: Record<string, unknown>): PharmacyInventoryItem {
  return {
    id: r.id as string,
    product: r.product as string,
    category: (r.category as string) ?? "",
    form: (r.form as string) ?? "Tablet",
    storeInventoryId: (r.store_inventory_id as string) ?? undefined,
    stock: (r.stock as number) ?? 0,
    reorderLevel: (r.reorder_level as number) ?? 0,
    unitPrice: (r.unit_price as number) ?? 0,
    expiry: (r.expiry as string) ?? "",
    supplier: (r.supplier as string) ?? "",
    status: (r.status as PharmacyInventoryItem["status"]) ?? "ok",
  };
}

export async function fetchPharmacyInventory(): Promise<PharmacyInventoryItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("pharmacy_inventory").select("*").order("product");
  return (data ?? []).map(mapPharmacyInventoryItem);
}

export async function upsertPharmacyInventoryItem(item: PharmacyInventoryItem): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("pharmacy_inventory").upsert({
    id: item.id, product: item.product, category: item.category, form: item.form,
    store_inventory_id: item.storeInventoryId ?? null,
    stock: item.stock, reorder_level: item.reorderLevel, unit_price: item.unitPrice,
    expiry: item.expiry, supplier: item.supplier, status: item.status,
  });
}

export type PharmacyStockMovement = {
  id: string;
  inventoryId: string;
  movementType: "in" | "out" | "transfer" | "adjustment" | "dispense" | "return";
  quantity: number;
  referenceId?: string | null;
  sourceDestination?: string | null;
  refNo?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

function mapPharmacyStockMovement(r: Record<string, unknown>): PharmacyStockMovement {
  return {
    id: r.id as string,
    inventoryId: (r.inventory_id as string) ?? "",
    movementType: r.movement_type as PharmacyStockMovement["movementType"],
    quantity: Number(r.quantity ?? 0),
    referenceId: (r.reference_id as string) ?? null,
    sourceDestination: (r.source_destination as string) ?? null,
    refNo: (r.ref_no as string) ?? null,
    createdAt: (r.created_at as string) ?? "",
    createdBy: (r.created_by as string) ?? null,
  };
}

export async function fetchPharmacyStockMovements(): Promise<PharmacyStockMovement[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(250);
  if (error) {
    if (!error.message.toLowerCase().includes("stock_movements") || !error.message.toLowerCase().includes("schema cache")) {
      console.error("[db] fetchPharmacyStockMovements:", error.message);
    }
    return [];
  }
  return (data ?? []).map((row) => mapPharmacyStockMovement(row as Record<string, unknown>));
}

export async function insertPharmacyStockMovement(movement: {
  inventoryId: string;
  movementType: PharmacyStockMovement["movementType"];
  quantity: number;
  referenceId?: string | null;
  sourceDestination?: string | null;
  refNo?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("stock_movements").insert({
    inventory_id: movement.inventoryId,
    movement_type: movement.movementType,
    quantity: Math.max(0, Math.abs(movement.quantity)),
    reference_id: movement.referenceId ?? null,
    source_destination: movement.sourceDestination ?? null,
    ref_no: movement.refNo ?? null,
    created_at: movement.createdAt ?? new Date().toISOString(),
    created_by: movement.createdBy ?? null,
  });
  if (error && (!error.message.toLowerCase().includes("stock_movements") || !error.message.toLowerCase().includes("schema cache"))) {
    console.error("[db] insertPharmacyStockMovement:", error.message);
  }
}

// ─── Invoices & Payments ─────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "issued" | "part_paid" | "paid" | "overdue" | "cancelled";

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  patientId?: string | null;
  patientRecordId?: string;
  patientDisplayId?: string;
  patientContact?: string;
  patient: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  status: InvoiceStatus;
  items: string;
  notes?: string;
};

export type PaymentRecord = {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: "cash" | "card" | "transfer" | "mobile" | "other";
  paidAt: string;
  notes?: string;
};

type InvoiceNotesPayload = {
  patient?: string;
  items?: string;
  patientRecordId?: string;
  patientDisplayId?: string;
  patientContact?: string;
};

function normalizeInvoiceStatus(status: unknown): InvoiceStatus {
  const value = String(status ?? "").toLowerCase();
  if (value === "draft") return "draft";
  if (value === "issued" || value === "pending") return "issued";
  if (value === "part_paid" || value === "part paid" || value === "partial") return "part_paid";
  if (value === "paid") return "paid";
  if (value === "overdue") return "overdue";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  return "draft";
}

function parseInvoiceNotes(notes?: string | null): InvoiceNotesPayload {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as InvoiceNotesPayload;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return { items: notes };
  }
}

function buildInvoiceNotes(patient: string, items: string): string | null {
  if (!patient && !items) return null;
  return JSON.stringify({ patient, items });
}

function mapInvoice(r: Record<string, unknown>): InvoiceRecord {
  const noteData = parseInvoiceNotes((r.notes as string) ?? null);
  return {
    id: (r.id as string) ?? crypto.randomUUID(),
    invoiceNumber: (r.invoice_number as string) ?? (r.id as string) ?? "",
    patientId: (r.patient_id as string) ?? null,
    patientRecordId: noteData.patientRecordId,
    patientDisplayId: noteData.patientDisplayId,
    patientContact: noteData.patientContact,
    patient: noteData.patient ?? (r.patient as string) ?? (r.patient_id as string) ?? "Unknown patient",
    amountDue: (r.amount_due as number) ?? (r.amount as number) ?? 0,
    amountPaid: (r.amount_paid as number) ?? 0,
    dueDate: (r.due_date as string) ?? "",
    status: normalizeInvoiceStatus(r.status),
    items: noteData.items ?? (r.items as string) ?? "",
    notes: (r.notes as string) ?? undefined,
  };
}

function mapPayment(r: Record<string, unknown>): PaymentRecord {
  return {
    id: (r.id as string) ?? crypto.randomUUID(),
    invoiceId: (r.invoice_id as string) ?? "",
    amount: (r.amount as number) ?? 0,
    paymentMethod: ((r.payment_method as string) ?? "other").toLowerCase() as PaymentRecord["paymentMethod"],
    paidAt: (r.paid_at as string) ?? (r.created_at as string) ?? "",
    notes: (r.notes as string) ?? undefined,
  };
}

export async function fetchInvoices(): Promise<InvoiceRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapInvoice);
}

export async function insertInvoice(
  inv: Omit<InvoiceRecord, "id"> & { id?: string; notes?: string },
): Promise<InvoiceRecord> {
  const sb = getSupabase();
  if (!sb) return { ...inv, id: inv.id ?? crypto.randomUUID() } as InvoiceRecord;

  const id = inv.id ?? crypto.randomUUID();
  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id ?? null;
  const payload = {
    id,
    invoice_number: inv.invoiceNumber || id,
    patient_id: inv.patientId ?? null,
    amount_due: inv.amountDue,
    amount_paid: inv.amountPaid ?? 0,
    status: inv.status,
    due_date: inv.dueDate || null,
    notes: inv.notes ?? buildInvoiceNotes(inv.patient, inv.items),
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await sb.from("invoices").insert(payload).select("*").single();
  if (error) throw new Error(describeSupabaseError(error, "Failed to create invoice"));
  const created = mapInvoice(data as Record<string, unknown>);
  pushNotification({
    category: "accounts",
    severity: "info",
    title: "New invoice created",
    body: `${created.patient} - Invoice ${created.invoiceNumber} (${created.amountDue.toLocaleString()}) is ready for payment.`,
    href: "/app/accounts/receive-payment",
    targetDepartments: ["accounts"],
  });
  return created;
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  extra?: Partial<Pick<InvoiceRecord, "amountPaid" | "dueDate" | "notes" | "patientId" | "patient" | "items" | "invoiceNumber">>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const patch: Record<string, unknown> = { status };
  if (extra?.amountPaid !== undefined) patch.amount_paid = extra.amountPaid;
  if (extra?.dueDate !== undefined) patch.due_date = extra.dueDate || null;
  if (extra?.patientId !== undefined) patch.patient_id = extra.patientId ?? null;
  if (extra?.invoiceNumber !== undefined) patch.invoice_number = extra.invoiceNumber;
  if (extra?.notes !== undefined) patch.notes = extra.notes;
  if (extra?.patient !== undefined || extra?.items !== undefined) {
    patch.notes = buildInvoiceNotes(extra?.patient ?? "", extra?.items ?? "");
  }
  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id ?? null;
  patch.updated_by = userId;

  const { error } = await sb.from("invoices").update(patch).eq("id", id);
  if (error) throw new Error(describeSupabaseError(error, "Failed to update invoice"));
}

export async function fetchPayments(): Promise<PaymentRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("payments")
    .select("*")
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPayment);
}

export async function insertPayment(
  payment: Omit<PaymentRecord, "id" | "paidAt"> & { id?: string; paidAt?: string },
): Promise<PaymentRecord> {
  const sb = getSupabase();
  const record: PaymentRecord = {
    id: payment.id ?? crypto.randomUUID(),
    invoiceId: payment.invoiceId,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt ?? new Date().toISOString(),
    notes: payment.notes,
  };

  if (!sb) return record;

  const { error } = await sb.from("payments").upsert({
    id: record.id,
    invoice_id: record.invoiceId,
    amount: record.amount,
    payment_method: record.paymentMethod,
    paid_at: record.paidAt,
    notes: record.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return record;
}

export async function recordInvoicePayment(
  invoice: InvoiceRecord,
  amount: number,
  paymentMethod: PaymentRecord["paymentMethod"],
  notes?: string,
): Promise<{ invoice: InvoiceRecord; payment: PaymentRecord }> {
  if (amount <= 0) {
    throw new Error("Invoice balance is already settled.");
  }

  const nextAmountPaid = Math.min(invoice.amountDue, Number((invoice.amountPaid + amount).toFixed(2)));
  const nextStatus: InvoiceStatus = nextAmountPaid >= invoice.amountDue
    ? "paid"
    : nextAmountPaid > 0
      ? "part_paid"
      : invoice.status;

  const payment = await insertPayment({
    invoiceId: invoice.id,
    amount,
    paymentMethod,
    notes,
  });

  await updateInvoiceStatus(invoice.id, nextStatus, {
    amountPaid: nextAmountPaid,
    patient: invoice.patient,
    items: invoice.items,
    patientId: invoice.patientId ?? null,
    invoiceNumber: invoice.invoiceNumber,
    notes: invoice.notes,
    dueDate: invoice.dueDate,
  });

  return {
    invoice: {
      ...invoice,
      amountPaid: nextAmountPaid,
      status: nextStatus,
    },
    payment,
  };
}

// ─── Staff Shifts ─────────────────────────────────────────────────────────────

export type StaffShift = {
  id: string;
  staffId: string;
  shiftDate: string;
  shiftType: "morning" | "afternoon" | "evening" | "night" | "on_call";
  shiftStart: string;
  shiftEnd: string;
  unit: string;
  status: "scheduled" | "confirmed" | "completed" | "absent" | "swapped";
  department: string;
};

function mapStaffShift(r: Record<string, unknown>): StaffShift {
  return {
    id: r.id as string,
    staffId: (r.staff_id as string) ?? "",
    shiftDate: (r.shift_date as string) ?? "",
    shiftType: (r.shift_type as StaffShift["shiftType"]) ?? "morning",
    shiftStart: (r.shift_start as string) ?? "07:00",
    shiftEnd: (r.shift_end as string) ?? "14:00",
    unit: (r.unit as string) ?? "",
    status: (r.status as StaffShift["status"]) ?? "scheduled",
    department: (r.department as string) ?? "",
  };
}

export async function fetchStaffShifts(staffId: string): Promise<StaffShift[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("staff_shifts").select("*")
    .eq("staff_id", staffId)
    .order("shift_date");
  return (data ?? []).map(mapStaffShift);
}

// ─── Patient Registrations ────────────────────────────────────────────────────

export type PatientRegistration = {
  id: string;
  patientName: string;
  patientId: string;
  registeredAt: string;
  contact: string;
  email: string;
  initials: string;
  status: "Waiting" | "In Consultation" | "Discharged" | "Referred" | "Billing";
  registeredBy: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  bloodGroup?: string;
  nationality?: string;
  occupation?: string;
  hasHmo?: boolean;
  primaryHmoSchemeId?: string;
};

function mapPatientRegistration(r: Record<string, unknown>): PatientRegistration {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    registeredAt: (r.registered_at as string) ?? "",
    contact: (r.contact as string) ?? "",
    email: (r.email as string) ?? "",
    initials: (r.initials as string) ?? "",
    status: (r.status as PatientRegistration["status"]) ?? "Waiting",
    registeredBy: (r.registered_by as string) ?? "",
    dateOfBirth: (r.date_of_birth as string) ?? undefined,
    gender: (r.gender as string) ?? undefined,
    address: (r.address as string) ?? undefined,
    nextOfKinName: (r.next_of_kin_name as string) ?? undefined,
    nextOfKinPhone: (r.next_of_kin_phone as string) ?? undefined,
    bloodGroup: (r.blood_group as string) ?? undefined,
    nationality: (r.nationality as string) ?? "Ghanaian",
    occupation: (r.occupation as string) ?? undefined,
    hasHmo: (r.has_hmo as boolean) ?? false,
    primaryHmoSchemeId: (r.primary_hmo_scheme_id as string) ?? undefined,
  };
}

export async function fetchPatientRegistrations(): Promise<PatientRegistration[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("patient_registrations").select("*")
    .order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map(mapPatientRegistration);
}

export async function fetchHmoPatientRegistrations(): Promise<PatientRegistration[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("patient_registrations")
    .select("*")
    .eq("has_hmo", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPatientRegistration);
}

export async function insertPatientRegistration(
  reg: Omit<PatientRegistration, "id"> & { id?: string; hasHmo?: boolean; primaryHmoSchemeId?: string }
): Promise<{ id: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const id = reg.id ?? crypto.randomUUID();
  const { data, error } = await sb.from("patient_registrations").insert({
    id,
    patient_name: reg.patientName,
    patient_id: reg.patientId,
    registered_at: reg.registeredAt ?? new Date().toISOString(),
    contact: reg.contact,
    email: reg.email,
    initials: reg.initials,
    status: reg.status ?? "Waiting",
    registered_by: reg.registeredBy,
    date_of_birth: reg.dateOfBirth ?? null,
    gender: reg.gender ?? null,
    address: reg.address ?? null,
    next_of_kin_name: reg.nextOfKinName ?? null,
    next_of_kin_phone: reg.nextOfKinPhone ?? null,
    blood_group: reg.bloodGroup ?? null,
    nationality: reg.nationality ?? "Ghanaian",
    occupation: reg.occupation ?? null,
    has_hmo: reg.hasHmo ?? false,
    primary_hmo_scheme_id: reg.primaryHmoSchemeId ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function fetchPatientById(id: string): Promise<PatientRegistration | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("patient_registrations")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return mapPatientRegistration(data as Record<string, unknown>);
}

export async function fetchPatientByDisplayId(patientId: string): Promise<PatientRegistration | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("patient_registrations")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error || !data) return null;
  return mapPatientRegistration(data as Record<string, unknown>);
}

export async function updatePatientRegistration(
  id: string,
  updates: Partial<Omit<PatientRegistration, "id" | "patientId" | "registeredAt" | "registeredBy">>,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const payload: Record<string, unknown> = {};
  if (updates.patientName  !== undefined) payload.patient_name      = updates.patientName;
  if (updates.contact      !== undefined) payload.contact            = updates.contact;
  if (updates.email        !== undefined) payload.email              = updates.email;
  if (updates.status       !== undefined) payload.status             = updates.status;
  if (updates.gender       !== undefined) payload.gender             = updates.gender;
  if (updates.dateOfBirth  !== undefined) payload.date_of_birth      = updates.dateOfBirth || null;
  if (updates.address      !== undefined) payload.address            = updates.address;
  if (updates.nextOfKinName  !== undefined) payload.next_of_kin_name  = updates.nextOfKinName;
  if (updates.nextOfKinPhone !== undefined) payload.next_of_kin_phone = updates.nextOfKinPhone;
  if (updates.bloodGroup   !== undefined) payload.blood_group        = updates.bloodGroup;
  if (updates.nationality  !== undefined) payload.nationality        = updates.nationality;
  if (updates.occupation   !== undefined) payload.occupation         = updates.occupation;
  const { error } = await sb.from("patient_registrations").update(payload).eq("id", id);
  return !error;
}

export async function insertVisit(params: {
  patientId: string;
  patientName: string;
  visitType: string;
  department: string;
  assignedTo: string;
  doctorSpecialty?: string;
}): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const id = `VIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date();
  const { error } = await sb.from("visits").insert({
    id,
    patient_id:   params.patientId,
    patient_name: params.patientName,
    visit_date:   now.toISOString(),
    visit_type:   params.visitType,
    department:   params.department,
    assigned_to:  params.assignedTo,
    doctor_specialty: params.doctorSpecialty,
    status:       "Checked In",
    checked_in_at: now.toISOString(),
  });
  if (error) {
    console.error("[db] insertVisit:", error.code, error.message, error.details);
    return null;
  }
  return id;
}

export async function fetchAllVisits(): Promise<VisitRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("visits")
    .select("*")
    .order("visit_date", { ascending: false })
    .limit(200);
  return (data ?? []).map(mapVisit);
}

export async function fetchVisitsByPatientId(patientId: string): Promise<VisitRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("visits")
    .select("*")
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false })
    .limit(20);
  return (data ?? []).map(mapVisit);
}

// ─── IT System Status ─────────────────────────────────────────────────────────

export type ITSystemStatus = {
  id: string;
  name: string;
  status: "Operational" | "Degraded" | "Outage" | "Maintenance";
  uptime: string;
};

function mapITSystemStatus(r: Record<string, unknown>): ITSystemStatus {
  return {
    id: r.id as string,
    name: r.name as string,
    status: (r.status as ITSystemStatus["status"]) ?? "Operational",
    uptime: (r.uptime as string) ?? "100%",
  };
}

export async function fetchITSystemStatus(): Promise<ITSystemStatus[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("it_system_status").select("*").order("name");
  return (data ?? []).map(mapITSystemStatus);
}

// ─── Non-Clinical Units ───────────────────────────────────────────────────────

export type NcUnit = {
  id: string;
  name: string;
  createdAt: string;
};

export type NcShift = {
  id: string;
  staffId: string;
  department: string;
  unit: string;
  shiftDate: string;   // "YYYY-MM-DD"
  shiftType: "morning" | "afternoon" | "night" | "on_call";
  shiftStart: string;  // "HH:MM"
  shiftEnd: string;    // "HH:MM"
  status: "scheduled" | "confirmed" | "swapped" | "cancelled" | "completed";
  createdAt: string;
};

export type NcUnitHOD = {
  unitName: string;
  staffId: string;
  staffName: string;
  assignedOn: string;
};

export async function fetchNonClinicalUnits(): Promise<NcUnit[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("nc_units")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    createdAt: r.created_at as string,
  }));
}

export async function addNonClinicalUnit(
  name: string,
  createdBy?: string,
): Promise<NcUnit | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("nc_units")
    .insert({ name: name.trim(), created_by: createdBy ?? null })
    .select("id, name, created_at")
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    createdAt: data.created_at as string,
  };
}

export async function deleteNonClinicalUnit(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("nc_units").delete().eq("id", id);
}

/** Fetch all shifts for a unit across a date range */
export async function fetchShiftsForUnit(
  unitName: string,
  weekStart: string, // YYYY-MM-DD
  weekEnd: string,   // YYYY-MM-DD
): Promise<NcShift[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("staff_shifts")
    .select("*")
    .eq("unit", unitName)
    .eq("department", "non_clinical")
    .gte("shift_date", weekStart)
    .lte("shift_date", weekEnd)
    .order("shift_date", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    staffId: r.staff_id as string,
    department: r.department as string,
    unit: r.unit as string,
    shiftDate: r.shift_date as string,
    shiftType: (r.shift_type as NcShift["shiftType"]) ?? "morning",
    shiftStart: (r.shift_start as string) ?? "07:00",
    shiftEnd: (r.shift_end as string) ?? "15:00",
    status: (r.status as NcShift["status"]) ?? "scheduled",
    createdAt: r.created_at as string,
  }));
}

const SHIFT_TIMES: Record<NcShift["shiftType"], { start: string; end: string }> = {
  morning:   { start: "07:00", end: "15:00" },
  afternoon: { start: "15:00", end: "23:00" },
  night:     { start: "23:00", end: "07:00" },
  on_call:   { start: "00:00", end: "23:59" },
};

export async function createNcShift(params: {
  staffId: string;
  unitName: string;
  shiftDate: string;
  shiftType: NcShift["shiftType"];
}): Promise<NcShift | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const times = SHIFT_TIMES[params.shiftType];
  const { data, error } = await sb
    .from("staff_shifts")
    .insert({
      staff_id:    params.staffId,
      department:  "non_clinical",
      unit:        params.unitName,
      shift_date:  params.shiftDate,
      shift_type:  params.shiftType,
      shift_start: times.start,
      shift_end:   times.end,
      status:      "scheduled",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    staffId: data.staff_id as string,
    department: data.department as string,
    unit: data.unit as string,
    shiftDate: data.shift_date as string,
    shiftType: data.shift_type as NcShift["shiftType"],
    shiftStart: data.shift_start as string,
    shiftEnd: data.shift_end as string,
    status: data.status as NcShift["status"],
    createdAt: data.created_at as string,
  };
}

export async function deleteNcShift(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("staff_shifts").delete().eq("id", id);
}

/** Fetch all shifts for a clinical department across a date range */
export async function fetchShiftsForDept(
  department: string, // DB key e.g. "pharmacy"
  weekStart: string,
  weekEnd: string,
): Promise<NcShift[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("staff_shifts")
    .select("*")
    .eq("department", department)
    .neq("department", "non_clinical")
    .gte("shift_date", weekStart)
    .lte("shift_date", weekEnd)
    .order("shift_date", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    staffId: r.staff_id as string,
    department: r.department as string,
    unit: r.unit as string,
    shiftDate: r.shift_date as string,
    shiftType: (r.shift_type as NcShift["shiftType"]) ?? "morning",
    shiftStart: (r.shift_start as string) ?? "07:00",
    shiftEnd: (r.shift_end as string) ?? "15:00",
    status: (r.status as NcShift["status"]) ?? "scheduled",
    createdAt: r.created_at as string,
  }));
}

export async function createDeptShift(params: {
  staffId: string;
  department: string; // DB key e.g. "pharmacy"
  shiftDate: string;
  shiftType: NcShift["shiftType"];
  customStart?: string; // override default start time e.g. "09:00"
  customEnd?: string;   // override default end time e.g. "17:00"
}): Promise<NcShift | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const times = SHIFT_TIMES[params.shiftType];
  const { data, error } = await sb
    .from("staff_shifts")
    .insert({
      staff_id:    params.staffId,
      department:  params.department,
      unit:        params.department, // for clinical depts, unit mirrors department
      shift_date:  params.shiftDate,
      shift_type:  params.shiftType,
      shift_start: params.customStart ?? times.start,
      shift_end:   params.customEnd   ?? times.end,
      status:      "scheduled",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    staffId: data.staff_id as string,
    department: data.department as string,
    unit: data.unit as string,
    shiftDate: data.shift_date as string,
    shiftType: data.shift_type as NcShift["shiftType"],
    shiftStart: data.shift_start as string,
    shiftEnd: data.shift_end as string,
    status: data.status as NcShift["status"],
    createdAt: data.created_at as string,
  };
}

/** Fetch all unit HODs for the non_clinical department */
export async function fetchNcUnitHODs(): Promise<NcUnitHOD[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("department_heads")
    .select("unit_name, staff_id, staff_name, assigned_on")
    .eq("department", "non_clinical")
    .not("unit_name", "is", null);
  return (data ?? [])
    .filter((r) => r.unit_name)
    .map((r) => ({
      unitName:   r.unit_name as string,
      staffId:    r.staff_id as string,
      staffName:  r.staff_name as string,
      assignedOn: r.assigned_on as string,
    }));
}

/** Get the unit this staff member heads (null if not an NC HOD) */
export async function fetchMyNcUnit(staffId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("department_heads")
    .select("unit_name")
    .eq("department", "non_clinical")
    .eq("staff_id", staffId)
    .not("unit_name", "is", null)
    .limit(1)
    .maybeSingle();
  return (data?.unit_name as string) ?? null;
}

/** Assign (or replace) the HOD for a non-clinical unit */
export async function setNcUnitHOD(params: {
  unitName: string;
  staffId: string;
  staffName: string;
  assignedBy: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  // Clear existing HOD for this unit
  await sb
    .from("department_heads")
    .delete()
    .eq("department", "non_clinical")
    .eq("unit_name", params.unitName);
  // Assign the new one
  await sb.from("department_heads").insert({
    id:          crypto.randomUUID(),
    department:  "non_clinical",
    staff_id:    params.staffId,
    staff_name:  params.staffName,
    role_label:  "Unit Head",
    unit_name:   params.unitName,
    assigned_on: new Date().toISOString().slice(0, 10),
    assigned_by: params.assignedBy,
  });
}

// ─── Shift Presets ────────────────────────────────────────────────────────────

export type ShiftPreset = {
  id: string;
  department: string;
  name: string;
  startTime: string;
  endTime: string;
  shiftType: NcShift["shiftType"];
  colorKey: string;
  createdAt: string;
};

function mapShiftPreset(r: Record<string, unknown>): ShiftPreset {
  return {
    id:         r.id as string,
    department: r.department as string,
    name:       r.name as string,
    startTime:  r.start_time as string,
    endTime:    r.end_time as string,
    shiftType:  r.shift_type as NcShift["shiftType"],
    colorKey:   r.color_key as string,
    createdAt:  r.created_at as string,
  };
}

export async function fetchShiftPresets(department: string): Promise<ShiftPreset[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("shift_presets")
    .select("*")
    .eq("department", department)
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapShiftPreset);
}

export async function addShiftPreset(
  preset: Omit<ShiftPreset, "id" | "createdAt"> & { createdBy?: string },
): Promise<ShiftPreset | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("shift_presets")
    .insert({
      department:  preset.department,
      name:        preset.name,
      start_time:  preset.startTime,
      end_time:    preset.endTime,
      shift_type:  preset.shiftType,
      color_key:   preset.colorKey,
      created_by:  preset.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapShiftPreset(data as Record<string, unknown>);
}

export async function deleteShiftPreset(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("shift_presets").delete().eq("id", id);
}

// ─── Front Desk live stats ────────────────────────────────────────────────────

export type VisitRow = {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  visitType: string;
  department: string;
  assignedTo: string;
  doctorSpecialty?: string;
  status: string;
  checkedInAt: string | null;
};

function mapVisit(r: Record<string, unknown>): VisitRow {
  return {
    id: r.id as string,
    patientId: (r.patient_id as string) ?? "",
    patientName: (r.patient_name as string) ?? "",
    visitDate: (r.visit_date as string) ?? "",
    visitType: (r.visit_type as string) ?? "",
    department: (r.department as string) ?? "",
    assignedTo: (r.assigned_to as string) ?? "",
    doctorSpecialty: (r.doctor_specialty as string) ?? "",
    status: (r.status as string) ?? "",
    checkedInAt: (r.checked_in_at as string) ?? null,
  };
}

export async function fetchTodayVisits(): Promise<VisitRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const { data } = await sb
    .from("visits")
    .select("*")
    .gte("visit_date", start.toISOString())
    .lte("visit_date", end.toISOString())
    .order("visit_date", { ascending: false });
  return (data ?? []).map(mapVisit);
}

export async function fetchMyShiftToday(staffId: string): Promise<NcShift | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("staff_shifts")
    .select("*")
    .eq("staff_id", staffId)
    .eq("shift_date", today)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    staffId: data.staff_id as string,
    department: data.department as string,
    unit: data.unit as string,
    shiftDate: data.shift_date as string,
    shiftType: data.shift_type as NcShift["shiftType"],
    shiftStart: data.shift_start as string,
    shiftEnd: data.shift_end as string,
    status: data.status as NcShift["status"],
    createdAt: data.created_at as string,
  };
}

// ─── Billing Presets ──────────────────────────────────────────────────────────

export type BillingPreset = {
  id: string;
  category: string;  // 'visit' | 'frontdesk' | 'consultation' | 'procedure'
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
};

function mapBillingPreset(r: Record<string, unknown>): BillingPreset {
  return {
    id:          r.id as string,
    category:    r.category as string,
    name:        r.name as string,
    amount:      Number(r.amount ?? 0),
    description: r.description as string | undefined,
    isActive:    r.is_active as boolean,
  };
}

export async function fetchBillingPresets(): Promise<BillingPreset[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("billing_presets")
    .select("*")
    .order("category")
    .order("name");
  return (data ?? []).map(mapBillingPreset);
}

export async function upsertBillingPreset(
  preset: Omit<BillingPreset, "id"> & { id?: string },
): Promise<BillingPreset | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const payload: Record<string, unknown> = {
    category:    preset.category,
    name:        preset.name,
    amount:      preset.amount,
    description: preset.description ?? null,
    is_active:   preset.isActive,
  };
  if (preset.id) payload.id = preset.id;
  const { data, error } = await sb
    .from("billing_presets")
    .upsert(payload, { onConflict: "category,name" })
    .select()
    .single();
  if (error || !data) return null;
  return mapBillingPreset(data as Record<string, unknown>);
}

export async function deleteBillingPreset(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("billing_presets").delete().eq("id", id);
  return !error;
}

// ─── Store Inventory ──────────────────────────────────────────────────────────

export type StoreInventoryItem = {
  id: string;
  name: string;
  category: string;
  form?: string;
  unit: string;
  qty: number;
  reorder: number;
  unitCost: number;
  supplier: string;
  status: string;
};

function mapStoreInventoryItem(r: Record<string, unknown>): StoreInventoryItem {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    category: (r.category as string) ?? "Pharmaceutical",
    form: (r.form as string) ?? undefined,
    unit: (r.unit as string) ?? "Units",
    qty: Number(r.qty ?? 0),
    reorder: Number(r.reorder ?? 10),
    unitCost: Number(r.unit_cost ?? 0),
    supplier: (r.supplier as string) ?? "",
    status: (r.status as string) ?? "In Stock",
  };
}

export async function fetchStoreInventory(): Promise<StoreInventoryItem[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb
    .from("store_inventory")
    .select("*")
    .order("name");
  if (error) { console.error("[db] fetchStoreInventory:", error.message); return []; }
  return (data ?? []).map((r) => mapStoreInventoryItem(r as Record<string, unknown>));
}

export async function upsertStoreInventoryItem(item: StoreInventoryItem): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("store_inventory").upsert({
    id: item.id,
    name: item.name,
    category: item.category,
    form: item.form ?? null,
    unit: item.unit,
    qty: item.qty,
    reorder: item.reorder,
    unit_cost: item.unitCost,
    supplier: item.supplier ?? null,
    status: item.status,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("[db] upsertStoreInventoryItem:", error.message);
}

export async function adjustStoreInventoryQty(id: string, delta: number): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  // Fetch current qty first, then update
  const { data } = await sb.from("store_inventory").select("qty, reorder").eq("id", id).single();
  if (!data) return;
  const newQty = Math.max(0, Number(data.qty) + delta);
  const reorder = Number(data.reorder);
  let status = "In Stock";
  if (newQty === 0) status = "Out of Stock";
  else if (newQty <= reorder * 0.3) status = "Critical";
  else if (newQty <= reorder) status = "Low Stock";
  const { error } = await sb.from("store_inventory").update({ qty: newQty, status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) console.error("[db] adjustStoreInventoryQty:", error.message);
}

export async function adjustPharmacyInventoryStock(id: string, delta: number): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { data } = await sb.from("pharmacy_inventory").select("stock, reorder_level").eq("id", id).single();
  if (!data) return;
  const newStock = Math.max(0, Number(data.stock) + delta);
  const reorderLevel = Number(data.reorder_level);
  let status: string;
  if (newStock === 0) status = "out";
  else if (newStock <= reorderLevel * 0.3) status = "critical";
  else if (newStock <= reorderLevel) status = "low";
  else status = "ok";
  const { error } = await sb.from("pharmacy_inventory").update({ stock: newStock, status }).eq("id", id);
  if (error) console.error("[db] adjustPharmacyInventoryStock:", error.message);
}

export async function adjustPharmacyInventoryStockByStoreInventoryId(storeInventoryId: string, delta: number): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { data, error } = await sb
    .from("pharmacy_inventory")
    .select("id, stock, reorder_level")
    .eq("store_inventory_id", storeInventoryId)
    .maybeSingle();
  if (error || !data) return;
  const newStock = Math.max(0, Number(data.stock) + delta);
  const reorderLevel = Number(data.reorder_level);
  let status: string;
  if (newStock === 0) status = "out";
  else if (newStock <= reorderLevel * 0.3) status = "critical";
  else if (newStock <= reorderLevel) status = "low";
  else status = "ok";
  const update = await sb.from("pharmacy_inventory").update({ stock: newStock, status }).eq("id", data.id);
  if (update.error) console.error("[db] adjustPharmacyInventoryStockByStoreInventoryId:", update.error.message);
}

export async function upsertPharmacyInventoryFromStoreSnapshot(snapshot: StoreInventorySnapshot, qty: number): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { data, error } = await sb
    .from("pharmacy_inventory")
    .select("id, stock, reorder_level, product, category, form, unit_price, supplier")
    .eq("store_inventory_id", snapshot.id)
    .maybeSingle();
  if (error) {
    console.error("[db] upsertPharmacyInventoryFromStoreSnapshot:", error.message);
    return;
  }

  const stock = Math.max(0, qty);
  const reorderLevel = Number(snapshot.reorder) || 0;
  const status = stock === 0 ? "out" : stock <= reorderLevel * 0.3 ? "critical" : stock <= reorderLevel ? "low" : "ok";

  if (data) {
    const newStock = Math.max(0, Number(data.stock) + qty);
    const nextStatus = newStock === 0 ? "out" : newStock <= reorderLevel * 0.3 ? "critical" : newStock <= reorderLevel ? "low" : "ok";
    const update = await sb.from("pharmacy_inventory").update({
      product: snapshot.name,
      category: snapshot.category,
      form: snapshot.form ?? "Tablet",
      store_inventory_id: snapshot.id,
      stock: newStock,
      reorder_level: reorderLevel,
      unit_price: snapshot.unitCost,
      supplier: snapshot.supplier,
      status: nextStatus,
    }).eq("id", data.id);
    if (update.error) console.error("[db] upsertPharmacyInventoryFromStoreSnapshot update:", update.error.message);
    await insertPharmacyStockMovement({
      inventoryId: data.id,
      movementType: "in",
      quantity: qty,
      sourceDestination: snapshot.supplier || "Store transfer",
      refNo: `STORE-${snapshot.id}`,
    });
    return;
  }

  const insert = await sb.from("pharmacy_inventory").upsert({
    id: `PHM-${snapshot.id}`,
    store_inventory_id: snapshot.id,
    product: snapshot.name,
    category: snapshot.category,
    form: snapshot.form ?? "Tablet",
    stock,
    reorder_level: reorderLevel,
    unit_price: snapshot.unitCost,
    expiry: "",
    supplier: snapshot.supplier,
    status,
  });
  if (insert.error) console.error("[db] upsertPharmacyInventoryFromStoreSnapshot insert:", insert.error.message);
  await insertPharmacyStockMovement({
    inventoryId: `PHM-${snapshot.id}`,
    movementType: "in",
    quantity: qty,
    sourceDestination: snapshot.supplier || "Store transfer",
    refNo: `STORE-${snapshot.id}`,
  });
}

// ─── HMO / NHIS ──────────────────────────────────────────────────────────────

function mapHmoScheme(r: Record<string, unknown>): HmoScheme {
  return {
    id: r.id as string,
    name: r.name as string,
    code: r.code as string,
    type: (r.type as HmoScheme["type"]) ?? "fee_for_service",
    contactPerson: r.contact_person as string | undefined,
    contactPhone: r.contact_phone as string | undefined,
    contactEmail: r.contact_email as string | undefined,
    address: r.address as string | undefined,
    isActive: (r.is_active as boolean) ?? true,
    notes: r.notes as string | undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

function mapHmoTariff(r: Record<string, unknown>): HmoTariff {
  return {
    id: r.id as string,
    schemeId: r.scheme_id as string,
    serviceCategory: r.service_category as HmoTariff["serviceCategory"],
    serviceName: r.service_name as string,
    hmoPrice: Number(r.hmo_price ?? 0),
    copayType: (r.copay_type as HmoTariff["copayType"]) ?? "percentage",
    copayValue: Number(r.copay_value ?? 10),
    isActive: (r.is_active as boolean) ?? true,
    notes: r.notes as string | undefined,
  };
}

function mapHmoEnrollment(r: Record<string, unknown>): HmoEnrollment {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    patientName: (r.patient_name as string) ?? "",
    schemeId: r.scheme_id as string,
    schemeName: (r.scheme_name as string) ?? "",
    memberId: r.member_id as string,
    planName: r.plan_name as string | undefined,
    copayPercentage: Number(r.copay_percentage ?? 10),
    isActive: (r.is_active as boolean) ?? true,
    validFrom: r.valid_from as string | undefined,
    validUntil: r.valid_until as string | undefined,
    authorizedBy: r.authorized_by as string | undefined,
    notes: r.notes as string | undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

function mapHmoClaim(r: Record<string, unknown>): HmoClaim {
  return {
    id: r.id as string,
    claimNumber: r.claim_number as string,
    schemeId: r.scheme_id as string,
    schemeName: (r.scheme_name as string) ?? "",
    patientId: r.patient_id as string,
    patientName: (r.patient_name as string) ?? "",
    enrollmentId: r.enrollment_id as string | undefined,
    services: (r.services as HmoClaim["services"]) ?? [],
    totalCost: Number(r.total_cost ?? 0),
    copayAmount: Number(r.copay_amount ?? 0),
    hmoAmount: Number(r.hmo_amount ?? 0),
    status: (r.status as HmoClaim["status"]) ?? "draft",
    submittedAt: r.submitted_at as string | undefined,
    approvedAt: r.approved_at as string | undefined,
    rejectedAt: r.rejected_at as string | undefined,
    rejectionReason: r.rejection_reason as string | undefined,
    paidAt: r.paid_at as string | undefined,
    amountPaid: r.amount_paid != null ? Number(r.amount_paid) : undefined,
    notes: r.notes as string | undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

// HMO Schemes

export async function fetchHmoSchemes(): Promise<HmoScheme[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb
    .from("hmo_schemes")
    .select("*")
    .order("name");
  if (error) throw new Error(describeSupabaseError(error, "fetchHmoSchemes"));
  return (data ?? []).map((r) => mapHmoScheme(r as Record<string, unknown>));
}

export async function insertHmoScheme(scheme: Omit<HmoScheme, "id" | "createdAt">): Promise<HmoScheme> {
  const sb = getSupabase(); if (!sb) throw new Error("Supabase not available");
  const { data, error } = await sb
    .from("hmo_schemes")
    .insert({
      name: scheme.name,
      code: scheme.code,
      type: scheme.type,
      contact_person: scheme.contactPerson ?? null,
      contact_phone: scheme.contactPhone ?? null,
      contact_email: scheme.contactEmail ?? null,
      address: scheme.address ?? null,
      is_active: scheme.isActive,
      notes: scheme.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(describeSupabaseError(error, "insertHmoScheme"));
  return mapHmoScheme(data as Record<string, unknown>);
}

export async function updateHmoSchemeDb(id: string, patch: Partial<HmoScheme>): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.code !== undefined) update.code = patch.code;
  if (patch.type !== undefined) update.type = patch.type;
  if (patch.contactPerson !== undefined) update.contact_person = patch.contactPerson;
  if (patch.contactPhone !== undefined) update.contact_phone = patch.contactPhone;
  if (patch.contactEmail !== undefined) update.contact_email = patch.contactEmail;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.notes !== undefined) update.notes = patch.notes;
  update.updated_at = new Date().toISOString();
  const { error } = await sb.from("hmo_schemes").update(update).eq("id", id);
  if (error) throw new Error(describeSupabaseError(error, "updateHmoSchemeDb"));
}

// HMO Tariffs

export async function fetchHmoTariffs(schemeId?: string): Promise<HmoTariff[]> {
  const sb = getSupabase(); if (!sb) return [];
  let query = sb.from("hmo_tariffs").select("*").order("service_category").order("service_name");
  if (schemeId) query = query.eq("scheme_id", schemeId);
  const { data, error } = await query;
  if (error) throw new Error(describeSupabaseError(error, "fetchHmoTariffs"));
  return (data ?? []).map((r) => mapHmoTariff(r as Record<string, unknown>));
}

export async function insertHmoTariff(tariff: Omit<HmoTariff, "id">): Promise<HmoTariff> {
  const sb = getSupabase(); if (!sb) throw new Error("Supabase not available");
  const { data, error } = await sb
    .from("hmo_tariffs")
    .insert({
      scheme_id: tariff.schemeId,
      service_category: tariff.serviceCategory,
      service_name: tariff.serviceName,
      hmo_price: tariff.hmoPrice,
      copay_type: tariff.copayType,
      copay_value: tariff.copayValue,
      is_active: tariff.isActive,
      notes: tariff.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(describeSupabaseError(error, "insertHmoTariff"));
  return mapHmoTariff(data as Record<string, unknown>);
}

export async function updateHmoTariffDb(id: string, patch: Partial<HmoTariff>): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const update: Record<string, unknown> = {};
  if (patch.serviceCategory !== undefined) update.service_category = patch.serviceCategory;
  if (patch.serviceName !== undefined) update.service_name = patch.serviceName;
  if (patch.hmoPrice !== undefined) update.hmo_price = patch.hmoPrice;
  if (patch.copayType !== undefined) update.copay_type = patch.copayType;
  if (patch.copayValue !== undefined) update.copay_value = patch.copayValue;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.notes !== undefined) update.notes = patch.notes;
  const { error } = await sb.from("hmo_tariffs").update(update).eq("id", id);
  if (error) throw new Error(describeSupabaseError(error, "updateHmoTariffDb"));
}

export async function deleteHmoTariff(id: string): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const { error } = await sb.from("hmo_tariffs").delete().eq("id", id);
  if (error) throw new Error(describeSupabaseError(error, "deleteHmoTariff"));
}

// HMO Enrollments

export async function fetchHmoEnrollments(): Promise<HmoEnrollment[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data, error } = await sb
    .from("patient_hmo_enrollments")
    .select(`
      *,
      patients!patient_hmo_enrollments_patient_id_fkey(name),
      hmo_schemes!patient_hmo_enrollments_scheme_id_fkey(name)
    `)
    .order("created_at", { ascending: false });
  if (error) throw new Error(describeSupabaseError(error, "fetchHmoEnrollments"));
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const patientName = (row.patients as { name?: string } | null)?.name ?? (row.patient_name as string) ?? "";
    const schemeName = (row.hmo_schemes as { name?: string } | null)?.name ?? (row.scheme_name as string) ?? "";
    return { ...mapHmoEnrollment(row), patientName, schemeName };
  });
}

export async function insertHmoEnrollment(
  e: Omit<HmoEnrollment, "id" | "createdAt" | "schemeName" | "patientName">,
): Promise<HmoEnrollment> {
  const sb = getSupabase(); if (!sb) throw new Error("Supabase not available");
  const { data, error } = await sb
    .from("patient_hmo_enrollments")
    .insert({
      patient_id: e.patientId,
      scheme_id: e.schemeId,
      member_id: e.memberId,
      plan_name: e.planName ?? null,
      copay_percentage: e.copayPercentage,
      is_active: e.isActive,
      valid_from: e.validFrom ?? null,
      valid_until: e.validUntil ?? null,
      authorized_by: e.authorizedBy ?? null,
      notes: e.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(describeSupabaseError(error, "insertHmoEnrollment"));
  return mapHmoEnrollment(data as Record<string, unknown>);
}

export async function updateHmoEnrollmentDb(id: string, patch: Partial<HmoEnrollment>): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const update: Record<string, unknown> = {};
  if (patch.memberId !== undefined) update.member_id = patch.memberId;
  if (patch.planName !== undefined) update.plan_name = patch.planName;
  if (patch.copayPercentage !== undefined) update.copay_percentage = patch.copayPercentage;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.validFrom !== undefined) update.valid_from = patch.validFrom;
  if (patch.validUntil !== undefined) update.valid_until = patch.validUntil;
  if (patch.authorizedBy !== undefined) update.authorized_by = patch.authorizedBy;
  if (patch.notes !== undefined) update.notes = patch.notes;
  const { error } = await sb.from("patient_hmo_enrollments").update(update).eq("id", id);
  if (error) throw new Error(describeSupabaseError(error, "updateHmoEnrollmentDb"));
}

export async function fetchPatientEnrollment(patientId: string): Promise<HmoEnrollment | null> {
  const sb = getSupabase(); if (!sb) return null;
  // Fetch enrollment + scheme name. Patient name fetched separately to avoid join table ambiguity.
  const { data, error } = await sb
    .from("patient_hmo_enrollments")
    .select(`*, hmo_schemes!patient_hmo_enrollments_scheme_id_fkey(name)`)
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(describeSupabaseError(error, "fetchPatientEnrollment"));
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const schemeName = (row.hmo_schemes as { name?: string } | null)?.name ?? "";
  // Fetch patient name from patient_registrations
  const { data: patReg } = await sb
    .from("patient_registrations")
    .select("patient_name")
    .eq("id", patientId)
    .maybeSingle();
  const patientName = (patReg as { patient_name?: string } | null)?.patient_name ?? "";
  return { ...mapHmoEnrollment(row), patientName, schemeName };
}

// HMO Claims

export async function fetchHmoClaims(schemeId?: string): Promise<HmoClaim[]> {
  const sb = getSupabase(); if (!sb) return [];
  let query = sb
    .from("hmo_claims")
    .select(`
      *,
      hmo_schemes!hmo_claims_scheme_id_fkey(name),
      patients!hmo_claims_patient_id_fkey(name)
    `)
    .order("created_at", { ascending: false });
  if (schemeId) query = query.eq("scheme_id", schemeId);
  const { data, error } = await query;
  if (error) throw new Error(describeSupabaseError(error, "fetchHmoClaims"));
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const schemeName = (row.hmo_schemes as { name?: string } | null)?.name ?? (row.scheme_name as string) ?? "";
    const patientName = (row.patients as { name?: string } | null)?.name ?? (row.patient_name as string) ?? "";
    return { ...mapHmoClaim(row), schemeName, patientName };
  });
}

export async function insertHmoClaim(
  claim: Omit<HmoClaim, "id" | "claimNumber" | "createdAt" | "schemeName" | "patientName">,
): Promise<HmoClaim> {
  const sb = getSupabase(); if (!sb) throw new Error("Supabase not available");
  const { data, error } = await sb
    .from("hmo_claims")
    .insert({
      scheme_id: claim.schemeId,
      patient_id: claim.patientId,
      enrollment_id: claim.enrollmentId ?? null,
      services: claim.services,
      source_charges: null,
      total_cost: claim.totalCost,
      copay_amount: claim.copayAmount,
      hmo_amount: claim.hmoAmount,
      status: claim.status ?? "draft",
      notes: claim.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(describeSupabaseError(error, "insertHmoClaim"));
  return mapHmoClaim(data as Record<string, unknown>);
}

export async function updateHmoClaimDb(id: string, patch: Partial<HmoClaim>): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.submittedAt !== undefined) update.submitted_at = patch.submittedAt;
  if (patch.approvedAt !== undefined) update.approved_at = patch.approvedAt;
  if (patch.rejectedAt !== undefined) update.rejected_at = patch.rejectedAt;
  if (patch.rejectionReason !== undefined) update.rejection_reason = patch.rejectionReason;
  if (patch.paidAt !== undefined) update.paid_at = patch.paidAt;
  if (patch.amountPaid !== undefined) update.amount_paid = patch.amountPaid;
  if (patch.notes !== undefined) update.notes = patch.notes;
  const { error } = await sb.from("hmo_claims").update(update).eq("id", id);
  if (error) throw new Error(describeSupabaseError(error, "updateHmoClaimDb"));
}
