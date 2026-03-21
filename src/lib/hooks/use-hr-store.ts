"use client";

import { useEffect, useReducer } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
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
    const refresh = () => { void syncHRFromSupabase(); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    const supabase = createClient();
    const channel = supabase
      ?.channel("hr-payroll-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_payslips" }, () => void syncHRFromSupabase())
      .on("postgres_changes", { event: "*", schema: "public", table: "payroll_batches" }, () => void syncHRFromSupabase())
      .subscribe();
    return () => {
      window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
      if (channel) supabase?.removeChannel(channel);
      unsub();
    };
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
