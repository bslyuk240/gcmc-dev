"use client";

import { useEffect, useReducer } from "react";
import {
  subscribePharmacyStore,
  syncPharmacyFromSupabase,
  getPrescriptions,
  getNurseRequests,
  getRestockRequests,
  getPharmacyBills,
  getPharmacyMetrics,
} from "@/lib/data/pharmacy-store";

export function usePharmacyStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    syncPharmacyFromSupabase();
    const unsub = subscribePharmacyStore(rerender);
    return () => { unsub(); };
  }, []);

  return {
    prescriptions: getPrescriptions(),
    nurseRequests: getNurseRequests(),
    restockRequests: getRestockRequests(),
    bills: getPharmacyBills(),
    metrics: getPharmacyMetrics(),
  };
}
