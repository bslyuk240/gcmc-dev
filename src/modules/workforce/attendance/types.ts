import type { DepartmentKey } from "@/lib/constants/navigation";

export type AttendanceStatus = "Present" | "Late" | "Half-day" | "Absent" | "Leave" | "Holiday";

export type AttendanceRecord = {
  id: string;
  staffId: string;
  staffName: string;
  department: DepartmentKey;
  role: string;
  attendanceDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  hours: number;
  status: AttendanceStatus;
  unit: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceClockInInput = {
  staffId: string;
  staffName: string;
  department: DepartmentKey;
  role: string;
  attendanceDate: string;
  clockInAt: string;
  status: AttendanceStatus;
  unit?: string | null;
};

export type AttendanceClockOutInput = {
  staffId: string;
  attendanceDate: string;
  clockOutAt: string;
};

