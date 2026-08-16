import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Vercel Cron hits this once a day. Auth via CRON_SECRET header.
// Expires active media evidence older than 7 days.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let expired = 0;
  let errors = 0;

  // Find active media evidence past expiry
  const { data: rows, error: qErr } = await admin
    .from("task_evidence")
    .select("id, storage_path")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", new Date().toISOString());

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  for (const row of rows ?? []) {
    // Delete file from storage bucket
    if (row.storage_path) {
      const { error: delErr } = await admin.storage
        .from("family-evidence")
        .remove([row.storage_path]);
      if (delErr) {
        console.error(`[cleanup-evidence] storage delete failed for ${row.id}:`, delErr);
        errors++;
        continue;
      }
    }

    // Mark row as expired
    const { error: upErr } = await admin
      .from("task_evidence")
      .update({ status: "expired", deleted_at: new Date().toISOString(), deletion_reason: "AUTO_EXPIRED" })
      .eq("id", row.id);
    if (upErr) {
      console.error(`[cleanup-evidence] status update failed for ${row.id}:`, upErr);
      errors++;
    } else {
      expired++;
    }
  }

  return NextResponse.json({ ok: true, expired, errors });
}

// Allow GET for manual trigger (still needs secret).
export async function GET(req: Request) {
  return POST(req);
}
