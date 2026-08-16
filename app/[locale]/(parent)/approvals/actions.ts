"use server";

import "@/lib/dev-tls-patch";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  awardTask,
  rejectTask,
  approveRedemption,
  rejectRedemption,
  manualAdjustCoins,
} from "@/lib/ledger";
import { checkAndAwardBadges } from "@/lib/badges";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveCompletion(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const note = (formData.get("note") as string) || undefined;
  const celebration = ((formData.get("celebration") as string) || "").trim();
  const mediaFile = formData.get("media_file") as File | null;
  const mediaType = (formData.get("media_type") as string) || null;
  const audioFile = formData.get("audio_file") as File | null;
  const audioType = (formData.get("audio_type") as string) || null;
  console.log("[approveCompletion] mediaFile:", mediaFile?.name, "size:", mediaFile?.size, "type:", mediaFile?.type, "mediaType:", mediaType);
  console.log("[approveCompletion] audioFile:", audioFile?.name, "size:", audioFile?.size, "type:", audioFile?.type);
  await awardTask(id, note);

  const admin = createAdminClient();

  // Resolve completion → assignment → child + family
  const { data: tc } = await admin
    .from("task_completions")
    .select("assignment_id")
    .eq("id", id)
    .single();

  if (tc) {
    const { data: a } = await admin
      .from("task_assignments")
      .select("child_id")
      .eq("id", tc.assignment_id)
      .single();

    if (a?.child_id) {
      if (celebration) {
        await admin.from("task_completions").update({ celebration_message: celebration }).eq("id", id);
      }

      const { data: childRow } = await admin
        .from("children")
        .select("family_id")
        .eq("id", a.child_id)
        .single();
      const familyId = childRow?.family_id;

      const { DEV_BYPASS, DEV_USER_ID } = await import("@/lib/dev-family");
      let parentUserId: string | null = DEV_BYPASS ? DEV_USER_ID : null;
      if (!DEV_BYPASS) {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { data: auth } = await supabase.auth.getUser();
        parentUserId = auth?.user?.id ?? null;
      }

      const finalMessage = celebration || "Làm tốt lắm! Tiếp tục nhé!";

      if (familyId) {
        const ALLOWED_PHOTO = ["image/jpeg", "image/png", "image/webp"];
        const ALLOWED_AUDIO = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/x-m4a"];
        const MEDIA_MAX = 20 * 1024 * 1024;

        const uploadMedia = async (file: File, type: "photo" | "audio", suffix: string): Promise<{ path: string; mime: string } | null> => {
          const allowed = type === "photo" ? ALLOWED_PHOTO : ALLOWED_AUDIO;
          const mimeOk = allowed.some((p) => file.type === p || file.type.startsWith(p + ";"));
          if (!mimeOk || file.size > MEDIA_MAX) return null;
          const ext = file.name.split(".").pop() || (type === "photo" ? "jpg" : "webm");
          const path = `${familyId}/${a.child_id}/${id}-${suffix}.${ext}`;
          const buf = await file.arrayBuffer();
          const { error } = await admin.storage.from("parent-messages").upload(path, buf, { contentType: file.type, upsert: true });
          if (error) { console.error(`[approveCompletion] upload ${suffix} failed:`, error); return null; }
          return { path, mime: file.type };
        };

        // Upload photo
        let photoPath: string | null = null;
        let photoMime: string | null = null;
        if (mediaFile && mediaFile.size > 0 && mediaType === "photo") {
          const r = await uploadMedia(mediaFile, "photo", "approval-photo");
          if (r) { photoPath = r.path; photoMime = r.mime; }
        }

        // Upload audio
        let audioPath: string | null = null;
        let audioMime: string | null = null;
        if (audioFile && audioFile.size > 0 && audioType === "audio") {
          const r = await uploadMedia(audioFile, "audio", "approval-audio");
          if (r) { audioPath = r.path; audioMime = r.mime; }
        }

        // Insert a single message with both photo and audio (new columns audio_path/audio_mime)
        const { error: msgErr } = await admin.from("parent_messages").insert({
          family_id: familyId,
          child_id: a.child_id,
          parent_user_id: parentUserId,
          message_type: "QUEST_APPROVAL",
          message: finalMessage,
          reference_id: id,
          media_type: photoPath ? "photo" : (audioPath ? "audio" : null),
          media_path: photoPath ?? audioPath,
          media_mime: photoPath ? photoMime : (audioPath ? audioMime : null),
          audio_path: photoPath ? audioPath : null,
          audio_mime: photoPath ? audioMime : null,
        });
        if (msgErr) console.error("[approveCompletion] parent_messages insert failed:", msgErr);
      } else {
        console.error("[approveCompletion] no familyId resolved for child:", a.child_id);
      }

      await checkAndAwardBadges(a.child_id);
    }
  }

  revalidatePath("/[locale]/approvals", "page");
  revalidatePath("/[locale]/dashboard", "page");
  revalidatePath("/[locale]/child/home", "page");
  revalidatePath("/[locale]/child/me", "page");
}

