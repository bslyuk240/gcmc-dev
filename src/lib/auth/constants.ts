// Legacy mock-cookie names — kept for backward compatibility during Supabase migration
export const sessionCookieName = "hms-session";
export const sessionDepartmentCookieName = "hms-department";
export const sessionStaffNameCookieName = "hms-staff-name";

// Management/Work portal session cookie (/app/* routes)
export const hmsSessionV2CookieName = "hms-session-v2";

// Staff Self-Service portal session cookie (/staff/* routes)
// Kept SEPARATE so logging into the management portal does not automatically
// grant access to the staff portal — each portal requires its own login.
export const hmsStaffPortalSessionCookieName = "hms-staff-session";

// Cookie options shared across all session cookies
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // 8 hours — matches typical hospital shift length
  maxAge: 60 * 60 * 8,
} satisfies Record<string, unknown>;
