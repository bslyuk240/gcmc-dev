"use client";

import { useEffect, useReducer, useState } from "react";
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => setHydrated(true), 0);
    syncNursesFromSupabase();
    const unsub = subscribeNursesStore(rerender);
    // Poll every 30 s so cross-device updates (e.g. front-desk adding a patient)
    // appear automatically without a manual page refresh.
    const poll = setInterval(() => syncNursesFromSupabase(true), 30_000);
    return () => { window.clearTimeout(hydrationId); unsub(); clearInterval(poll); };
  }, []);

  if (!hydrated) {
    return {
      hydrated: false,
      allPatients: [],
      procedures: [],
      sampleRequests: [],
      icuVitals: [],
      metrics: {
        totalActive: 0,
        outpatientCount: 0,
        wardCount: 0,
        emergencyCount: 0,
        icuCount: 0,
        criticalCount: 0,
        watchCount: 0,
        pendingProcedureBills: 0,
        procedureBillValue: 0,
        samplesPending: 0,
      },
      getByUnit: (unit: NursingUnit) => { void unit; return []; },
    };
  }

  return {
    hydrated: true,
    allPatients: getWardPatients(),
    procedures: getNursingProcedures(),
    sampleRequests: getNurseSampleRequests(),
    icuVitals: getICUVitals(),
    metrics: getNursesMetrics(),
    getByUnit: (unit: NursingUnit) => getPatientsByUnit(unit),
  };
}
