"use client";

import { useEffect, useReducer, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePharmacyStore,
  syncPharmacyFromSupabase,
  getPrescriptions,
  getNurseRequests,
  getRestockRequests,
  getPharmacyBills,
  getPharmacyMetrics,
} from "@/lib/data/pharmacy-store";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";

export function usePharmacyStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => setHydrated(true), 0);
    syncPharmacyFromSupabase();
    const unsub = subscribePharmacyStore(rerender);
    const poll = setInterval(() => syncPharmacyFromSupabase(true), 30_000);
    const refresh = () => { void syncPharmacyFromSupabase(true); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);

    // Supabase Realtime — instant sync when pharmacy-related rows change in any session
    const supabase = createClient();
    const channel = supabase
      ?.channel("pharmacy-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prescriptions" }, () => syncPharmacyFromSupabase(true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "prescriptions" }, () => syncPharmacyFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pharmacy_bills" }, () => syncPharmacyFromSupabase(true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "nurse_med_requests" }, () => syncPharmacyFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pharmacy_restock_requests" }, () => syncPharmacyFromSupabase(true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pharmacy_restock_requests" }, () => syncPharmacyFromSupabase(true))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "pharmacy_restock_requests" }, () => syncPharmacyFromSupabase(true))
      .subscribe();

    return () => {
      window.clearTimeout(hydrationId);
      window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
      unsub();
      clearInterval(poll);
      if (channel) supabase?.removeChannel(channel);
    };
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
