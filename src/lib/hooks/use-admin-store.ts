"use client";

import { useEffect, useReducer } from "react";
import {
  subscribeAdminStore,
  syncAdminFromSupabase,
  getApprovals,
  getDeptAlerts,
  getITTickets,
  getStoreItems,
  getStorePOs,
  getHRStaff,
  getHRLeaveRequests,
  getAdminMetrics,
} from "@/lib/data/admin-store";

export function useAdminStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    syncAdminFromSupabase();
    const unsub = subscribeAdminStore(rerender);
    return () => { unsub(); };
  }, []);

  return {
    approvals: getApprovals(),
    alerts: getDeptAlerts(),
    itTickets: getITTickets(),
    storeItems: getStoreItems(),
    storePOs: getStorePOs(),
    hrStaff: getHRStaff(),
    hrLeaveRequests: getHRLeaveRequests(),
    metrics: getAdminMetrics(),
  };
}
