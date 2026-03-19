"use client";

import { useEffect, useReducer, useState } from "react";
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => setHydrated(true), 0);
    syncPharmacyFromSupabase();
    const unsub = subscribePharmacyStore(rerender);
    const poll = setInterval(() => syncPharmacyFromSupabase(true), 30_000);
    return () => { window.clearTimeout(hydrationId); unsub(); clearInterval(poll); };
  }, []);

  if (!hydrated) {
    return {
      hydrated: false,
      prescriptions: [],
      nurseRequests: [],
      restockRequests: [],
      bills: [],
      metrics: {
        dispensedToday: 0,
        pendingPrescriptions: 0,
        urgentPrescriptions: 0,
        pendingBills: 0,
        pendingBillValue: 0,
        revenueCollected: 0,
        pendingRestocks: 0,
        nurseReadyRequests: 0,
      },
    };
  }

  return {
    hydrated: true,
    prescriptions: getPrescriptions(),
    nurseRequests: getNurseRequests(),
    restockRequests: getRestockRequests(),
    bills: getPharmacyBills(),
    metrics: getPharmacyMetrics(),
  };
}
