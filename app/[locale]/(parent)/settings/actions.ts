"use server";

import "@/lib/dev-tls-patch";
import { cookies } from "next/headers";
import { z } from "zod";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_USER_ID } from "@/lib/dev-family";

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

  // Persist to user_preferences
  if (DEV_BYPASS) {
    const admin = createAdminClient();
    await admin.from("user_preferences").upsert({ user_id: DEV_USER_ID, language }, { onConflict: "user_id" });
  } else {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase
        .from("user_preferences")
        .upsert({ user_id: auth.user.id, language }, { onConflict: "user_id" });
    }
  }

  redirect({ href: "/settings", locale: language });
}

export async function deleteAllTempEvidence(_formData: FormData) {
  const admin = createAdminClient();

  // Resolve family
  let familyId: string | null = null;
  if (DEV_BYPASS) {
    const { DEV_FAMILY_ID } = await import("@/lib/dev-family");
    familyId = DEV_FAMILY_ID;
  } else {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) throw new Error("Unauthorized");
    const { data: u } = await admin.from("users").select("family_id").eq("id", auth.user.id).single();
    familyId = u?.family_id ?? null;
  }
  if (!familyId) throw new Error("No family");

  // Fetch all active media evidence for this family
  const { data: rows } = await admin
    .from("task_evidence")
    .select("id, storage_path")
    .eq("family_id", familyId)
    .eq("status", "active")
    .not("storage_path", "is", null);

  let deleted = 0;
  for (const row of rows ?? []) {
    if (row.storage_path) {
      await admin.storage.from("family-evidence").remove([row.storage_path]);
    }
    await admin
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
