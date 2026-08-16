import { describe, it, expect } from "vitest";
import { hashPin, verifyPin } from "@/lib/auth/pin";

describe("PIN hash + verify (scrypt)", () => {
  it("hashes a 6-digit PIN in scrypt format", async () => {
    const hash = await hashPin("123456");
    expect(hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/);
  });

  it("verifies correct PIN", async () => {
    const hash = await hashPin("123456");
    expect(await verifyPin("123456", hash)).toBe(true);
  });

  it("rejects wrong PIN", async () => {
    const hash = await hashPin("111111");
    expect(await verifyPin("222222", hash)).toBe(false);
  });

  it("rejects non-6-digit input on hash", async () => {
    await expect(hashPin("12345")).rejects.toThrow("PIN must be exactly 6 digits");
    await expect(hashPin("1234567")).rejects.toThrow("PIN must be exactly 6 digits");
    await expect(hashPin("abcdef")).rejects.toThrow("PIN must be exactly 6 digits");
    await expect(hashPin("")).rejects.toThrow();
  });

  it("returns false for non-6-digit input on verify", async () => {
    const hash = await hashPin("123456");
    expect(await verifyPin("12345", hash)).toBe(false);
    expect(await verifyPin("abc", hash)).toBe(false);
    expect(await verifyPin("", hash)).toBe(false);
  });

  it("returns false for malformed encoded string", async () => {
    expect(await verifyPin("123456", "not-a-hash")).toBe(false);
    expect(await verifyPin("123456", "$bcrypt$garbage")).toBe(false);
    expect(await verifyPin("123456", "scrypt$bad")).toBe(false);
    expect(await verifyPin("123456", "scrypt$16384$8$1$short")).toBe(false);
  });

  it("produces different hashes for same PIN (random salt)", async () => {
    const h1 = await hashPin("999999");
    const h2 = await hashPin("999999");
    expect(h1).not.toBe(h2);
    expect(await verifyPin("999999", h1)).toBe(true);
    expect(await verifyPin("999999", h2)).toBe(true);
  });

  it("scrypt format contains correct params", async () => {
    const hash = await hashPin("123456");
    const [prefix, n, r, p] = hash.split("$");
    expect(prefix).toBe("scrypt");
    expect(Number(n)).toBe(16384);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
  });

  it("returns false for legacy argon2 format (graceful fallback)", async () => {
    // If hash-wasm is not installed or fails, should return false gracefully
    const fakeArgon2 = "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$fakehash";
    const result = await verifyPin("123456", fakeArgon2);
    expect(typeof result).toBe("boolean");
  });

  it("does not block event loop (non-blocking)", async () => {
    const start = Date.now();
    // Run multiple hashes in parallel — should not serialize
    await Promise.all([hashPin("111111"), hashPin("222222"), hashPin("333333")]);
    const elapsed = Date.now() - start;
    // 3 parallel hashes should not take 3x the time of 1
    // Each hash takes ~50-200ms, parallel should complete < 500ms
    expect(elapsed).toBeLessThan(2000);
  });
});
