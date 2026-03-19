"use client";

import { useEffect, useReducer, useState } from "react";
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
    return () => { window.clearTimeout(hydrationId); unsub(); clearInterval(poll); };
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
