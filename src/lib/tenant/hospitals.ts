import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getRequestTenantSlug } from "@/lib/tenant/login-tenant";
import type { Hospital, HospitalSettings } from "@/lib/tenant/types";

function parseSettings(raw: unknown): HospitalSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as HospitalSettings;
}

function mapHospital(row: Record<string, unknown>): Hospital {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    short_name: row.short_name != null ? String(row.short_name) : null,
    status: row.status as Hospital["status"],
    plan: row.plan as Hospital["plan"],
    settings: parseSettings(row.settings),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getHospitalById(id: string): Promise<Hospital | null> {
  const sb = await createClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("hospitals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapHospital(data as Record<string, unknown>);
}

export async function getHospitalBySlug(slug: string): Promise<Hospital | null> {
  const sb = await createClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("hospitals")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapHospital(data as Record<string, unknown>);
}

/**
 * Phase 1 fallback removed — uses middleware tenant cookie / header.
 * Never accept hospital_id from client input.
 */
export async function getCurrentHospital(): Promise<Hospital | null> {
  const slug = await getRequestTenantSlug();
  return getHospitalBySlug(slug);
}

/** Active hospitals only — for platform admin listing (Phase 5). */
export async function listActiveHospitals(): Promise<Hospital[]> {
  const sb = await createClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("hospitals")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (error || !data) return [];
  return data.map((row) => mapHospital(row as Record<string, unknown>));
}
