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
} from "@/lib/data/hr-store";
import type {
  AdminApproval,
  DeptAlert,
  ITTicket,
  StoreItem,
  StorePO,
} from "@/lib/data/admin-store";
import type { AppNotification } from "@/lib/data/notification-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient();
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
  const { data } = await sb.from("doctor_profiles").select("*");
  return (data ?? []).map(mapDoctor);
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
  await sb.from("consultations").upsert({
    id: c.id, patient_name: c.patientName, patient_id: c.patientId,
    doctor_name: c.doctorName, consult_type: c.consultType, date: c.date,
    time: c.time, status: c.status, chief_complaint: c.chiefComplaint,
    diagnosis: c.diagnosis, notes: c.notes, rx_written: c.rxWritten,
    lab_ordered: c.labOrdered, admission_ordered: c.admissionOrdered,
    admission_unit: c.admissionUnit, consult_fee: c.consultFee, fee_paid: c.feePaid,
  });
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
  await sb.from("consultations").update(patch).eq("id", id);
}

export async function insertAdmissionOrder(a: AdmissionOrder): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("admission_orders").upsert({
    id: a.id, patient_name: a.patientName, patient_id: a.patientId,
    ordered_by: a.orderedBy, unit: a.unit, reason: a.reason,
    ordered_at: a.orderedAt, status: a.status,
  });
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
  return {
    id: r.id as string,
    drug: r.drug as string,
    inventoryItemId: (r.inventory_item_id as string) ?? "",
    currentStock: (r.current_stock as number) ?? 0,
    reorderLevel: (r.reorder_level as number) ?? 0,
    qtyRequested: (r.qty_requested as number) ?? 0,
    unit: (r.unit as string) ?? "",
    urgency: r.urgency as PharmacyRestockRequest["urgency"],
    requestedBy: (r.requested_by as string) ?? "",
    requestedAt: (r.requested_at as string) ?? "",
    status: r.status as PharmacyRestockRequest["status"],
    notes: r.notes as string | undefined,
    approvedQty: r.approved_qty as number | undefined,
    fulfilledAt: r.fulfilled_at as string | undefined,
  };
}

function mapPharmacyBill(r: Record<string, unknown>): PharmacyBill {
  return {
    id: r.id as string,
    prescriptionId: (r.prescription_id as string) ?? "",
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    drugs: [],
    totalCost: (r.total_cost as number) ?? 0,
    dispensedAt: (r.dispensed_at as string) ?? "",
    billStatus: r.bill_status as PharmacyBill["billStatus"],
    source: (r.source as PharmacyBill["source"]) ?? "Prescription",
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
  if (!error && p.drugs.length > 0) {
    await sb.from("prescribed_drugs").upsert(
      p.drugs.map((d) => ({
        prescription_id: p.id,
        name: d.name, dosage: d.dosage, frequency: d.frequency,
        duration: d.duration, qty: Number(d.qty) || 0, unit_price: d.unitPrice,
      }))
    );
  }
}

export async function upsertPrescriptionStatus(id: string, status: SharedPrescription["status"], extra?: Partial<SharedPrescription>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("prescriptions").update({
    status,
    ...(extra?.dispensedAt ? { dispensed_at: extra.dispensedAt } : {}),
    ...(extra?.dispensedBy ? { dispensed_by: extra.dispensedBy } : {}),
    ...(extra?.totalCost !== undefined ? { total_cost: extra.totalCost } : {}),
  }).eq("id", id);
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
    interpretation: r.interpretation as string | undefined,
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
  await sb.from("lab_tests").upsert({
    id: t.id, patient_name: t.patientName, patient_id: t.patientId,
    test_name: t.testName, test_code: t.testCode, category: t.category,
    ordered_by: t.orderedBy, ordered_at: t.orderedAt, priority: t.priority,
    status: t.status, sample_type: t.sampleType, price: t.price,
    bill_status: t.billStatus,
  });
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
  await sb.from("lab_tests").update(patch).eq("id", id);
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
    vitals: { bp: r.bp as string, pulse: r.pulse as string, temp: r.temp as string, spo2: r.spo2 as string, gcs: r.gcs as string },
    doctorInCharge: (r.doctor_in_charge as string) ?? "",
    notes: (r.notes as string) ?? "",
    lastVitalsAt: r.last_vitals_at as string | undefined,
    labTestsOrdered: [],
    medsScheduled: [],
  };
}

