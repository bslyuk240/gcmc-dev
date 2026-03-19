import type { DoctorProfile, ConsultationRecord } from "@/lib/data/doctors-store";
import type { WardPatient } from "@/lib/data/nurses-store";

export const DEFAULT_DOCTOR_SPECIALTIES = [
  "General Medicine",
  "Paediatrics",
  "Surgery",
  "Gynaecology",
  "Physiotherapy",
  "Emergency Medicine",
] as const;

export function normalizeDoctorSpecialty(value?: string | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();

  if (["general", "general medicine", "medical officer", "family medicine", "general practice"].includes(normalized)) {
    return "General Medicine";
  }
  if (["paediatric", "paediatrics", "pediatric", "pediatrics", "child health"].includes(normalized)) {
    return "Paediatrics";
  }
  if (["surgery", "surgeon", "general surgery", "surgical"].includes(normalized)) {
    return "Surgery";
  }
  if ([
    "gynaecology",
    "gynaecologist",
    "gynecology",
    "gynecologist",
    "obstetrics",
    "obstetrics & gynaecology",
    "obstetrics and gynaecology",
    "ob/gyn",
    "obgyn",
    "antenatal",
  ].includes(normalized)) {
    return "Gynaecology";
  }
  if (["physiotherapy", "physiotherapist", "rehabilitation", "rehab"].includes(normalized)) {
    return "Physiotherapy";
  }
  if (["emergency", "emergency medicine"].includes(normalized)) {
    return "Emergency Medicine";
  }

  return raw;
}

export function buildDoctorRoutingChoices(doctors: DoctorProfile[]) {
  const activeDoctors = doctors.filter((doctor) => doctor.status === "On Duty");
  const specialtySet = new Set<string>(DEFAULT_DOCTOR_SPECIALTIES);

  doctors.forEach((doctor) => {
    const specialty = normalizeDoctorSpecialty(doctor.specialty);
    if (specialty) specialtySet.add(specialty);
  });

  return {
    activeDoctors,
    specialties: [...specialtySet].sort((left, right) => left.localeCompare(right)),
  };
}

export function getActiveDoctorSpecialties(doctors: DoctorProfile[]) {
  return doctors
    .filter((doctor) => doctor.status === "On Duty")
    .map((doctor) => normalizeDoctorSpecialty(doctor.specialty))
    .filter(Boolean);
}

export type DoctorRouteDetails = {
  routeLabel: string;
  doctorName?: string;
  doctorSpecialty?: string;
};

export function resolveDoctorRoute(value: string, doctors: DoctorProfile[]): DoctorRouteDetails {
  if (!value) return { routeLabel: "" };

  if (value.startsWith("doctor:")) {
    const doctorId = value.replace("doctor:", "");
    const doctor = doctors.find((entry) => entry.id === doctorId);
    if (!doctor) return { routeLabel: "" };
    const specialty = normalizeDoctorSpecialty(doctor.specialty);
    return {
      routeLabel: doctor.name,
      doctorName: doctor.name,
      doctorSpecialty: specialty || undefined,
    };
  }

  if (value.startsWith("specialty:")) {
    const specialty = normalizeDoctorSpecialty(value.replace("specialty:", ""));
    return {
      routeLabel: specialty ? `${specialty} Queue` : "",
      doctorSpecialty: specialty || undefined,
    };
  }

  if (value === "queue:triage") return { routeLabel: "Triage Queue" };
  if (value === "queue:emergency") return { routeLabel: "Emergency Team" };

  return { routeLabel: value };
}

export function getDoctorSelectionValue(
  patient: Pick<WardPatient, "doctorInCharge" | "doctorSpecialty">,
  doctors: DoctorProfile[],
) {
  const directDoctor = doctors.find((doctor) => doctor.name === (patient.doctorInCharge ?? "").trim());
  if (directDoctor) return `doctor:${directDoctor.id}`;

  const specialty = normalizeDoctorSpecialty(patient.doctorSpecialty);
  if (specialty) return `specialty:${specialty}`;

  return "";
}

export function describeDoctorRoute(patient: Pick<WardPatient, "doctorInCharge" | "doctorSpecialty">) {
  return patient.doctorInCharge?.trim() || normalizeDoctorSpecialty(patient.doctorSpecialty) || "-";
}

export function getCurrentDoctorSpecialty(doctors: DoctorProfile[], doctorName: string) {
  const currentDoctor = doctors.find((doctor) => doctor.name.trim().toLowerCase() === doctorName.trim().toLowerCase());
  return normalizeDoctorSpecialty(currentDoctor?.specialty);
}

export function canDoctorAccessPatient(
  patient: Pick<WardPatient, "unit" | "doctorInCharge" | "doctorSpecialty">,
  currentDoctorName: string,
  currentDoctorSpecialty: string,
) {
  const directDoctor = (patient.doctorInCharge ?? "").trim().toLowerCase();
  const specialty = normalizeDoctorSpecialty(patient.doctorSpecialty);
  const doctorName = currentDoctorName.trim().toLowerCase();

  if (directDoctor) return directDoctor === doctorName;
  if (specialty) return Boolean(currentDoctorSpecialty) && specialty === currentDoctorSpecialty;

  // Keep emergency work shared when it has not yet been explicitly routed.
  return patient.unit === "Emergency";
}

export function canDoctorAccessConsultation(consultation: ConsultationRecord, currentDoctorName: string) {
  return consultation.doctorName.trim().toLowerCase() === currentDoctorName.trim().toLowerCase();
}
