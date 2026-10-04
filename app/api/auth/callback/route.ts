import "@/lib/dev-tls-patch";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Magic-link callback. Exchanges the code, then ensures a users+families row exists for the parent.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    console.error("[auth/callback] no code in URL");
    return NextResponse.redirect(`${origin}/en/login?error=1`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(`${origin}/en/login?error=1`);
  }

  // First-login onboarding: create family + users row if missing.
  const admin = createAdminClient();

  // Check if user already has a family_id (normal returning user).
  const { data: existingFull } = await admin
    .from("users")
    .select("id, family_id")
    .eq("id", data.user.id)
    .maybeSingle();

  const needsFamily = !existingFull || !existingFull.family_id;

  if (needsFamily) {
    const { data: family, error: fErr } = await admin
      .from("families")
      .insert({ name: "Our Family" })
      .select("id")
      .single();
    if (fErr || !family) {
      console.error("[auth/callback] family insert failed:", fErr);
      return NextResponse.redirect(`${origin}/en/login?error=1`);
    }

    if (!existingFull) {
      // First login — insert fresh users row
      const { error: userErr } = await admin.from("users").insert({
        id: data.user.id,
        family_id: family.id,
        email: data.user.email!,
        role: "parent",
      });
      if (userErr) console.error("[auth/callback] user insert error:", userErr);

      const { error: prefErr } = await admin.from("user_preferences").insert({
        user_id: data.user.id,
        language: "en",
      });
      if (prefErr) console.error("[auth/callback] preferences insert error:", prefErr);
    } else {
      // Orphaned users row (family_id NULL) — patch it
      const { error: patchErr } = await admin
        .from("users")
        .update({ family_id: family.id })
        .eq("id", data.user.id);
      if (patchErr) console.error("[auth/callback] patch error:", patchErr);
    }
  }

  return NextResponse.redirect(`${origin}/en/dashboard`);
}
