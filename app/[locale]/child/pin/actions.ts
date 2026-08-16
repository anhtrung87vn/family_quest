"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "@/lib/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPin } from "@/lib/auth/pin";
import { setChildSession } from "@/lib/auth/child-session";

const MAX_ATTEMPTS = 5;
const WINDOW_MIN = 15;

const schema = z.object({
  child_id: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/),
  locale: z.string().default("en"),
});

export async function verifyChildPin(formData: FormData) {
  const parsed = schema.safeParse({
    child_id: formData.get("child_id"),
    pin: formData.get("pin"),
    locale: formData.get("locale") ?? "en",
  });
  if (!parsed.success) {
    redirect({
      href: {
        pathname: "/child/pin",
        query: { child: String(formData.get("child_id") ?? ""), error: "format" },
      },
      locale: String(formData.get("locale") ?? "en"),
    });
    return;
  }
  const { child_id, pin, locale } = parsed.data;

  const admin = createAdminClient();
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

  // Rate limit check
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count: failCount } = await admin
    .from("child_pin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("child_id", child_id)
    .eq("success", false)
    .gte("attempted_at", since);

  if ((failCount ?? 0) >= MAX_ATTEMPTS) {
    redirect({ href: { pathname: "/child/pin", query: { child: child_id, error: "locked" } }, locale });
    return;
  }

  const { data: child } = await admin
    .from("children")
    .select("id, family_id, pin_hash")
    .eq("id", child_id)
    .single();

  if (!child) {
    redirect({ href: { pathname: "/child/pin", query: { child: child_id, error: "notfound" } }, locale });
    return;
  }

  const ok = await verifyPin(pin, child.pin_hash);
  await admin.from("child_pin_attempts").insert({ child_id, ip, success: ok });

  if (!ok) {
    redirect({ href: { pathname: "/child/pin", query: { child: child_id, error: "invalid" } }, locale });
    return;
  }

  await setChildSession(child.id, child.family_id);
  redirect({ href: "/child/home", locale });
}
