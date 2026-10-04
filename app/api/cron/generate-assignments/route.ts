import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRule, dueOn, todayISO } from "@/lib/recurrence";
import { awardResponsibilityWeek } from "@/lib/responsibility-week";

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

  // Weekly responsibility stars for last week (idempotent, so daily is fine).
  // Non-critical: a failure here must not hide the assignment result.
  let responsibilityWeek: { week: string; awarded: number } | null = null;
  try {
    responsibilityWeek = await awardResponsibilityWeek(now);
  } catch (err) {
    console.error("[generate-assignments] responsibility week stars failed", err);
  }

  // Fetch active recurring tasks
  const { data: tasks, error: tErr } = await admin
    .from("tasks")
    .select("id, family_id, recurrence_rule")
    .eq("active", true)
    .eq("is_recurring", true);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Filter to tasks that are due today based on recurrence rules
  const dueTasks = (tasks ?? []).filter((task) => {
    const rule = parseRule(task.recurrence_rule);
    return rule && dueOn(rule, now);
  });

  if (!dueTasks.length) {
    return NextResponse.json({ ok: true, inserted: 0, skipped: 0, responsibilityWeek });
  }

  const dueTaskIds = dueTasks.map((t) => t.id);

  // Batch: fetch all prior assignments for due tasks to determine which children get each task
  const { data: priorAssignments } = await admin
    .from("task_assignments")
    .select("task_id, child_id")
    .in("task_id", dueTaskIds);

  // Build task → unique child IDs map
  const taskChildMap = new Map<string, Set<string>>();
  for (const a of priorAssignments ?? []) {
    if (!taskChildMap.has(a.task_id)) taskChildMap.set(a.task_id, new Set());
    taskChildMap.get(a.task_id)!.add(a.child_id);
  }

  // Batch: fetch all existing assignments for today for these tasks
  const { data: todayAssignments } = await admin
    .from("task_assignments")
    .select("task_id, child_id")
    .in("task_id", dueTaskIds)
    .eq("due_date", today);

  const existingToday = new Set(
    (todayAssignments ?? []).map((a) => `${a.task_id}:${a.child_id}`),
  );

  // Build batch insert rows
  const rows: { task_id: string; child_id: string; due_date: string; status: "todo" }[] = [];
  let skipped = 0;

  for (const task of dueTasks) {
    const childIds = taskChildMap.get(task.id);
    if (!childIds?.size) continue;

    for (const childId of childIds) {
      if (existingToday.has(`${task.id}:${childId}`)) {
        skipped++;
      } else {
        rows.push({ task_id: task.id, child_id: childId, due_date: today, status: "todo" });
      }
    }
  }

  // Single batch insert
  let inserted = 0;
  if (rows.length) {
    const { error: insertErr } = await admin.from("task_assignments").insert(rows);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    inserted = rows.length;
  }

  return NextResponse.json({ ok: true, inserted, skipped, responsibilityWeek });
}

// Allow GET for manual trigger (still needs secret).
export async function GET(req: Request) {
  return POST(req);
}
