/**
 * DEV ONLY: returns a hardcoded family/user ID so server actions work without auth.
 * Set DEV_FAMILY_ID and DEV_USER_ID in .env.local.
 * In production this module is never used.
 */
export const DEV_BYPASS = process.env.NODE_ENV === "development" && !!process.env.DEV_FAMILY_ID;

export const DEV_FAMILY_ID = process.env.DEV_FAMILY_ID ?? "";
export const DEV_USER_ID = process.env.DEV_USER_ID ?? "";
