// Legacy mock-cookie names — kept for backward compatibility during Supabase migration
export const sessionCookieName = "hms-session";
export const sessionDepartmentCookieName = "hms-department";
export const sessionStaffNameCookieName = "hms-staff-name";

// Production session cookie — carries serialised HMSSession JSON (set after real Supabase auth)
export const hmsSessionV2CookieName = "hms-session-v2";

// Cookie options shared across all session cookies
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // 8 hours — matches typical hospital shift length
  maxAge: 60 * 60 * 8,
} satisfies Record<string, unknown>;
