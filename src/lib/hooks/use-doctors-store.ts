"use client";

import { useEffect, useReducer } from "react";
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

  useEffect(() => {
    syncDoctorsFromSupabase();
    const unsub = subscribeDoctorsStore(rerender);
    return () => { unsub(); };
  }, []);

  return {
    consultations: getConsultations(),
    doctors: getDoctors(),
    admissionOrders: getAdmissionOrders(),
    metrics: getDoctorsMetrics(),
  };
}
