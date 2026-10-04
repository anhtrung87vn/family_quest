import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour

/**
 * Stable avatar URL. children.avatar_url points here (with a ?v= cache buster)
 * instead of a signed storage URL, which used to expire after 30 days. Each
 * request signs a fresh short-lived URL for the private bucket and redirects.
 * Visibility matches the child picker page, which lists avatars before anyone
 * signs in; the child id is an unguessable UUID and the route is read-only.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ childId: string }> }) {
  const parsed = z.string().uuid().safeParse((await params).childId);
  if (!parsed.success) return NextResponse.json({ error: "not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: child } = await admin.from("children").select("avatar_path").eq("id", parsed.data).maybeSingle();
  if (!child?.avatar_path) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: signed, error } = await admin.storage
    .from("family-avatars")
    .createSignedUrl(child.avatar_path, SIGNED_URL_TTL_SEC);
  if (error || !signed) return NextResponse.json({ error: "not found" }, { status: 404 });

  const res = NextResponse.redirect(signed.signedUrl, 302);
  // Let the browser reuse the redirect while the signed URL is still valid.
  res.headers.set("Cache-Control", `private, max-age=${SIGNED_URL_TTL_SEC - 300}`);
  return res;
}
