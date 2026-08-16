"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = loginSchema.extend({
  password: z.string().min(8),
});

export async function signInWithPassword(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect({ href: "/login?error=invalid", locale: "en" });
  }

  console.log("[signIn] NODE_TLS_REJECT_UNAUTHORIZED:", process.env.NODE_TLS_REJECT_UNAUTHORIZED);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data!);

  if (error) {
    console.error("[signIn] error:", error.message, "status:", error.status);
    const code = error.message.includes("Invalid") ? "invalid" : "generic";
    redirect({ href: `/login?error=${code}`, locale: "en" });
  }

  redirect({ href: "/dashboard", locale: "en" });
}

export async function signUpParent(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    console.error("[signUp] validation failed:", parsed.error.flatten());
    redirect({ href: "/login?tab=signup&error=invalid", locale: "en" });
  }

  console.log("[signUp] attempting signup for:", parsed.data!.email);
  console.log("[signUp] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("[signUp] NODE_TLS_REJECT_UNAUTHORIZED:", process.env.NODE_TLS_REJECT_UNAUTHORIZED);

  // Test raw connectivity before Supabase client
  try {
    const probe = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`);
    console.log("[signUp] connectivity probe status:", probe.status);
  } catch (e) {
    console.error("[signUp] connectivity probe FAILED:", (e as Error).message, (e as NodeJS.ErrnoException).cause);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data!);

  if (error || !data.user) {
    console.error("[signUp] error:", error?.message);
    redirect({ href: "/login?tab=signup&error=generic", locale: "en" });
  }

  const admin = createAdminClient();

  // Auto-confirm email so user can sign in immediately without waiting for confirmation email
  if (data.user!.email_confirmed_at === null || data.user!.email_confirmed_at === undefined) {
    console.log("[signUp] auto-confirming email for:", data.user!.id);
    await admin.auth.admin.updateUserById(data.user!.id, { email_confirm: true });
  }

  // Onboarding: create family + users row
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", data.user!.id)
    .maybeSingle();

  if (!existing) {
    const { data: family, error: fErr } = await admin
      .from("families")
      .insert({ name: "Our Family" })
      .select("id")
      .single();
    if (fErr || !family) {
      console.error("[signUp] family insert failed:", fErr);
      redirect({ href: "/login?tab=signup&error=generic", locale: "en" });
    }
    await admin.from("users").insert({
      id: data.user!.id,
      family_id: family!.id,
      email: data.user!.email!,
      role: "parent",
    });
    await admin.from("user_preferences").insert({
      user_id: data.user!.id,
      language: "en",
    });
  }

  redirect({ href: "/dashboard", locale: "en" });
}
