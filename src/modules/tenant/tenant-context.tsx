"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_BRANDING,
  setClientTenantBranding,
} from "@/lib/tenant/branding-store";
import type { TenantBranding } from "@/lib/tenant/branding";

type TenantContextValue = {
  branding: TenantBranding;
  setBranding: (branding: TenantBranding) => void;
};

const TenantContext = createContext<TenantContextValue>({
  branding: DEFAULT_BRANDING,
  setBranding: () => {},
});

export function TenantProvider({
  branding: initialBranding,
  children,
}: {
  branding: TenantBranding;
  children: ReactNode;
}) {
  const [branding, setBranding] = useState(initialBranding);

  useEffect(() => {
    setBranding(initialBranding);
  }, [initialBranding]);

  useEffect(() => {
    setClientTenantBranding(branding);
  }, [branding]);

  const value = useMemo(
    () => ({ branding, setBranding }),
    [branding],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenantBranding(): TenantBranding {
  return useContext(TenantContext).branding;
}

export function useSetTenantBranding(): (branding: TenantBranding) => void {
  return useContext(TenantContext).setBranding;
}
