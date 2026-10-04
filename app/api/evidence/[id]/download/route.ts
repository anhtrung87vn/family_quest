import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveContext } from "@/lib/dev-family";
import { familyDateISO } from "@/lib/family-time";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: evidenceId } = await params;

  // Authenticate parent — always resolves real session first
  let familyId: string;
  try {
    ({ familyId } = await resolveContext());
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch evidence with task/child info for filename
  const { data: ev, error: evErr } = await admin
    .from("task_evidence")
    .select("id, evidence_type, storage_path, mime_type, family_id, task_completion_id, child:children(name), task_completion:task_completions(assignment:task_assignments(task:tasks(name)))")
    .eq("id", evidenceId)
    .single();

  if (evErr || !ev) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Validate family ownership
  if (ev.family_id !== familyId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Must be active or promoted
  if (!ev.storage_path) return NextResponse.json({ error: "no media" }, { status: 404 });

  // Determine which bucket to download from
  // If promoted, check family-memories first via task_evidence.memory_id
  // For simplicity, try family-evidence first (active), then family-memories (promoted)
  let fileData: Blob | null = null;
  let bucket = "family-evidence";

  const { data: blob1, error: err1 } = await admin.storage.from("family-evidence").download(ev.storage_path);
  if (!err1 && blob1) {
    fileData = blob1;
  } else {
    // Try family-memories bucket (promoted evidence)
    const { data: blob2, error: err2 } = await admin.storage.from("family-memories").download(ev.storage_path);
    if (!err2 && blob2) {
      fileData = blob2;
      bucket = "family-memories";
    }
  }

  if (!fileData) return NextResponse.json({ error: "file not found in storage" }, { status: 404 });

  // Build human-readable filename
  const child: any = Array.isArray(ev.child) ? ev.child[0] : ev.child;
  const tc: any = Array.isArray(ev.task_completion) ? ev.task_completion[0] : ev.task_completion;
  const assignment: any = tc ? (Array.isArray(tc.assignment) ? tc.assignment[0] : tc.assignment) : null;
  const task: any = assignment ? (Array.isArray(assignment.task) ? assignment.task[0] : assignment.task) : null;

  const childName = sanitizeFilename(child?.name ?? "Child");
  const taskName = sanitizeFilename(task?.name ?? "Quest");
  const dateStr = familyDateISO();
  const ext = ev.storage_path.split(".").pop() || (ev.evidence_type === "photo" ? "webp" : "webm");
  const filename = `${childName}-${taskName}-${dateStr}.${ext}`;

  const arrayBuffer = await fileData.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": ev.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}
