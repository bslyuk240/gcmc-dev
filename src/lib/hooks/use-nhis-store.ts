"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NHIS_UPDATED_EVENT,
  fetchHmoClaims,
  fetchHmoEnrollments,
  fetchHmoSchemes,
  fetchHmoTariffs,
  fetchPendingHmoRegistrations,
} from "@/lib/nhis/client";
import type { HmoClaim, HmoEnrollment, HmoRegistration, HmoScheme, HmoTariff } from "@/modules/nhis/types";

export function useNhisStore() {
  const [hydrated, setHydrated] = useState(false);
  const [schemes, setSchemes] = useState<HmoScheme[]>([]);
  const [tariffs, setTariffs] = useState<HmoTariff[]>([]);
  const [enrollments, setEnrollments] = useState<HmoEnrollment[]>([]);
  const [claims, setClaims] = useState<HmoClaim[]>([]);
  const [hmoRegistrations, setHmoRegistrations] = useState<HmoRegistration[]>([]);

  const reload = useCallback(async () => {
    try {
      const [s, t, e, c, r] = await Promise.all([
        fetchHmoSchemes(),
        fetchHmoTariffs(),
        fetchHmoEnrollments(),
        fetchHmoClaims(),
        fetchPendingHmoRegistrations(),
      ]);
      setSchemes(s);
      setTariffs(t);
      setEnrollments(e);
      setClaims(c);
      setHmoRegistrations(r);
    } catch (err) {
      console.error("[useNhisStore]", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onUpdate = () => { void reload(); };
    window.addEventListener(NHIS_UPDATED_EVENT, onUpdate);
    const poll = setInterval(reload, 30_000);
    return () => {
      window.removeEventListener(NHIS_UPDATED_EVENT, onUpdate);
      clearInterval(poll);
    };
  }, [reload]);

  return { hydrated, schemes, tariffs, enrollments, claims, hmoRegistrations, reload };
}

// Re-export types for pages that import from nhis-store
export type {
  HmoScheme,
  HmoTariff,
  HmoEnrollment,
  HmoClaim,
  HmoClaimService,
  HmoRegistration,
} from "@/modules/nhis/types";
