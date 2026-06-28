import type { GeneratedPayslip, LeaveRequest, LeaveYearPolicy } from "@/lib/data/hr-store";

export type StaffProfileDetails = {
  phone: string;
  homeAddress: string;
  unit?: string;
  bankName?: string;
  bankAccount?: string;
  taxId?: string;
  pensionNumber?: string;
  nhfNumber?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactAddress?: string;
};

export type StaffLeaveBalance = {
  annual: { used: number; total: number; remaining: number };
  sick: { used: number; total: number; remaining: number };
};

export type StaffDashboardShift = {
  id: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  shiftType?: string;
  unitName?: string;
};

export type StaffDocument = {
  id: string;
  title: string;
  category: string;
  issuedOn?: string;
  expiryDate?: string;
  fileName?: string;
  storagePath?: string;
  status: "Valid" | "Expiring Soon" | "Expired";
};

export type StaffDashboardSummary = {
  leaveBalance: StaffLeaveBalance;
  upcomingShifts: StaffDashboardShift[];
  pendingLeaveCount: number;
  pendingReviewCount: number;
  assignedTaskCount: number;
  leavePolicies: LeaveYearPolicy[];
};

export type { GeneratedPayslip, LeaveRequest, LeaveYearPolicy };
