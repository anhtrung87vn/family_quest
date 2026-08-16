import { scrypt, randomBytes, timingSafeEqual, ScryptOptions } from "crypto";

// scrypt params: N=16384 (2^14), r=8, p=1 — OWASP minimum for PIN hashing.
// Runs off the main thread via libuv thread pool — no event-loop blocking.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;
// maxmem must be >= 128 * N * r * p bytes; set 2× headroom
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * SCRYPT_P * 2;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

// Encoded format: "scrypt$<N>$<r>$<p>$<salt-hex>$<hash-hex>"
function encode(N: number, r: number, p: number, salt: Buffer, hash: Buffer): string {
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function hashPin(pin: string): Promise<string> {
  if (!/^\d{6}$/.test(pin)) throw new Error("PIN must be exactly 6 digits.");
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  return encode(SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, hash);
}

export async function verifyPin(pin: string, encoded: string): Promise<boolean> {
  if (!/^\d{6}$/.test(pin)) return false;

  // Legacy argon2 format (hash-wasm) — fallback for existing hashes
  if (encoded.startsWith("$argon2id$")) {
    return verifyArgon2Legacy(pin, encoded);
  }

  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const storedHash = Buffer.from(hashHex, "hex");
  const candidate = await scryptAsync(pin, salt, KEY_LEN, {
    N: Number(N), r: Number(r), p: Number(p),
    maxmem: 128 * Number(N) * Number(r) * Number(p) * 2,
  });
  if (candidate.length !== storedHash.length) return false;
  return timingSafeEqual(candidate, storedHash);
}

// Fallback for existing PIN hashes created with hash-wasm argon2id
async function verifyArgon2Legacy(pin: string, encoded: string): Promise<boolean> {
  try {
    const { argon2id } = await import("hash-wasm");
    const parts = encoded.split("$");
    if (parts.length < 6) return false;
    const paramSegment = parts[3];
    const saltB64 = parts[4];
    const params = Object.fromEntries(paramSegment.split(",").map((kv) => kv.split("=")));
    const padded = saltB64 + "=".repeat((4 - (saltB64.length % 4)) % 4);
    const bin = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const salt = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) salt[i] = bin.charCodeAt(i);
    const candidate = await argon2id({
      password: pin, salt,
      parallelism: Number(params.p),
      iterations: Number(params.t),
      memorySize: Number(params.m),
      hashLength: 32,
      outputType: "encoded",
    });
    if (candidate.length !== encoded.length) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(encoded);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
