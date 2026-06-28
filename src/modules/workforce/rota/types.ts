import type { DBDepartmentKey, DepartmentKey } from "@/lib/constants/navigation";

export type ShiftType   = "morning" | "afternoon" | "evening" | "night" | "on_call";
export type RotaStatus  = "scheduled" | "confirmed" | "swapped" | "cancelled" | "completed";

export type Unit = {
  id:          string;
  department:  DepartmentKey;
  name:        string;
  description: string | null;
  is_active:   boolean;
  created_at:  string;
};

export type StaffUnitAssignment = {
  id:         string;
  staff_id:   string;
  unit_id:    string;
  start_date: string;
  end_date:   string | null;
  notes:      string | null;
  created_at: string;
  // Joined
  unit?:  Unit;
  staff?: { full_name: string; email: string };
};

export type RotaAssignment = {
  id:          string;
  staff_id:    string;
  department:  DepartmentKey;
  unit_id:     string | null;
  unit_name?:  string | null;
  shift_date:  string;    // ISO date e.g. "2026-03-15"
  shift_type:  ShiftType;
  shift_start: string | null;
  shift_end:   string | null;
  status:      RotaStatus;
  notes:       string | null;
  created_at:  string;
  created_by:  string | null;
  // Joined
  unit?:  Unit;
  staff?: { full_name: string; email: string; department: DepartmentKey };
};

export type RotaSwapRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type RotaSwapRequest = {
  id: string;
  assignmentId: string;
  staffId: string;
  staffName: string;
  department: DBDepartmentKey;
  shiftDate: string;
  shiftType: ShiftType;
  shiftStart: string | null;
  shiftEnd: string | null;
  unitId: string | null;
  unitName: string | null;
  reason: string | null;
  status: RotaSwapRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRotaPayload = Pick<
  RotaAssignment,
  "staff_id" | "department" | "unit_id" | "unit_name" | "shift_date" | "shift_type" | "shift_start" | "shift_end" | "notes"
>;

export type CreateRotaSwapRequestPayload = Pick<
  RotaSwapRequest,
  | "assignmentId"
  | "staffId"
  | "staffName"
  | "department"
  | "shiftDate"
  | "shiftType"
  | "shiftStart"
  | "shiftEnd"
  | "unitId"
  | "unitName"
  | "reason"
>;

export type WeekRota = {
  weekStarting: string;
  department:   DepartmentKey;
  assignments:  RotaAssignment[];
};
