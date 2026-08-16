"use server";

import "@/lib/dev-tls-patch";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/login", locale: "en" });
}
