import "@/lib/dev-tls-patch";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Magic-link callback. Exchanges the code, then ensures a users+families row exists for the parent.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  console.log("[auth/callback] hit — origin:", origin, "code present:", !!code);

  if (!code) {
    console.error("[auth/callback] no code in URL — redirecting to error");
    return NextResponse.redirect(`${origin}/en/login?error=1`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", {
      message: error?.message,
      status: error?.status,
      user: data?.user?.id ?? null,
    });
    return NextResponse.redirect(`${origin}/en/login?error=1`);
  }
  console.log("[auth/callback] session exchanged — user:", data.user.id, data.user.email);

  // First-login onboarding: create family + users row if missing.
  const admin = createAdminClient();
  const { data: existing, error: lookupErr } = await admin
    .from("users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  console.log("[auth/callback] existing user lookup:", { existing, lookupErr });

  if (!existing) {
    console.log("[auth/callback] first login — creating family + user rows");
    const { data: family, error: fErr } = await admin
      .from("families")
      .insert({ name: "Our Family" })
      .select("id")
      .single();
    if (fErr || !family) {
      console.error("[auth/callback] family insert failed:", fErr);
      return NextResponse.redirect(`${origin}/en/login?error=1`);
    }
    console.log("[auth/callback] family created:", family.id);

    const { error: userErr } = await admin.from("users").insert({
      id: data.user.id,
      family_id: family.id,
      email: data.user.email!,
      role: "parent",
    });
    console.log("[auth/callback] user insert error:", userErr);

    const { error: prefErr } = await admin.from("user_preferences").insert({
      user_id: data.user.id,
      language: "en",
    });
    console.log("[auth/callback] preferences insert error:", prefErr);
  } else {
    console.log("[auth/callback] returning user — skipping onboarding");
  }

  console.log("[auth/callback] redirecting to dashboard");
  return NextResponse.redirect(`${origin}/en/dashboard`);
}