export async function rejectCompletion(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const note = (formData.get("note") as string) || undefined;
  await rejectTask(id, note);
  revalidatePath("/[locale]/approvals", "page");
}

export async function approveRedemptionAction(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  await approveRedemption(id);
  revalidatePath("/[locale]/approvals", "page");
}

export async function rejectRedemptionAction(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const note = (formData.get("note") as string) || undefined;
  await rejectRedemption(id, note);
  revalidatePath("/[locale]/approvals", "page");
}

const ALLOWED_MSG_PHOTO = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_MSG_AUDIO = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/x-m4a"];
const MSG_MEDIA_MAX = 20 * 1024 * 1024; // 20 MB

export async function sendGeneralNote(formData: FormData) {
  const schema = z.object({
    child_id: z.string().uuid(),
    message: z.string().max(500).default(""),
  });
  const parsed = schema.parse({
    child_id: formData.get("child_id"),
    message: (formData.get("message") as string) || "",
  });

  const mediaFile = formData.get("media_file") as File | null;
  const mediaType = (formData.get("media_type") as string) || null;
  const audioFile = formData.get("audio_file") as File | null;
  const audioType = (formData.get("audio_type") as string) || null;

  // Must have message text OR media
  if (!parsed.message && !mediaFile && !audioFile) throw new Error("Message or media required");

  const admin = createAdminClient();

  // Resolve family_id directly from children table (always reliable)
  const { data: childRow } = await admin
    .from("children")
    .select("family_id")
    .eq("id", parsed.child_id)
    .single();
  const familyId = childRow?.family_id;
  if (!familyId) throw new Error("Child not found");

  // Resolve parent user id
  const { DEV_BYPASS, DEV_USER_ID } = await import("@/lib/dev-family");
  let parentUserId: string | null = DEV_BYPASS ? DEV_USER_ID : null;
  if (!DEV_BYPASS) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    parentUserId = auth?.user?.id ?? null;
  }

  const uploadNoteMedia = async (file: File, type: "photo" | "audio"): Promise<{ path: string; mime: string } | null> => {
    const allowed = type === "photo" ? ALLOWED_MSG_PHOTO : ALLOWED_MSG_AUDIO;
    const mimeOk = allowed.some((p) => file.type === p || file.type.startsWith(p + ";"));
    if (!mimeOk || file.size > MSG_MEDIA_MAX) return null;
    const ext = file.name.split(".").pop() || (type === "photo" ? "jpg" : "webm");
    const path = `${familyId}/${parsed.child_id}/${crypto.randomUUID()}.${ext}`;
    const buf = await file.arrayBuffer();
    const { error } = await admin.storage.from("parent-messages").upload(path, buf, { contentType: file.type, upsert: false });
    if (error) { console.error(`[sendGeneralNote] upload ${type} failed:`, error); return null; }
    return { path, mime: file.type };
  };

  // Upload photo
  let photoPath: string | null = null;
  let photoMime: string | null = null;
  if (mediaFile && mediaFile.size > 0 && mediaType === "photo") {
    const r = await uploadNoteMedia(mediaFile, "photo");
    if (r) { photoPath = r.path; photoMime = r.mime; }
  }

  // Upload audio
  let audioPath: string | null = null;
  let audioMime: string | null = null;
  if (audioFile && audioFile.size > 0 && audioType === "audio") {
    const r = await uploadNoteMedia(audioFile, "audio");
    if (r) { audioPath = r.path; audioMime = r.mime; }
  }

  // Insert single message with photo + optional audio in same row
  const { error: msgErr } = await admin.from("parent_messages").insert({
    family_id: familyId,
    child_id: parsed.child_id,
    parent_user_id: parentUserId,
    message_type: "GENERAL",
    message: parsed.message || " ",
    media_type: photoPath ? "photo" : (audioPath ? "audio" : null),
    media_path: photoPath ?? audioPath,
    media_mime: photoPath ? photoMime : (audioPath ? audioMime : null),
    audio_path: photoPath ? audioPath : null,
    audio_mime: photoPath ? audioMime : null,
  });
  if (msgErr) console.error("[sendGeneralNote] parent_messages insert failed:", msgErr);

  revalidatePath("/[locale]/approvals", "page");
  revalidatePath("/[locale]/child/home", "page");
  revalidatePath("/[locale]/child/me", "page");
}

export async function getParentMessageSignedUrl(mediaPath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("parent-messages")
    .createSignedUrl(mediaPath, 3600);
  if (error) { console.error("[getParentMessageSignedUrl]", error); return null; }
  return data?.signedUrl ?? null;
}

