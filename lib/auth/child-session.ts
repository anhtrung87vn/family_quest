import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const COOKIE = "bq_child";
const MAX_AGE_SEC = 60 * 60 * 12; // 12h per design §9

type ChildSession = {
  childId: string;
  familyId: string;
  iat: number;
  exp: number;
};

function secret(): string {
  const s = process.env.CHILD_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("CHILD_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(session: ChildSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): ChildSession | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
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

export async function setChildSession(childId: string, familyId: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = encode({ childId, familyId, iat: now, exp: now + MAX_AGE_SEC });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function getChildSession(): Promise<ChildSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return decode(token);
}

export async function clearChildSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// Utility for rotating internal state where needed.
export function newNonce() {
  return randomBytes(16).toString("hex");
}