function mapNursingProcedure(r: Record<string, unknown>): NursingProcedure {
  return {
    id: r.id as string,
    patientName: r.patient_name as string,
    patientId: (r.patient_id as string) ?? "",
    unit: (r.unit as string) ?? "",
    procedureType: r.procedure_type as string,
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
    unit: (r.unit as string) ?? "",
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

export async function fetchICUVitals(): Promise<ICUVitalsEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("icu_vitals").select("*").order("recorded_at", { ascending: false });
  return (data ?? []).map(mapICUVitals);
}

export async function insertWardPatient(p: WardPatient): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("ward_patients").upsert({
    id: p.id, patient_name: p.patientName, patient_id: p.patientId,
    unit: p.unit, bed: p.bed, diagnosis: p.diagnosis, admitted_at: p.admittedAt,
    assigned_nurse: p.assignedNurse, priority: p.priority, status: p.status,
    bp: p.vitals?.bp, pulse: p.vitals?.pulse, temp: p.vitals?.temp,
    spo2: p.vitals?.spo2, gcs: p.vitals?.gcs,
    doctor_in_charge: p.doctorInCharge, notes: p.notes, last_vitals_at: p.lastVitalsAt,
  });
}

export async function insertNursingProcedure(p: NursingProcedure): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("nursing_procedures").upsert({
    id: p.id, patient_name: p.patientName, patient_id: p.patientId,
    unit: p.unit, procedure_type: p.procedureType, description: p.description,
    performed_by: p.performedBy, performed_at: p.performedAt, amount: p.amount,
    bill_status: p.billStatus,
  });
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
    chargeType: r.charge_type as string,
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
    consultationType: (r.consultation_type as string) ?? "",
    fee: (r.fee as number) ?? 0,
    consultedAt: (r.consulted_at as string) ?? "",
    status: r.status as ConsultationFee["status"],
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
    entries: [],
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

// ─── HR ───────────────────────────────────────────────────────────────────────

function mapStaffMember(r: Record<string, unknown>): StaffMember {
  return {
    id: r.id as string,
    name: r.name as string,
    department: r.department as StaffMember["department"],
    unit: r.unit as string | undefined,
    role: r.role as string,
    roleKey: r.role_key as StaffMember["roleKey"],
    contractType: r.contract_type as StaffMember["contractType"],
    email: (r.email as string) ?? "",
    phone: (r.phone as string) ?? "",
    joinDate: (r.join_date as string) ?? "",
    contractEndDate: r.contract_end_date as string | undefined,
    status: r.status as StaffMember["status"],
    licenseNumber: r.license_number as string | undefined,
    licenseExpiry: r.license_expiry as string | undefined,
    salary: (r.salary as number) ?? 0,
    systemAccessCreated: Boolean(r.system_access_created),
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
  const { data } = await sb.from("staff_members").select("*").order("name");
  return (data ?? []).map(mapStaffMember);
}

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  const sb = getSupabase(); if (!sb) return [];
  const { data } = await sb.from("leave_requests").select("*").order("submitted_at", { ascending: false });
  return (data ?? []).map(mapLeaveRequest);
}

export async function insertStaffMember(s: StaffMember): Promise<void> {
  const sb = getSupabase(); if (!sb) return;
  await sb.from("staff_members").upsert({
    id: s.id, name: s.name, department: s.department, unit: s.unit,
    role: s.role, role_key: s.roleKey, contract_type: s.contractType,
    email: s.email, phone: s.phone, join_date: s.joinDate,
    contract_end_date: s.contractEndDate, status: s.status,
    license_number: s.licenseNumber, license_expiry: s.licenseExpiry,
    salary: s.salary, system_access_created: s.systemAccessCreated, notes: s.notes,
  });
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

// ─── Admin / IT / Store ───────────────────────────────────────────────────────

function mapAdminApproval(r: Record<string, unknown>): AdminApproval {
  return {
    id: r.id as string,
    department: r.department as AdminApproval["department"],
    category: r.category as string,
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
    href: r.href as string | undefined,
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
