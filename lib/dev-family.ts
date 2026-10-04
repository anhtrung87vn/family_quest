/**
 * DEV ONLY: returns a hardcoded family/user ID so server actions work without auth.
 * Set DEV_FAMILY_ID and DEV_USER_ID in .env.local.
 * In production this module is never used.
 */
export const DEV_BYPASS =
  process.env.NODE_ENV === "development" &&
  process.env.VERCEL_ENV !== "production" &&
  !!process.env.DEV_FAMILY_ID;

export const DEV_FAMILY_ID = process.env.DEV_FAMILY_ID ?? "";
export const DEV_USER_ID = process.env.DEV_USER_ID ?? "";

/**
 * Resolve the effective family_id and userId for a server context.
 *
 * Priority:
 *  1. Real authenticated session — always wins, even in DEV_BYPASS mode.
 *     This prevents newly-created real accounts from being forced onto the
 *     hardcoded dev seed UUID, which would cause FK violations.
 *  2. DEV_BYPASS fallback — used only when there is no real session and
 *     DEV_BYPASS is enabled (unauthenticated dev-only testing).
 *  3. Throw "Unauthorized" — production / no session / DEV_BYPASS off.
 *
 * Usage in Server Components and Server Actions:
 *   const { familyId, userId, supabase } = await resolveContext();
 */
export async function resolveContext(): Promise<{
  familyId: string;
  userId: string;
  supabase: import("@supabase/supabase-js").SupabaseClient;
}> {
  const { createClient } = await import("@/lib/supabase/server");
  const { createAdminClient } = await import("@/lib/supabase/admin");

  // getUser() validates the access token against the Auth server. getSession()
  // must NOT be used here: it decodes the cookie without verifying the JWT
  // signature, so a forged cookie would let a caller pick an arbitrary user id
  // and — because we then query with the service-role client — read any family.
  //
  // If Supabase is unreachable we now fail closed (throw) rather than silently
  // degrading to DEV_BYPASS, which would mean an auth outage downgrades into
  // "everyone is the dev seed family".
  const sessionClient = await createClient();
  const { data: userData, error: userErr } = await sessionClient.auth.getUser();
  const noSession = userErr?.status === 401 || userErr?.status === 400;
  if (userErr && !noSession && !DEV_BYPASS) {
    // Transport/infra failure (not "no session") — don't guess, don't downgrade.
    // Only DEV_BYPASS (development-only) is allowed to tolerate this, which is
    // the local TLS-proxy case that previously justified using getSession().
    throw new Error(`Auth verification unavailable: ${userErr.message}`);
  }
  const userId = userData?.user?.id ?? null;

  if (userId) {
    // Use the admin client only for the users-table lookup (the user can't
    // read the `users` table via the anon-key client until we know their
    // family_id, because the RLS policy is `id = auth.uid()` — which works
    // for the user's own row, but we need family_id to set up the context).
    const admin = createAdminClient();
    const { data: me } = await admin
      .from("users")
      .select("family_id")
      .eq("id", userId)
      .maybeSingle();

    if (me?.family_id) {
      // Return the cookie-backed, user-scoped client so that every subsequent
      // query runs through RLS.  The 18 RLS policies in 0002_rls.sql are now
      // an active safety net rather than dead code.  Call sites that genuinely
      // need to bypass RLS (ledger inserts, storage, cron) should call
      // createAdminClient() explicitly.
      return { familyId: me.family_id as string, userId, supabase: sessionClient };
    }

    // Orphaned users row (family_id NULL) or missing row entirely.
    // Self-heal: create a family and link the user so they don't see a 500.
    // This path must use admin because the user has no family_id yet, so RLS
    // would block every write.
    console.warn("[resolveContext] user", userId, "has no family — auto-healing");
    const email = userData?.user?.email ?? `${userId}@unknown`;

    const { data: newFamily, error: fErr } = await admin
      .from("families")
      .insert({ name: "Our Family" })
      .select("id")
      .single();
    if (fErr || !newFamily) throw new Error("No family");

    if (!me) {
      await admin.from("users").insert({ id: userId, family_id: newFamily.id, email, role: "parent" });
      await admin.from("user_preferences").insert({ user_id: userId, language: "en" }).maybeSingle();
    } else {
      await admin.from("users").update({ family_id: newFamily.id }).eq("id", userId);
    }
    // After self-heal the user's JWT still lacks the family claim until they
    // re-login, so return admin for this single request.  Next request will
    // hit the happy path above and get the user-scoped client.
    return { familyId: newFamily.id, userId, supabase: admin };
  }

  if (DEV_BYPASS) {
    return { familyId: DEV_FAMILY_ID, userId: DEV_USER_ID, supabase: createAdminClient() };
  }

  throw new Error("Unauthorized");
}
