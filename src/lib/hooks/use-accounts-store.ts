"use client";

import { useEffect, useReducer, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    // Poll every 30s as a fallback
    const poll = setInterval(() => syncAccountsFromSupabase(true), 30_000);

    // Supabase Realtime — instant sync when new charges arrive from any session
    const supabase = createClient();
    const channel = supabase
      ?.channel("accounts-billing-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "front_desk_charges" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "consultation_fees" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lab_charges" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nursing_charges" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pharmacy_bills" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payroll_batches" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payroll_batches" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kiosk_sales" }, () => syncAccountsFromSupabase(true))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "kiosk_sales" }, () => syncAccountsFromSupabase(true))
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
