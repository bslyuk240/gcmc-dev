"use client";

import { useEffect, useReducer } from "react";
import {
  subscribeNursesStore,
  syncNursesFromSupabase,
  getWardPatients,
  getNursingProcedures,
  getNurseSampleRequests,
  getICUVitals,
  getNursesMetrics,
  getPatientsByUnit,
  type NursingUnit,
} from "@/lib/data/nurses-store";

export function useNursesStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    syncNursesFromSupabase();
    const unsub = subscribeNursesStore(rerender);
    // Poll every 30 s so cross-device updates (e.g. front-desk adding a patient)
    // appear automatically without a manual page refresh.
    const poll = setInterval(() => syncNursesFromSupabase(true), 30_000);
    return () => { unsub(); clearInterval(poll); };
  }, []);

  return {
    allPatients: getWardPatients(),
    procedures: getNursingProcedures(),
    sampleRequests: getNurseSampleRequests(),
    icuVitals: getICUVitals(),
    metrics: getNursesMetrics(),
    getByUnit: (unit: NursingUnit) => getPatientsByUnit(unit),
  };
}
