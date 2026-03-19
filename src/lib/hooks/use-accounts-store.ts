"use client";

import { useEffect, useReducer, useState } from "react";
import {
  subscribeAccountsStore,
  syncAccountsFromSupabase,
  getFrontDeskCharges,
  getConsultationFees,
  getSupplierPayments,
  getPayrollBatches,
  getKioskSales,
  getAccountsMetrics,
  getLabCharges,
  getNursingCharges,
} from "@/lib/data/accounts-store";

export function useAccountsStore() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => setHydrated(true), 0);
    syncAccountsFromSupabase();
    const unsub = subscribeAccountsStore(rerender);
    const poll = setInterval(() => syncAccountsFromSupabase(true), 30_000);
    return () => { window.clearTimeout(hydrationId); unsub(); clearInterval(poll); };
  }, []);

  if (!hydrated) {
    return {
      hydrated: false,
      frontDeskCharges: [],
      consultationFees: [],
      supplierPayments: [],
      payrollBatches: [],
      kioskSales: [],
      labCharges: [],
      nursingCharges: [],
      metrics: {
        frontDeskPendingCount: 0,
        frontDeskPendingValue: 0,
        frontDeskPaidToday: 0,
        consultationPendingCount: 0,
        consultationPendingValue: 0,
        supplierPendingCount: 0,
        supplierPendingValue: 0,
        supplierPaidMTD: 0,
        payrollPendingCount: 0,
        payrollPendingValue: 0,
        payrollPaidMTD: 0,
        kioskRevenueToday: 0,
        kioskRevenueMTD: 0,
        labPendingCount: 0,
        labPendingValue: 0,
        labPaidToday: 0,
        nursingPendingCount: 0,
        nursingPendingValue: 0,
        nursingPaidToday: 0,
        revenueToday: 0,
      },
    };
  }

  return {
    hydrated: true,
    frontDeskCharges: getFrontDeskCharges(),
    consultationFees: getConsultationFees(),
    supplierPayments: getSupplierPayments(),
    payrollBatches: getPayrollBatches(),
    kioskSales: getKioskSales(),
    labCharges: getLabCharges(),
    nursingCharges: getNursingCharges(),
    metrics: getAccountsMetrics(),
  };
}
