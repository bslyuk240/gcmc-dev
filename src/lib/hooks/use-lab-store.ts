"use client";

import { useEffect, useReducer } from "react";
import {
  subscribeLabStore,
  syncLabFromSupabase,
  getLabTests,
  getTestCatalog,
  getLabMetrics,
} from "@/lib/data/lab-store";

export function useLabStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    syncLabFromSupabase();
    const unsub = subscribeLabStore(rerender);
    return () => { unsub(); };
  }, []);

  return {
    tests: getLabTests(),
    catalog: getTestCatalog(),
    metrics: getLabMetrics(),
  };
}
