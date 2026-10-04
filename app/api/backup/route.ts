"use server";

import "@/lib/dev-tls-patch";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveContext } from "@/lib/dev-family";
import { familyDateISO } from "@/lib/family-time";

async function getFamilyId(): Promise<string> {
  const { familyId } = await resolveContext();
  return familyId;
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
    ] = await Promise.all([
      admin.from("tasks").select("*").eq("family_id", familyId),
      admin.from("rewards").select("*").eq("family_id", familyId),
      admin.from("children").select("*").eq("family_id", familyId),
    ]);

    // These depend on the ids above, so they run as a second parallel wave
    // rather than an await nested inside the first Promise.all.
    const taskIds = (tasks ?? []).map((t) => t.id);
    const childIds = (children ?? []).map((c) => c.id);
    const [{ data: assignments }, { data: coins }, { data: stars }] = await Promise.all([
      taskIds.length
        ? admin.from("task_assignments").select("*").in("task_id", taskIds)
        : Promise.resolve({ data: [] as unknown[] }),
      // The ledger tables are coin_transactions/star_transactions and are keyed by
      // child_id — there is no `coin_ledger` table and no family_id column, so the
      // previous query silently exported an empty ledger.
      childIds.length
        ? admin.from("coin_transactions").select("*").in("child_id", childIds)
        : Promise.resolve({ data: [] as unknown[] }),
      childIds.length
        ? admin.from("star_transactions").select("*").in("child_id", childIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    const backup = {
      version: 2,
      exported_at: new Date().toISOString(),
      family_id: familyId,
      tasks: tasks ?? [],
      rewards: rewards ?? [],
      children: children ?? [],
      task_assignments: assignments ?? [],
      coin_transactions: coins ?? [],
      star_transactions: stars ?? [],
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `bloomquest-backup-${familyDateISO()}.json`;

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
    // v1 and v2 differ only in the ledger keys, which restore does not read.
    if (!body || (body.version !== 1 && body.version !== 2)) {
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
