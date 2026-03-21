"use client";

import { useEffect, useReducer, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribeNhisStore,
  syncNhisFromSupabase,
  getNhisSchemes,
  getNhisTariffs,
  getNhisEnrollments,
  getNhisClaims,
} from "@/lib/data/nhis-store";

export function useNhisStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => setHydrated(true), 0);
    syncNhisFromSupabase();
    const unsub = subscribeNhisStore(rerender);
    const poll = setInterval(() => syncNhisFromSupabase(true), 30_000);

    const supabase = createClient();
    const channel = supabase
      ?.channel("nhis-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hmo_schemes" }, () => syncNhisFromSupabase(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "hmo_tariffs" }, () => syncNhisFromSupabase(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_hmo_enrollments" }, () => syncNhisFromSupabase(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "hmo_claims" }, () => syncNhisFromSupabase(true))
      .subscribe();

    return () => {
      window.clearTimeout(hydrationId);
      unsub();
      clearInterval(poll);
      if (channel) supabase?.removeChannel(channel);
    };
  }, []);

  if (!hydrated) {
    return {
      hydrated: false,
      schemes: [],
      tariffs: [],
      enrollments: [],
      claims: [],
    };
  }

  return {
    hydrated: true,
    schemes: getNhisSchemes(),
    tariffs: getNhisTariffs(),
    enrollments: getNhisEnrollments(),
    claims: getNhisClaims(),
  };
}
