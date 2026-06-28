import {
  DB_DEPARTMENT_KEYS,
  departmentHomePaths,
  departmentThemes,
  type DBDepartmentKey,
  type DepartmentKey,
} from "@/lib/constants/navigation";

export type HospitalPortalType = "management" | "staff";

export type HospitalPortal = {
  key: string;
  label: string;
  description: string;
  department: DepartmentKey;
  portalType: HospitalPortalType;
  path: string;
  chipClass: string;
};

const MANAGEMENT_PORTALS: HospitalPortal[] = DB_DEPARTMENT_KEYS.map((dept) => ({
  key: dept,
  label: departmentThemes[dept].label,
  description: `Management workspace — ${departmentThemes[dept].label}`,
  department: dept,
  portalType: "management" as const,
  path: departmentHomePaths[dept],
  chipClass: departmentThemes[dept].chipClass,
}));

export const HOSPITAL_PORTALS: HospitalPortal[] = [
  ...MANAGEMENT_PORTALS,
  {
    key: "staff",
    label: "Staff Self-Service",
    description: "Rota, leave, payslips, and profile for hospital staff",
    department: "non_clinical",
    portalType: "staff",
    path: "/staff/dashboard",
    chipClass: departmentThemes.non_clinical.chipClass,
  },
];

export function getHospitalPortal(key: string): HospitalPortal | undefined {
  return HOSPITAL_PORTALS.find((p) => p.key === key);
}

export function portalActingRole(portal: HospitalPortal): "admin" | "non_clinical_staff" {
  return portal.portalType === "staff" ? "non_clinical_staff" : "admin";
}

export function isDBDepartmentPortal(dept: DepartmentKey): dept is DBDepartmentKey {
  return DB_DEPARTMENT_KEYS.includes(dept as DBDepartmentKey);
}
