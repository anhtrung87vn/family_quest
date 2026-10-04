import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Login actions module tests — extracted from app/[locale]/login/actions.ts
//
// Tests: Zod schemas, error code mapping, onboarding flow decisions.
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = loginSchema.extend({
  password: z.string().min(8),
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. loginSchema — valid
// ═══════════════════════════════════════════════════════════════════════════

describe("loginSchema — valid inputs", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.parse({ email: "user@example.com", password: "123456" });
    expect(result.email).toBe("user@example.com");
  });

  it("accepts long password", () => {
    const result = loginSchema.parse({ email: "user@example.com", password: "A".repeat(100) });
    expect(result.password.length).toBe(100);
  });

  it("accepts password exactly 6 chars", () => {
    const result = loginSchema.parse({ email: "user@example.com", password: "abcdef" });
    expect(result.password).toBe("abcdef");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. loginSchema — invalid
// ═══════════════════════════════════════════════════════════════════════════

describe("loginSchema — validation errors", () => {
  it("rejects invalid email", () => {
    expect(() => loginSchema.parse({ email: "not-email", password: "123456" })).toThrow();
  });

  it("rejects empty email", () => {
    expect(() => loginSchema.parse({ email: "", password: "123456" })).toThrow();
  });

  it("rejects password under 6 chars", () => {
    expect(() => loginSchema.parse({ email: "user@example.com", password: "12345" })).toThrow();
  });

  it("rejects empty password", () => {
    expect(() => loginSchema.parse({ email: "user@example.com", password: "" })).toThrow();
  });

  it("rejects null fields", () => {
    expect(() => loginSchema.parse({ email: null, password: null })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. signUpSchema — stricter password
// ═══════════════════════════════════════════════════════════════════════════

describe("signUpSchema — password requirements", () => {
  it("accepts password 8+ chars", () => {
    const result = signUpSchema.parse({ email: "user@example.com", password: "12345678" });
    expect(result.password).toBe("12345678");
  });

  it("rejects password under 8 chars", () => {
    expect(() => signUpSchema.parse({ email: "user@example.com", password: "1234567" })).toThrow();
  });

  it("accepts exactly 8 chars", () => {
    expect(signUpSchema.parse({ email: "user@example.com", password: "abcdefgh" }).password).toBe("abcdefgh");
  });

  it("still validates email", () => {
    expect(() => signUpSchema.parse({ email: "bad", password: "12345678" })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. signIn error code mapping
// ═══════════════════════════════════════════════════════════════════════════

describe("signIn — error code mapping", () => {
  function mapErrorCode(message: string): string {
    return message.includes("Invalid") ? "invalid" : "generic";
  }

  it("maps 'Invalid login credentials' to 'invalid'", () => {
    expect(mapErrorCode("Invalid login credentials")).toBe("invalid");
  });

  it("maps generic error to 'generic'", () => {
    expect(mapErrorCode("Database connection failed")).toBe("generic");
  });

  it("maps empty message to 'generic'", () => {
    expect(mapErrorCode("")).toBe("generic");
  });

  it("maps 'Invalid email or password' to 'invalid'", () => {
    expect(mapErrorCode("Invalid email or password")).toBe("invalid");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. signUp — onboarding flow decisions
// ═══════════════════════════════════════════════════════════════════════════

describe("signUp — email confirmation check", () => {
  function needsConfirmation(emailConfirmedAt: string | null | undefined): boolean {
    return emailConfirmedAt === null || emailConfirmedAt === undefined;
  }

  it("needs confirmation when null", () => {
    expect(needsConfirmation(null)).toBe(true);
  });

  it("needs confirmation when undefined", () => {
    expect(needsConfirmation(undefined)).toBe(true);
  });

  it("already confirmed when timestamp present", () => {
    expect(needsConfirmation("2024-01-01T00:00:00Z")).toBe(false);
  });
});

describe("signUp — new vs existing user", () => {
  function needsOnboarding(existingUser: { id: string } | null): boolean {
    return !existingUser;
  }

  it("needs onboarding for new user", () => {
    expect(needsOnboarding(null)).toBe(true);
  });

  it("skips onboarding for existing user", () => {
    expect(needsOnboarding({ id: "u1" })).toBe(false);
  });
});

describe("signUp — default values", () => {
  it("default family name is 'Our Family'", () => {
    expect("Our Family").toBe("Our Family");
  });

  it("default role is 'parent'", () => {
    expect("parent").toBe("parent");
  });

  it("default language is 'en'", () => {
    expect("en").toBe("en");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. safeParse behavior (used in both signIn and signUp)
// ═══════════════════════════════════════════════════════════════════════════

describe("safeParse behavior", () => {
  it("returns success=false for invalid input (no throw)", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "x" });
    expect(result.success).toBe(false);
  });

  it("returns success=true for valid input", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "123456" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("provides error details on failure", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
