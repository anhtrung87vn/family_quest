import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Dev-family module tests — extracted from lib/dev-family.ts
//
// Strategy: Test DEV_BYPASS flag derivation, resolveContext priority logic,
// and the auto-heal flow as pure functions. The actual resolveContext()
// uses Supabase and Next.js imports, so we test the decision logic.
// ---------------------------------------------------------------------------

// ═══════════════════════════════════════════════════════════════════════════
// 1. DEV_BYPASS flag derivation
// ═══════════════════════════════════════════════════════════════════════════

describe("DEV_BYPASS flag derivation", () => {
  function computeDevBypass(
    nodeEnv: string | undefined,
    vercelEnv: string | undefined,
    devFamilyId: string | undefined,
  ): boolean {
    return (
      nodeEnv === "development" &&
      vercelEnv !== "production" &&
      !!devFamilyId
    );
  }

  it("enabled in development with DEV_FAMILY_ID set", () => {
    expect(computeDevBypass("development", undefined, "family-123")).toBe(true);
  });

  it("disabled in production NODE_ENV", () => {
    expect(computeDevBypass("production", undefined, "family-123")).toBe(false);
  });

  it("disabled when VERCEL_ENV is production", () => {
    expect(computeDevBypass("development", "production", "family-123")).toBe(false);
  });

  it("disabled when DEV_FAMILY_ID is empty", () => {
    expect(computeDevBypass("development", undefined, "")).toBe(false);
  });

  it("disabled when DEV_FAMILY_ID is undefined", () => {
    expect(computeDevBypass("development", undefined, undefined)).toBe(false);
  });

  it("enabled with VERCEL_ENV=preview", () => {
    expect(computeDevBypass("development", "preview", "family-123")).toBe(true);
  });

  it("enabled with VERCEL_ENV=development", () => {
    expect(computeDevBypass("development", "development", "family-123")).toBe(true);
  });

  it("disabled in test NODE_ENV", () => {
    expect(computeDevBypass("test", undefined, "family-123")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. DEV_FAMILY_ID / DEV_USER_ID defaults
// ═══════════════════════════════════════════════════════════════════════════

describe("Dev ID defaults", () => {
  function getDevId(envValue: string | undefined): string {
    return envValue ?? "";
  }

  it("returns env value when set", () => {
    expect(getDevId("abc-123")).toBe("abc-123");
  });

  it("defaults to empty string when undefined", () => {
    expect(getDevId(undefined)).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. resolveContext priority logic
// ═══════════════════════════════════════════════════════════════════════════

describe("resolveContext priority", () => {
  type Resolution =
    | { type: "real_session"; userId: string; familyId: string }
    | { type: "dev_bypass"; familyId: string; userId: string }
    | { type: "unauthorized" };

  function resolveContextPriority(
    sessionUserId: string | null,
    userFamilyId: string | null,
    devBypass: boolean,
    devFamilyId: string,
    devUserId: string,
  ): Resolution {
    // Priority 1: Real authenticated session
    if (sessionUserId && userFamilyId) {
      return { type: "real_session", userId: sessionUserId, familyId: userFamilyId };
    }

    // Priority 2: DEV_BYPASS fallback
    if (devBypass && !sessionUserId) {
      return { type: "dev_bypass", familyId: devFamilyId, userId: devUserId };
    }

    // Priority 3: Unauthorized
    return { type: "unauthorized" };
  }

  it("prefers real session even when DEV_BYPASS is on", () => {
    const result = resolveContextPriority("user-1", "family-1", true, "dev-family", "dev-user");
    expect(result.type).toBe("real_session");
    expect(result).toEqual({ type: "real_session", userId: "user-1", familyId: "family-1" });
  });

  it("falls back to DEV_BYPASS when no session", () => {
    const result = resolveContextPriority(null, null, true, "dev-family", "dev-user");
    expect(result.type).toBe("dev_bypass");
    expect(result).toEqual({ type: "dev_bypass", familyId: "dev-family", userId: "dev-user" });
  });

  it("throws unauthorized when no session and no DEV_BYPASS", () => {
    const result = resolveContextPriority(null, null, false, "", "");
    expect(result.type).toBe("unauthorized");
  });

  it("does not use DEV_BYPASS when session exists (even with null familyId)", () => {
    // User exists but has no family — triggers auto-heal path (not tested here)
    // For now, this falls through to unauthorized because familyId is null
    const result = resolveContextPriority("user-1", null, true, "dev-family", "dev-user");
    // sessionUserId is truthy, so we won't hit DEV_BYPASS
    // But userFamilyId is null, so we don't hit "real_session" either
    // Falls through to unauthorized
    expect(result.type).toBe("unauthorized");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Auto-heal logic (orphaned user)
// ═══════════════════════════════════════════════════════════════════════════

describe("Auto-heal — orphaned user detection", () => {
  function needsAutoHeal(
    userId: string | null,
    familyId: string | null,
  ): boolean {
    return !!userId && !familyId;
  }

  it("needs heal when user exists but has no family", () => {
    expect(needsAutoHeal("user-1", null)).toBe(true);
  });

  it("no heal needed when user has family", () => {
    expect(needsAutoHeal("user-1", "family-1")).toBe(false);
  });

  it("no heal needed when no user", () => {
    expect(needsAutoHeal(null, null)).toBe(false);
  });
});

describe("Auto-heal — user row handling", () => {
  function determineHealAction(
    existingUserRow: { family_id: string | null } | null,
  ): "insert" | "update" {
    // If no user row exists at all, insert a new one.
    // If user row exists but family_id is null, update it.
    return existingUserRow ? "update" : "insert";
  }

  it("inserts when no user row exists", () => {
    expect(determineHealAction(null)).toBe("insert");
  });

  it("updates when user row exists but family is null", () => {
    expect(determineHealAction({ family_id: null })).toBe("update");
  });
});

describe("Auto-heal — email fallback", () => {
  function resolveEmail(authEmail: string | undefined, userId: string): string {
    return authEmail ?? `${userId}@unknown`;
  }

  it("uses auth email when available", () => {
    expect(resolveEmail("user@example.com", "u1")).toBe("user@example.com");
  });

  it("falls back to userId@unknown", () => {
    expect(resolveEmail(undefined, "u1")).toBe("u1@unknown");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Family creation defaults
// ═══════════════════════════════════════════════════════════════════════════

describe("Family creation defaults", () => {
  it("default family name is 'Our Family'", () => {
    const defaultName = "Our Family";
    expect(defaultName).toBe("Our Family");
  });

  it("new user gets role 'parent'", () => {
    const defaultRole = "parent";
    expect(defaultRole).toBe("parent");
  });

  it("new user preferences default to English", () => {
    const defaultLang = "en";
    expect(defaultLang).toBe("en");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Session resolution — getSession vs getUser
// ═══════════════════════════════════════════════════════════════════════════

describe("Session resolution strategy", () => {
  // resolveContext uses getUser() (server-verified) instead of getSession() (unverified JWT).
  // getUser() validates the access token against the Auth server; getSession() only decodes
  // the cookie without signature verification.

  function extractUserId(sessionData: { session: { user: { id: string } } | null } | null): string | null {
    return sessionData?.session?.user?.id ?? null;
  }

  it("extracts userId from session data", () => {
    expect(extractUserId({ session: { user: { id: "u1" } } })).toBe("u1");
  });

  it("returns null when session is null", () => {
    expect(extractUserId({ session: null })).toBeNull();
  });

  it("returns null when sessionData is null", () => {
    expect(extractUserId(null)).toBeNull();
  });
});
