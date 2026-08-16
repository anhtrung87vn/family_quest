import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRule, dueOn, todayISO } from "@/lib/recurrence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Vercel Cron hits this once a day. Auth via CRON_SECRET header.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayISO();
  const now = new Date();

  // Fetch active recurring tasks
  const { data: tasks, error: tErr } = await admin
    .from("tasks")
    .select("id, family_id, recurrence_rule")
    .eq("active", true)
    .eq("is_recurring", true);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  let inserted = 0;
  let skipped = 0;

  for (const task of tasks ?? []) {
    const rule = parseRule(task.recurrence_rule);
    if (!rule) continue;
    if (!dueOn(rule, now)) continue;

    // Find children who have been previously assigned this task
    // (i.e., the parent explicitly assigned it to them).
    // This respects grade-based task differentiation.
    const { data: assignedChildren } = await admin
      .from("task_assignments")
      .select("child_id")
      .eq("task_id", task.id)
      .limit(100);
    if (!assignedChildren?.length) continue;

    // Deduplicate child IDs
    const childIds = [...new Set(assignedChildren.map((a) => a.child_id))];

    for (const childId of childIds) {
      // Skip if an assignment already exists today for this task+child
      const { data: existing } = await admin
        .from("task_assignments")
        .select("id")
        .eq("task_id", task.id)
        .eq("child_id", childId)
        .eq("due_date", today)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const { error: aErr } = await admin.from("task_assignments").insert({
        task_id: task.id,
        child_id: childId,
        due_date: today,
        status: "todo",
      });
      if (!aErr) inserted++;
    }
  }

  return NextResponse.json({ ok: true, inserted, skipped });
}

// Allow GET for manual trigger (still needs secret).
export async function GET(req: Request) {
  return POST(req);
}
