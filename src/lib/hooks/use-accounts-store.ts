"use client";

import { useEffect, useReducer } from "react";
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

  useEffect(() => {
    syncAccountsFromSupabase();
    const unsub = subscribeAccountsStore(rerender);
    const poll = setInterval(() => syncAccountsFromSupabase(true), 30_000);
    return () => { unsub(); clearInterval(poll); };
  }, []);

  return {
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
