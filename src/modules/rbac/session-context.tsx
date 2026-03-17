"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HMSSession } from "@/lib/auth/session";
import { hasPermission, hasAnyPermission } from "@/modules/rbac/permissions";

// ─── Context ──────────────────────────────────────────────────────────────────

type SessionContextValue = {
  session: HMSSession | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isAdmin: boolean;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isAdmin: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SessionProvider({
  session,
  children,
}: {
  session: HMSSession | null;
  children: ReactNode;
}) {
  const value: SessionContextValue = {
    session,
    hasPermission:    (p)  => session ? hasPermission(session.permissions, p) : false,
    hasAnyPermission: (ps) => session ? hasAnyPermission(session.permissions, ps) : false,
    isAdmin:          session?.role === "admin",
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSession() {
  return useContext(SessionContext);
}