export async function adjustCoins(formData: FormData) {
  const schema = z.object({
    child_id: z.string().uuid(),
    amount: z.coerce.number().int().refine((n) => n !== 0, "amount != 0"),
    reason: z.string().min(1).max(200),
  });
  const parsed = schema.parse({
    child_id: formData.get("child_id"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  await manualAdjustCoins(parsed.child_id, parsed.amount, parsed.reason);
  revalidatePath("/[locale]/approvals", "page");
  revalidatePath("/[locale]/dashboard", "page");
}

// ─── Evidence management actions ─────────────────────────

export async function promoteEvidence(formData: FormData) {
  const evidenceId = z.string().uuid().parse(formData.get("evidence_id"));
  const admin = createAdminClient();

  const { DEV_BYPASS, DEV_USER_ID } = await import("@/lib/dev-family");
  let userId: string | null = DEV_BYPASS ? DEV_USER_ID : null;
  if (!DEV_BYPASS) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    userId = auth?.user?.id ?? null;
  }

  // Fetch full evidence row
  const { data: ev, error: evErr } = await admin
    .from("task_evidence")
    .select("id, storage_path, family_id, child_id, evidence_type, mime_type, file_size, task_completion_id")
    .eq("id", evidenceId)
    .eq("status", "active")
    .single();
  if (evErr || !ev) throw new Error("Evidence not found or not active");

  // Only photo/audio have media to copy
  if (ev.storage_path && (ev.evidence_type === "photo" || ev.evidence_type === "audio")) {
    // Download from temporary bucket
    const { data: fileData, error: dlErr } = await admin.storage
      .from("family-evidence")
      .download(ev.storage_path);
    if (dlErr || !fileData) throw new Error("Failed to download evidence for promotion");

    // Build memory storage path
    const ext = ev.storage_path.split(".").pop() || "bin";
    const memoryPath = `${ev.family_id}/${ev.child_id}/${ev.id}.${ext}`;

    // Upload to permanent bucket
    const { error: upErr } = await admin.storage
      .from("family-memories")
      .upload(memoryPath, fileData, { contentType: ev.mime_type ?? undefined, upsert: false });
    if (upErr) throw new Error("Failed to upload to family-memories bucket");

    // Resolve task name for memory title
    let title: string | null = null;
    const { data: tc } = await admin
      .from("task_completions")
      .select("assignment:task_assignments(child:children(name), task:tasks(name))")
      .eq("id", ev.task_completion_id)
      .single();
    if (tc) {
      const assignment: any = Array.isArray(tc.assignment) ? tc.assignment[0] : tc.assignment;
      const childName = Array.isArray(assignment?.child) ? assignment.child[0]?.name : assignment?.child?.name;
      const taskName = Array.isArray(assignment?.task) ? assignment.task[0]?.name : assignment?.task?.name;
      if (childName && taskName) title = `${childName} — ${taskName}`;
    }

    // Create family_memories record
    const { data: memory, error: memErr } = await admin
      .from("family_memories")
      .insert({
        family_id: ev.family_id,
        child_id: ev.child_id,
        source_type: "evidence",
        source_id: ev.id,
        title,
        media_type: ev.evidence_type,
        media_storage_path: memoryPath,
        mime_type: ev.mime_type,
        file_size_bytes: ev.file_size,
        created_by: userId,
      })
      .select("id")
      .single();
    if (memErr) throw memErr;

    // Update evidence record
    await admin
      .from("task_evidence")
      .update({
        status: "promoted",
        promoted_at: new Date().toISOString(),
        promoted_by: userId,
        expires_at: null,
        deletion_reason: "PROMOTED_TO_MEMORY",
        memory_id: memory?.id ?? null,
      })
      .eq("id", evidenceId);

    // Delete temporary storage copy (evidence is now in family-memories)
    await admin.storage.from("family-evidence").remove([ev.storage_path]);
  } else {
    // Text/choice — just update status, no media to move
    await admin
      .from("task_evidence")
      .update({
        status: "promoted",
        promoted_at: new Date().toISOString(),
        promoted_by: userId,
        expires_at: null,
        deletion_reason: "PROMOTED_TO_MEMORY",
      })
      .eq("id", evidenceId);
  }

  revalidatePath("/[locale]/approvals", "page");
}

export async function deleteEvidence(formData: FormData) {
  const evidenceId = z.string().uuid().parse(formData.get("evidence_id"));
  const admin = createAdminClient();

  // Get storage path before marking as deleted
  const { data: ev } = await admin
    .from("task_evidence")
    .select("storage_path, status")
    .eq("id", evidenceId)
    .single();

  if (ev?.status !== "active") throw new Error("Evidence is not active");

  // Delete file from storage if it exists
  if (ev?.storage_path) {
    const { error: delErr } = await admin.storage
      .from("family-evidence")
      .remove([ev.storage_path]);
    if (delErr) console.error("[deleteEvidence] storage delete failed:", delErr);
  }

  const { error } = await admin
    .from("task_evidence")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deletion_reason: "PARENT_DELETED",
    })
    .eq("id", evidenceId);
  if (error) throw error;
  revalidatePath("/[locale]/approvals", "page");
}

export async function getEvidenceSignedUrl(storagePath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("family-evidence")
    .createSignedUrl(storagePath, 60 * 10); // 10 min expiry
  if (error) {
    console.error("[getEvidenceSignedUrl] error:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}
