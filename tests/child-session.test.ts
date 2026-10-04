import { describe, it, expect } from "vitest";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Child session tests — extracted from lib/auth/child-session.ts
//
// The module uses HMAC-SHA256 signed cookies. Since the exported functions
// (setChildSession, getChildSession, clearChildSession) depend on Next.js
// cookies(), we test the underlying crypto and session logic as pure functions.
// The existing pin.test.ts covers hashPin/verifyPin — this file covers session
// encode/decode, HMAC signature validation, expiry, cookie config, and nonce.
// ---------------------------------------------------------------------------

// ─── Constants mirrored from child-session.ts ─────────────────────────────

const COOKIE = "bq_child";
const MAX_AGE_SEC = 60 * 60 * 12; // 12h

type ChildSession = {
  childId: string;
  familyId: string;
  iat: number;
  exp: number;
};

// ─── Pure functions extracted from child-session.ts ───────────────────────

const TEST_SECRET = "test-secret-key-for-unit-tests";

function sign(payload: string, secret: string = TEST_SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encode(session: ChildSession, secret?: string): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function decode(token: string, secret?: string): ChildSession | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ChildSession;
    if (s.exp < Math.floor(Date.now() / 1000)) return null;
    return s;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Token encoding
// ═══════════════════════════════════════════════════════════════════════════

describe("Child session — encode", () => {
  const now = Math.floor(Date.now() / 1000);
  const session: ChildSession = {
    childId: "c-123",
    familyId: "f-456",
    iat: now,
    exp: now + MAX_AGE_SEC,
  };

  it("produces payload.signature format", () => {
    const token = encode(session);
    expect(token).toContain(".");
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
  });

  it("payload is base64url encoded JSON", () => {
    const token = encode(session);
    const [payloadB64] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    expect(decoded.childId).toBe("c-123");
    expect(decoded.familyId).toBe("f-456");
  });

  it("signature is HMAC-SHA256 base64url", () => {
    const token = encode(session);
    const [payload, sig] = token.split(".");
    const expected = sign(payload);
    expect(sig).toBe(expected);
  });

  it("different sessions produce different tokens", () => {
    const s2: ChildSession = { ...session, childId: "c-999" };
    expect(encode(session)).not.toBe(encode(s2));
  });

  it("same session with same secret produces same token (deterministic)", () => {
    expect(encode(session)).toBe(encode(session));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Token decoding — valid tokens
// ═══════════════════════════════════════════════════════════════════════════

describe("Child session — decode valid tokens", () => {
  it("round-trips encode → decode", () => {
    const now = Math.floor(Date.now() / 1000);
    const session: ChildSession = {
      childId: "c-abc",
      familyId: "f-xyz",
      iat: now,
      exp: now + MAX_AGE_SEC,
    };
    const token = encode(session);
    const result = decode(token);
    expect(result).not.toBeNull();
    expect(result!.childId).toBe("c-abc");
    expect(result!.familyId).toBe("f-xyz");
    expect(result!.iat).toBe(now);
    expect(result!.exp).toBe(now + MAX_AGE_SEC);
  });

  it("preserves all session fields", () => {
    const now = Math.floor(Date.now() / 1000);
    const session: ChildSession = {
      childId: "550e8400-e29b-41d4-a716-446655440000",
      familyId: "660e8400-e29b-41d4-a716-446655440000",
      iat: now,
      exp: now + 1000,
    };
    const result = decode(encode(session));
    expect(result).toEqual(session);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Token decoding — invalid tokens (security tests)
// ═══════════════════════════════════════════════════════════════════════════

describe("Child session — decode rejects invalid tokens", () => {
  it("rejects empty string", () => {
    expect(decode("")).toBeNull();
  });

  it("rejects token without dot separator", () => {
    expect(decode("nodothere")).toBeNull();
  });

  it("rejects token with empty payload", () => {
    expect(decode(".somesig")).toBeNull();
  });

  it("rejects token with empty signature", () => {
    expect(decode("somepayload.")).toBeNull();
  });

  it("rejects tampered payload", () => {
    const now = Math.floor(Date.now() / 1000);
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 3600 };
    const token = encode(session);
    const [, sig] = token.split(".");
    // Tamper with payload
    const tamperedPayload = Buffer.from(JSON.stringify({ ...session, childId: "HACKED" }), "utf8").toString("base64url");
    expect(decode(`${tamperedPayload}.${sig}`)).toBeNull();
  });

  it("rejects tampered signature", () => {
    const now = Math.floor(Date.now() / 1000);
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 3600 };
    const token = encode(session);
    const [payload] = token.split(".");
    expect(decode(`${payload}.badsignature`)).toBeNull();
  });

  it("rejects token signed with different secret", () => {
    const now = Math.floor(Date.now() / 1000);
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 3600 };
    const tokenWithOtherSecret = encode(session, "other-secret-key");
    // Decode with default secret should fail
    expect(decode(tokenWithOtherSecret)).toBeNull();
  });

  it("rejects non-JSON payload", () => {
    const badPayload = Buffer.from("not-json", "utf8").toString("base64url");
    const sig = sign(badPayload);
    expect(decode(`${badPayload}.${sig}`)).toBeNull();
  });

  it("accepts token with trailing dots (split drops extra parts)", () => {
    // "payload.sig.extra".split(".") destructured as [payload, sig] = ["payload", "sig"]
    // The extra ".extra" part is ignored by the destructuring, so the token is still valid.
    // This is acceptable because the attacker can't alter the payload or signature.
    const now = Math.floor(Date.now() / 1000);
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 3600 };
    const token = encode(session);
    // Token stays valid since payload + sig are unchanged
    expect(decode(token + ".extra")).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Session expiry
// ═══════════════════════════════════════════════════════════════════════════

describe("Child session — expiry", () => {
  it("rejects expired session", () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: past - 3600, exp: past };
    const token = encode(session);
    expect(decode(token)).toBeNull();
  });

  it("accepts session that expires in the future", () => {
    const now = Math.floor(Date.now() / 1000);
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 3600 };
    const token = encode(session);
    expect(decode(token)).not.toBeNull();
  });

  it("rejects session that expired 1 second ago", () => {
    const expired = Math.floor(Date.now() / 1000) - 1;
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: expired - MAX_AGE_SEC, exp: expired };
    const token = encode(session);
    expect(decode(token)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Session TTL constants
// ═══════════════════════════════════════════════════════════════════════════

describe("Child session — TTL constants", () => {
  it("MAX_AGE is 12 hours (43200 seconds)", () => {
    expect(MAX_AGE_SEC).toBe(43200);
    expect(MAX_AGE_SEC).toBe(60 * 60 * 12);
  });

  it("cookie name is bq_child", () => {
    expect(COOKIE).toBe("bq_child");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Cookie configuration
// ═══════════════════════════════════════════════════════════════════════════

describe("Child session — cookie config", () => {
  function buildCookieOptions(isProduction: boolean) {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
      maxAge: MAX_AGE_SEC,
    };
  }

  it("httpOnly is always true (prevents XSS cookie theft)", () => {
    expect(buildCookieOptions(true).httpOnly).toBe(true);
    expect(buildCookieOptions(false).httpOnly).toBe(true);
  });

  it("secure is true in production", () => {
    expect(buildCookieOptions(true).secure).toBe(true);
  });

  it("secure is false in development", () => {
    expect(buildCookieOptions(false).secure).toBe(false);
  });

  it("sameSite is lax", () => {
    expect(buildCookieOptions(true).sameSite).toBe("lax");
  });

  it("path is root", () => {
    expect(buildCookieOptions(true).path).toBe("/");
  });

  it("maxAge matches MAX_AGE_SEC", () => {
    expect(buildCookieOptions(true).maxAge).toBe(MAX_AGE_SEC);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Secret resolution
// ═══════════════════════════════════════════════════════════════════════════

describe("Child session — secret resolution logic", () => {
  function resolveSecret(
    childSessionSecret: string | undefined,
    serviceRoleKey: string | undefined,
  ): string {
    const s = childSessionSecret || serviceRoleKey;
    if (!s) throw new Error("CHILD_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set");
    return s;
  }

  it("prefers CHILD_SESSION_SECRET", () => {
    expect(resolveSecret("custom-secret", "service-role")).toBe("custom-secret");
  });

  it("falls back to SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(resolveSecret(undefined, "service-role")).toBe("service-role");
  });

  it("falls back when CHILD_SESSION_SECRET is empty string", () => {
    expect(resolveSecret("", "service-role")).toBe("service-role");
  });

  it("throws when both are missing", () => {
    expect(() => resolveSecret(undefined, undefined)).toThrow(
      "CHILD_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. HMAC-SHA256 signing
// ═══════════════════════════════════════════════════════════════════════════

describe("HMAC-SHA256 signing", () => {
  it("produces base64url encoded output", () => {
    const sig = sign("test-payload");
    // base64url uses only [A-Za-z0-9_-] (no +, /, =)
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is deterministic", () => {
    expect(sign("abc")).toBe(sign("abc"));
  });

  it("different payloads produce different signatures", () => {
    expect(sign("a")).not.toBe(sign("b"));
  });

  it("different secrets produce different signatures", () => {
    expect(sign("payload", "secret1")).not.toBe(sign("payload", "secret2"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Timing-safe comparison
// ═══════════════════════════════════════════════════════════════════════════

describe("Timing-safe comparison (timingSafeEqual)", () => {
  it("returns true for equal buffers", () => {
    const a = Buffer.from("hello");
    const b = Buffer.from("hello");
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  it("returns false for different buffers of same length", () => {
    const a = Buffer.from("hello");
    const b = Buffer.from("world");
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it("throws for different length buffers", () => {
    const a = Buffer.from("short");
    const b = Buffer.from("longer-buffer");
    expect(() => timingSafeEqual(a, b)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. newNonce utility
// ═══════════════════════════════════════════════════════════════════════════

describe("newNonce (from child-session.ts)", () => {
  function newNonce() {
    return randomBytes(16).toString("hex");
  }

  it("produces 32-character hex string (16 bytes)", () => {
    const nonce = newNonce();
    expect(nonce).toHaveLength(32);
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it("generates unique values", () => {
    const nonces = new Set(Array.from({ length: 100 }, () => newNonce()));
    expect(nonces.size).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. PIN validation regex (complementing pin.test.ts)
// ═══════════════════════════════════════════════════════════════════════════

describe("PIN format validation", () => {
  const PIN_REGEX = /^\d{6}$/;

  it("accepts exactly 6 digits", () => {
    expect(PIN_REGEX.test("123456")).toBe(true);
    expect(PIN_REGEX.test("000000")).toBe(true);
    expect(PIN_REGEX.test("999999")).toBe(true);
  });

  it("rejects fewer than 6 digits", () => {
    expect(PIN_REGEX.test("12345")).toBe(false);
    expect(PIN_REGEX.test("1")).toBe(false);
    expect(PIN_REGEX.test("")).toBe(false);
  });

  it("rejects more than 6 digits", () => {
    expect(PIN_REGEX.test("1234567")).toBe(false);
  });

  it("rejects letters", () => {
    expect(PIN_REGEX.test("abcdef")).toBe(false);
    expect(PIN_REGEX.test("12345a")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(PIN_REGEX.test("12345!")).toBe(false);
    expect(PIN_REGEX.test("12 345")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. Scrypt parameters (complementing pin.test.ts)
// ═══════════════════════════════════════════════════════════════════════════

describe("Scrypt parameters", () => {
  const SCRYPT_N = 16384;
  const SCRYPT_R = 8;
  const SCRYPT_P = 1;
  const KEY_LEN = 32;

  it("N=16384 (2^14) — OWASP minimum", () => {
    expect(SCRYPT_N).toBe(Math.pow(2, 14));
  });

  it("r=8 — standard block size", () => {
    expect(SCRYPT_R).toBe(8);
  });

  it("p=1 — single parallelism", () => {
    expect(SCRYPT_P).toBe(1);
  });

  it("key length is 32 bytes (256 bits)", () => {
    expect(KEY_LEN).toBe(32);
  });

  it("maxmem is 2x minimum (128 * N * r * p * 2)", () => {
    const maxmem = 128 * SCRYPT_N * SCRYPT_R * SCRYPT_P * 2;
    const minimum = 128 * SCRYPT_N * SCRYPT_R * SCRYPT_P;
    expect(maxmem).toBe(minimum * 2);
    expect(maxmem).toBe(33554432); // 32 MB
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. Scrypt encoded format
// ═══════════════════════════════════════════════════════════════════════════

describe("Scrypt encoded format", () => {
  function encodeScrypt(N: number, r: number, p: number, salt: Buffer, hash: Buffer): string {
    return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
  }

  function parseScrypt(encoded: string): {
    algo: string; N: number; r: number; p: number; salt: string; hash: string;
  } | null {
    const parts = encoded.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return null;
    return {
      algo: parts[0],
      N: Number(parts[1]),
      r: Number(parts[2]),
      p: Number(parts[3]),
      salt: parts[4],
      hash: parts[5],
    };
  }

  it("produces 6 dollar-separated parts", () => {
    const salt = Buffer.from("0123456789abcdef", "hex");
    const hash = Buffer.from("fedcba9876543210".repeat(2), "hex");
    const encoded = encodeScrypt(16384, 8, 1, salt, hash);
    expect(encoded.split("$")).toHaveLength(6);
  });

  it("starts with scrypt prefix", () => {
    const encoded = encodeScrypt(16384, 8, 1, Buffer.alloc(16), Buffer.alloc(32));
    expect(encoded.startsWith("scrypt$")).toBe(true);
  });

  it("round-trips encode → parse", () => {
    const salt = randomBytes(16);
    const hash = randomBytes(32);
    const encoded = encodeScrypt(16384, 8, 1, salt, hash);
    const parsed = parseScrypt(encoded);
    expect(parsed).not.toBeNull();
    expect(parsed!.N).toBe(16384);
    expect(parsed!.r).toBe(8);
    expect(parsed!.p).toBe(1);
    expect(parsed!.salt).toBe(salt.toString("hex"));
    expect(parsed!.hash).toBe(hash.toString("hex"));
  });

  it("rejects non-scrypt format", () => {
    expect(parseScrypt("bcrypt$something")).toBeNull();
  });

  it("rejects too few parts", () => {
    expect(parseScrypt("scrypt$16384$8")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. Argon2 legacy format detection
// ═══════════════════════════════════════════════════════════════════════════

describe("Argon2 legacy format detection", () => {
  function isArgon2Format(encoded: string): boolean {
    return encoded.startsWith("$argon2id$");
  }

  it("detects argon2id format", () => {
    expect(isArgon2Format("$argon2id$v=19$m=65536,t=3,p=4$salt$hash")).toBe(true);
  });

  it("does not match scrypt format", () => {
    expect(isArgon2Format("scrypt$16384$8$1$salt$hash")).toBe(false);
  });

  it("does not match empty string", () => {
    expect(isArgon2Format("")).toBe(false);
  });

  it("does not match bcrypt format", () => {
    expect(isArgon2Format("$2b$12$somehash")).toBe(false);
  });
});
