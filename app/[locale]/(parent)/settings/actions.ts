"use server";

import "@/lib/dev-tls-patch";
import { cookies } from "next/headers";
import { z } from "zod";
import { redirect } from "@/lib/i18n/routing";
import { resolveContext } from "@/lib/dev-family";

const schema = z.object({ language: z.enum(["en", "vi"]) });

export async function setLanguage(formData: FormData) {
  const { language } = schema.parse({ language: formData.get("language") });

  // Cookie (drives next-intl at request time)
  (await cookies()).set("locale", language, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Persist to user_preferences — always resolve via real session first
  const { userId, supabase } = await resolveContext();
  await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, language }, { onConflict: "user_id" });

  redirect({ href: "/settings", locale: language });
}

export async function deleteAllTempEvidence(_formData: FormData) {
  const { familyId, supabase } = await resolveContext();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Fetch all active media evidence for this family (user-scoped, RLS applies)
  const { data: rows } = await supabase
    .from("task_evidence")
    .select("id, storage_path")
    .eq("family_id", familyId)
    .eq("status", "active")
    .not("storage_path", "is", null);

  let deleted = 0;
  for (const row of rows ?? []) {
    if (row.storage_path) {
      // Storage remove uses admin — Supabase storage through SSR cookies is unreliable
      await admin.storage.from("family-evidence").remove([row.storage_path]);
    }
    await supabase
      .from("task_evidence")
      .update({
        status: "deleted",
        deleted_at: new Date().toISOString(),
        deletion_reason: "PARENT_DELETED",
      })
      .eq("id", row.id);
    deleted++;
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/[locale]/settings", "page");
  return { deleted };
}
