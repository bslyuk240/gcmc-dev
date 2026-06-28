"use client";

import { useEffect, useReducer, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import {
  subscribeLabStore,
  syncLabFromSupabase,
  getLabTests,
  getTestCatalog,
  getLabMetrics,
} from "@/lib/data/lab-store";

export function useLabStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => setHydrated(true), 0);
    syncLabFromSupabase();
    const unsub = subscribeLabStore(rerender);
    const poll = setInterval(() => syncLabFromSupabase(true), 30_000);
    const refresh = () => { void syncLabFromSupabase(true); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);

    const supabase = createClient();
    const channel = supabase
      ?.channel("lab-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lab_tests" }, () => syncLabFromSupabase(true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lab_tests" }, () => syncLabFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "test_catalog" }, () => syncLabFromSupabase(true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "test_catalog" }, () => syncLabFromSupabase(true))
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
      tests: [],
      catalog: [],
      metrics: {
        pendingTests: 0,
        sampleCollectedTests: 0,
        inProgressTests: 0,
        completedTests: 0,
        urgentTests: 0,
        totalToday: 0,
        pendingBillCount: 0,
        pendingBillValue: 0,
        revenueToday: 0,
        avgTurnaround: "N/A",
      },
    };
  }

  return {
    hydrated: true,
    tests: getLabTests(),
    catalog: getTestCatalog(),
    metrics: getLabMetrics(),
  };
}
