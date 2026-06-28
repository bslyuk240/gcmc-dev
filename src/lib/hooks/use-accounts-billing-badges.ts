"use client";

import { useEffect, useReducer, useState } from "react";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { fetchCashDeskQueue } from "@/lib/billing/client";

/**
 * Pending billing counts keyed by route href — sourced from billing ledger API.
 */
export function useAccountsBillingBadges(department: string): Record<string, number> {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (department !== "accounts") return;

    let alive = true;

    const load = async () => {
      try {
        const queue = await fetchCashDeskQueue();
        if (!alive) return;
        const byDept = new Map<string, number>();
        for (const line of queue.lines) {
          byDept.set(line.department, (byDept.get(line.department) ?? 0) + 1);
        }
        const next: Record<string, number> = {};
        if (queue.totals.openCount > 0) {
          next["/app/accounts/cash-desk"] = queue.totals.openCount;
        }
        const doctors = byDept.get("doctors") ?? 0;
        const lab = byDept.get("lab") ?? 0;
        const nurses = byDept.get("nurses") ?? 0;
        const pharmacy = byDept.get("pharmacy") ?? 0;
        const frontdesk = byDept.get("frontdesk") ?? 0;
        if (doctors) next["/app/accounts/cash-desk?department=doctors"] = doctors;
        if (lab) next["/app/accounts/cash-desk?department=lab"] = lab;
        if (nurses) next["/app/accounts/cash-desk?department=nurses"] = nurses;
        if (pharmacy) next["/app/accounts/cash-desk?department=pharmacy"] = pharmacy;
        if (frontdesk) next["/app/accounts/cash-desk?department=frontdesk"] = frontdesk;
        setBadges(next);
        rerender();
      } catch {
        /* ignore badge load errors */
      }
    };

    void load();
    const refresh = () => { void load(); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    const poll = setInterval(refresh, 30_000);
    return () => {
      alive = false;
      window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
      clearInterval(poll);
    };
  }, [department]);

  return department === "accounts" ? badges : {};
}
