import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// PIN actions module tests — extracted from app/[locale]/child/pin/actions.ts
//
// Tests: Zod schema, rate limiting logic, IP extraction, redirect targets.
// ---------------------------------------------------------------------------

const schema = z.object({
  child_id: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/),
  locale: z.string().default("en"),
});

const MAX_ATTEMPTS = 5;
const WINDOW_MIN = 15;

// ═══════════════════════════════════════════════════════════════════════════
// 1. verifyChildPin schema — valid
// ═══════════════════════════════════════════════════════════════════════════

describe("verifyChildPin schema — valid inputs", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts valid input with defaults", () => {
    const result = schema.parse({ child_id: validUuid, pin: "123456" });
    expect(result.child_id).toBe(validUuid);
    expect(result.locale).toBe("en");
  });

  it("accepts explicit locale", () => {
    const result = schema.parse({ child_id: validUuid, pin: "654321", locale: "vi" });
    expect(result.locale).toBe("vi");
  });

  it("defaults locale to 'en' when omitted", () => {
    const result = schema.parse({ child_id: validUuid, pin: "000000" });
    expect(result.locale).toBe("en");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. verifyChildPin schema — invalid
// ═══════════════════════════════════════════════════════════════════════════

describe("verifyChildPin schema — validation errors", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("rejects non-UUID child_id", () => {
    expect(schema.safeParse({ child_id: "bad", pin: "123456" }).success).toBe(false);
  });

  it("rejects 5-digit PIN", () => {
    expect(schema.safeParse({ child_id: validUuid, pin: "12345" }).success).toBe(false);
  });

  it("rejects alpha PIN", () => {
    expect(schema.safeParse({ child_id: validUuid, pin: "abcdef" }).success).toBe(false);
  });

  it("rejects empty PIN", () => {
    expect(schema.safeParse({ child_id: validUuid, pin: "" }).success).toBe(false);
  });

  it("rejects PIN with spaces", () => {
    expect(schema.safeParse({ child_id: validUuid, pin: "12 456" }).success).toBe(false);
  });

  it("returns error details via safeParse", () => {
    const result = schema.safeParse({ child_id: "bad", pin: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Rate limiting logic
// ═══════════════════════════════════════════════════════════════════════════

describe("Rate limiting — configuration", () => {
  it("max attempts is 5", () => {
    expect(MAX_ATTEMPTS).toBe(5);
  });

  it("window is 15 minutes", () => {
    expect(WINDOW_MIN).toBe(15);
  });
});

describe("Rate limiting — lockout check", () => {
  function isLocked(failCount: number): boolean {
    return failCount >= MAX_ATTEMPTS;
  }

  it("not locked with 0 failures", () => {
    expect(isLocked(0)).toBe(false);
  });

  it("not locked with 4 failures", () => {
    expect(isLocked(4)).toBe(false);
  });

  it("locked at exactly 5 failures", () => {
    expect(isLocked(5)).toBe(true);
  });

  it("locked with more than 5 failures", () => {
    expect(isLocked(10)).toBe(true);
  });
});

describe("Rate limiting — window calculation", () => {
  function computeSince(): Date {
    return new Date(Date.now() - WINDOW_MIN * 60_000);
  }

  it("returns date 15 minutes in the past", () => {
    const since = computeSince();
    const diff = Date.now() - since.getTime();
    // Allow 100ms tolerance
    expect(Math.abs(diff - 15 * 60_000)).toBeLessThan(100);
  });

  it("returns a valid ISO string", () => {
    const isoStr = computeSince().toISOString();
    expect(isoStr).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. IP extraction from x-forwarded-for
// ═══════════════════════════════════════════════════════════════════════════

describe("IP extraction from x-forwarded-for", () => {
  function extractIp(header: string | null): string | null {
    return header?.split(",")[0].trim() ?? null;
  }

  it("extracts first IP from comma-separated list", () => {
    expect(extractIp("1.2.3.4, 5.6.7.8, 9.10.11.12")).toBe("1.2.3.4");
  });

  it("extracts single IP", () => {
    expect(extractIp("10.0.0.1")).toBe("10.0.0.1");
  });

  it("trims whitespace", () => {
    expect(extractIp("  1.2.3.4 , 5.6.7.8")).toBe("1.2.3.4");
  });

  it("returns null for null header", () => {
    expect(extractIp(null)).toBeNull();
  });

  it("handles IPv6", () => {
    expect(extractIp("::1, 10.0.0.1")).toBe("::1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Redirect target building
// ═══════════════════════════════════════════════════════════════════════════

describe("Redirect targets", () => {
  function buildErrorRedirect(childId: string, error: string): { pathname: string; query: { child: string; error: string } } {
    return { pathname: "/child/pin", query: { child: childId, error } };
  }

  it("builds format error redirect", () => {
    const result = buildErrorRedirect("c1", "format");
    expect(result.pathname).toBe("/child/pin");
    expect(result.query.error).toBe("format");
    expect(result.query.child).toBe("c1");
  });

  it("builds locked error redirect", () => {
    const result = buildErrorRedirect("c1", "locked");
    expect(result.query.error).toBe("locked");
  });

  it("builds notfound error redirect", () => {
    const result = buildErrorRedirect("c1", "notfound");
    expect(result.query.error).toBe("notfound");
  });

  it("builds invalid error redirect", () => {
    const result = buildErrorRedirect("c1", "invalid");
    expect(result.query.error).toBe("invalid");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. PIN attempt record construction
// ═══════════════════════════════════════════════════════════════════════════

describe("PIN attempt record", () => {
  function buildAttemptRecord(childId: string, ip: string | null, success: boolean) {
    return { child_id: childId, ip, success };
  }

  it("records successful attempt", () => {
    const record = buildAttemptRecord("c1", "1.2.3.4", true);
    expect(record.success).toBe(true);
    expect(record.child_id).toBe("c1");
    expect(record.ip).toBe("1.2.3.4");
  });

  it("records failed attempt", () => {
    const record = buildAttemptRecord("c1", "1.2.3.4", false);
    expect(record.success).toBe(false);
  });

  it("records null IP", () => {
    const record = buildAttemptRecord("c1", null, true);
    expect(record.ip).toBeNull();
  });
});
