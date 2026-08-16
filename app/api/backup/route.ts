"use server";

import "@/lib/dev-tls-patch";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS, DEV_FAMILY_ID, DEV_USER_ID } from "@/lib/dev-family";

async function getFamilyId(): Promise<string> {
  if (DEV_BYPASS) return DEV_FAMILY_ID;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { data: me } = await supabase
    .from("users")
    .select("family_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.family_id) throw new Error("No family");
  return me.family_id as string;
}

// GET /api/backup — export family data as JSON
export async function GET() {
  try {
    const familyId = await getFamilyId();
    const admin = createAdminClient();

    const [
      { data: tasks },
      { data: rewards },
      { data: children },
      { data: assignments },
      { data: ledger },
    ] = await Promise.all([
      admin.from("tasks").select("*").eq("family_id", familyId),
      admin.from("rewards").select("*").eq("family_id", familyId),
      admin.from("children").select("*").eq("family_id", familyId),
      admin.from("task_assignments").select("*").in(
        "task_id",
        (await admin.from("tasks").select("id").eq("family_id", familyId)).data?.map((t) => t.id) ?? []
      ),
      admin.from("coin_ledger").select("*").eq("family_id", familyId),
    ]);

    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      family_id: familyId,
      tasks: tasks ?? [],
      rewards: rewards ?? [],
      children: children ?? [],
      task_assignments: assignments ?? [],
      coin_ledger: ledger ?? [],
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `bloomquest-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

// POST /api/backup — restore tasks and rewards from uploaded JSON
export async function POST(req: NextRequest) {
  try {
    const familyId = await getFamilyId();
    const admin = createAdminClient();

    const body = await req.json();
    if (!body || body.version !== 1) {
      return NextResponse.json({ error: "Invalid backup file (version mismatch)" }, { status: 400 });
    }

    const results: Record<string, number> = {};

    // Restore tasks — skip existing names, only insert missing ones
    if (Array.isArray(body.tasks) && body.tasks.length > 0) {
      const { data: existing } = await admin.from("tasks").select("name").eq("family_id", familyId);
      const existingNames = new Set((existing ?? []).map((t: { name: string }) => t.name));

      const toInsert = body.tasks
        .filter((t: { name: string }) => !existingNames.has(t.name))
        .map((t: Record<string, unknown>) => ({
          ...t,
          id: undefined,        // let DB generate new id
          family_id: familyId,  // force correct family
          is_system_template: false,
          created_at: undefined,
          updated_at: undefined,
        }));

      if (toInsert.length > 0) {
        const { error } = await admin.from("tasks").insert(toInsert);
        if (error) throw new Error(`Tasks restore failed: ${error.message}`);
      }
      results.tasks = toInsert.length;
    }

    // Restore rewards — skip existing names
    if (Array.isArray(body.rewards) && body.rewards.length > 0) {
      const { data: existing } = await admin.from("rewards").select("name").eq("family_id", familyId);
      const existingNames = new Set((existing ?? []).map((r: { name: string }) => r.name));

      const toInsert = body.rewards
        .filter((r: { name: string }) => !existingNames.has(r.name))
        .map((r: Record<string, unknown>) => ({
          ...r,
          id: undefined,
          family_id: familyId,
          is_system_template: false,
          created_at: undefined,
          updated_at: undefined,
        }));

      if (toInsert.length > 0) {
        const { error } = await admin.from("rewards").insert(toInsert);
        if (error) throw new Error(`Rewards restore failed: ${error.message}`);
      }
      results.rewards = toInsert.length;
    }

    return NextResponse.json({ success: true, restored: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
