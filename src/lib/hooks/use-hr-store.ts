"use client";

import { useEffect, useReducer } from "react";
import {
  subscribeHRStore,
  syncHRFromSupabase,
  getStaffMembers,
  getLeaveRequests,
  getOnboarding,
  getOffboarding,
  getPayrollPreps,
  getGeneratedPayslips,
  getHRMetrics,
  getStaffByDepartment,
  getDepartmentHeads,
  getDepartmentHead,
  type StaffDepartment,
} from "@/lib/data/hr-store";

export function useHRStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    syncHRFromSupabase();
    const unsub = subscribeHRStore(rerender);
    return () => { unsub(); };
  }, []);

  return {
    staff: getStaffMembers(),
    leaveRequests: getLeaveRequests(),
    onboarding: getOnboarding(),
    offboarding: getOffboarding(),
    payrollPreps: getPayrollPreps(),
    generatedPayslips: getGeneratedPayslips(),
    metrics: getHRMetrics(),
    departmentHeads: getDepartmentHeads(),
    getByDept: (dept: StaffDepartment) => getStaffByDepartment(dept),
    getDeptHead: (dept: StaffDepartment) => getDepartmentHead(dept),
  };
}
