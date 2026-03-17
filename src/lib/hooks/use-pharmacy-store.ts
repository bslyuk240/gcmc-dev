"use client";

import { useEffect, useReducer } from "react";
import {
  subscribePharmacyStore,
  getPrescriptions,
  getNurseRequests,
  getRestockRequests,
  getPharmacyBills,
  getPharmacyMetrics,
} from "@/lib/data/pharmacy-store";

/**
 * Subscribe to the pharmacy cross-department store.
 * Any mutate() call in pharmacy-store.ts will re-render consuming components.
 */
export function usePharmacyStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
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
