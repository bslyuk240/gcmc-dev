"use client";

import { useEffect, useReducer, useState } from "react";
import {
  subscribeDoctorsStore,
  syncDoctorsFromSupabase,
  getConsultations,
  getDoctors,
  getAdmissionOrders,
  getDoctorsMetrics,
} from "@/lib/data/doctors-store";

export function useDoctorsStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => setHydrated(true), 0);
    syncDoctorsFromSupabase();
    const unsub = subscribeDoctorsStore(rerender);
    const poll = setInterval(() => syncDoctorsFromSupabase(true), 30_000);
    return () => { window.clearTimeout(hydrationId); unsub(); clearInterval(poll); };
  }, []);

  if (!hydrated) {
    return {
      hydrated: false,
      consultations: [],
      doctors: [],
      admissionOrders: [],
      metrics: {
        consultationsToday: 0,
        inProgress: 0,
        awaitingResults: 0,
        completedToday: 0,
        rxWrittenToday: 0,
        labOrderedToday: 0,
        admissionsToday: 0,
        doctorsOnDuty: 0,
        totalDoctors: 0,
        revenueToday: 0,
        pendingFees: 0,
      },
    };
  }

  return {
    hydrated: true,
    consultations: getConsultations(),
    doctors: getDoctors(),
    admissionOrders: getAdmissionOrders(),
    metrics: getDoctorsMetrics(),
  };
}
