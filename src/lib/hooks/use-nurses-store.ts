"use client";

import { useEffect, useReducer } from "react";
import {
  subscribeNursesStore,
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
    const unsub = subscribeNursesStore(rerender);
    return () => { unsub(); };
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
