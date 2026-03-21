"use client";

import { useEffect, useReducer, useState } from "react";
import {
  subscribeAccountsStore,
  getConsultationFees,
  getLabCharges,
  getNursingCharges,
  getFrontDeskCharges,
} from "@/lib/data/accounts-store";
import { subscribePharmacyStore, getPharmacyBills } from "@/lib/data/pharmacy-store";

/**
 * Returns pending billing counts keyed by route href.
 * Only subscribes to stores when department === "accounts" to avoid
 * loading accounts data for other departments.
 */
export function useAccountsBillingBadges(department: string): Record<string, number> {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (department !== "accounts") return;
    setHydrated(true);
    const unsubAccounts = subscribeAccountsStore(rerender);
    const unsubPharmacy = subscribePharmacyStore(rerender);
    return () => {
      unsubAccounts();
      unsubPharmacy();
    };
  }, [department]);

  if (!hydrated || department !== "accounts") return {};

  const consultationPending = getConsultationFees().filter((f) => f.status === "Pending").length;
  const labPending = getLabCharges().filter((c) => c.status === "Pending").length;
  const nursingPending = getNursingCharges().filter((c) => c.status === "Pending" || c.status === "Billed").length;
  const pharmacyPending = getPharmacyBills().filter((b) => b.billStatus === "Pending").length;
  const fdPending = getFrontDeskCharges().filter((c) => c.status === "Billed").length;
  const totalReceivePayment = consultationPending + labPending + nursingPending + pharmacyPending + fdPending;

  const badges: Record<string, number> = {};
  if (totalReceivePayment) badges["/app/accounts/receive-payment"] = totalReceivePayment;
  if (consultationPending) badges["/app/accounts/consultation-fees"] = consultationPending;
  if (labPending) badges["/app/accounts/lab-billing"] = labPending;
  if (nursingPending) badges["/app/accounts/nursing-billing"] = nursingPending;
  if (pharmacyPending) badges["/app/accounts/pharmacy-billing"] = pharmacyPending;

  return badges;
}
