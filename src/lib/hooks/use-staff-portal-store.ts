"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STAFF_PORTAL_UPDATED_EVENT,
  fetchMyDocuments,
  fetchMyPayslips,
  fetchStaffDashboard,
  fetchStaffLeavePolicies,
} from "@/lib/staff-portal/client";
import type {
  GeneratedPayslip,
  LeaveYearPolicy,
  StaffDashboardSummary,
  StaffDocument,
} from "@/modules/staff-portal/types";

export function useStaffPortalStore() {
  const [hydrated, setHydrated] = useState(false);
  const [dashboard, setDashboard] = useState<StaffDashboardSummary | null>(null);
  const [payslips, setPayslips] = useState<GeneratedPayslip[]>([]);
  const [policies, setPolicies] = useState<LeaveYearPolicy[]>([]);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);

  const reload = useCallback(async () => {
    try {
      const [dash, pays, pol, docs] = await Promise.all([
        fetchStaffDashboard(),
        fetchMyPayslips(),
        fetchStaffLeavePolicies(),
        fetchMyDocuments(),
      ]);
      setDashboard(dash);
      setPayslips(pays);
      setPolicies(pol.length ? pol : dash.leavePolicies);
      setDocuments(docs);
    } catch (err) {
      console.error("[useStaffPortalStore]", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onUpdate = () => { void reload(); };
    window.addEventListener(STAFF_PORTAL_UPDATED_EVENT, onUpdate);
    const poll = setInterval(reload, 60_000);
    return () => {
      window.removeEventListener(STAFF_PORTAL_UPDATED_EVENT, onUpdate);
      clearInterval(poll);
    };
  }, [reload]);

  return { hydrated, dashboard, payslips, policies, documents, reload };
}
