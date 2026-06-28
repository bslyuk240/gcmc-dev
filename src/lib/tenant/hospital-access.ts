import { createAdminClient } from "@/lib/supabase/admin";
import type { HMSSession } from "@/lib/auth/session-types";

export type HospitalAccessRow = {
  status: string;
  sessions_revoked_at: string | null;
};

export async function fetchHospitalAccess(
  hospitalId: string,
): Promise<HospitalAccessRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("hospitals")
    .select("status, sessions_revoked_at")
    .eq("id", hospitalId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    status: String(data.status),
    sessions_revoked_at: data.sessions_revoked_at
      ? String(data.sessions_revoked_at)
      : null,
  };
}

export function isSessionWithinHospitalAccess(
  session: HMSSession,
  hospital: HospitalAccessRow,
): boolean {
  if (hospital.status !== "active") return false;
  if (!hospital.sessions_revoked_at) return true;
  return new Date(session.issued_at) > new Date(hospital.sessions_revoked_at);
}

export async function isTenantSessionAllowed(session: HMSSession): Promise<boolean> {
  const hospital = await fetchHospitalAccess(session.hospital_id);
  if (!hospital) return false;

  if (session.platform_entry) {
    // Platform operators can bypass the sessions_revoked_at check (their session
    // was intentionally created after any prior revocation), but suspended hospitals
    // must still be blocked — even platform operators cannot access a suspended tenant.
    return hospital.status === "active";
  }

  return isSessionWithinHospitalAccess(session, hospital);
}

export async function revokeHospitalSessions(hospitalId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { error } = await admin
    .from("hospitals")
    .update({ sessions_revoked_at: new Date().toISOString() })
    .eq("id", hospitalId);

  return !error;
}
