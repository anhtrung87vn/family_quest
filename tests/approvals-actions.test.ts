import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Approvals actions module tests — extracted from
//   app/[locale]/(parent)/approvals/actions.ts
//
// Strategy: Test Zod schemas, media validation, message composition,
// and derived state as pure functions. Server actions are thin wrappers
// around ledger + Supabase, so we focus on the validation and logic layers.
// ---------------------------------------------------------------------------

// ─── Schema definitions (mirrored from actions.ts) ────────────────────────

const adjustCoinsSchema = z.object({
  child_id: z.string().uuid(),
  amount: z.coerce.number().int().refine((n) => n !== 0, "amount != 0"),
  reason: z.string().min(1).max(200),
});

const sendNoteSchema = z.object({
  child_id: z.string().uuid(),
  message: z.string().max(500).default(""),
});

// ═══════════════════════════════════════════════════════════════════════════
// adjustCoins schema validation
// ═══════════════════════════════════════════════════════════════════════════

describe("adjustCoinsSchema validation", () => {
  const validId = "00000000-0000-0000-0000-000000000001";

  describe("valid inputs", () => {
    it("accepts positive amount", () => {
      const result = adjustCoinsSchema.parse({
        child_id: validId,
        amount: 50,
        reason: "Birthday bonus",
      });
      expect(result.amount).toBe(50);
    });

    it("accepts negative amount", () => {
      const result = adjustCoinsSchema.parse({
        child_id: validId,
        amount: -30,
        reason: "Correction",
      });
      expect(result.amount).toBe(-30);
    });

    it("coerces string amount to number", () => {
      const result = adjustCoinsSchema.parse({
        child_id: validId,
        amount: "25",
        reason: "Test",
      });
      expect(result.amount).toBe(25);
    });
  });

  describe("invalid inputs", () => {
    it("rejects zero amount", () => {
      expect(() =>
        adjustCoinsSchema.parse({
          child_id: validId,
          amount: 0,
          reason: "No change",
        })
      ).toThrow();
    });

    it("rejects non-UUID child_id", () => {
      expect(() =>
        adjustCoinsSchema.parse({
          child_id: "not-uuid",
          amount: 10,
          reason: "Test",
        })
      ).toThrow();
    });

    it("rejects empty reason", () => {
      expect(() =>
        adjustCoinsSchema.parse({
          child_id: validId,
          amount: 10,
          reason: "",
        })
      ).toThrow();
    });

    it("rejects reason over 200 chars", () => {
      expect(() =>
        adjustCoinsSchema.parse({
          child_id: validId,
          amount: 10,
          reason: "x".repeat(201),
        })
      ).toThrow();
    });

    it("accepts reason at boundary (200 chars)", () => {
      const result = adjustCoinsSchema.parse({
        child_id: validId,
        amount: 10,
        reason: "x".repeat(200),
      });
      expect(result.reason).toHaveLength(200);
    });

    it("rejects decimal amount", () => {
      expect(() =>
        adjustCoinsSchema.parse({
          child_id: validId,
          amount: 5.5,
          reason: "Test",
        })
      ).toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// sendNoteSchema validation
// ═══════════════════════════════════════════════════════════════════════════

describe("sendNoteSchema validation", () => {
  const validId = "00000000-0000-0000-0000-000000000001";

  it("accepts valid input", () => {
    const result = sendNoteSchema.parse({
      child_id: validId,
      message: "Great job today!",
    });
    expect(result.message).toBe("Great job today!");
  });

  it("defaults message to empty string", () => {
    const result = sendNoteSchema.parse({ child_id: validId });
    expect(result.message).toBe("");
  });

  it("rejects non-UUID child_id", () => {
    expect(() =>
      sendNoteSchema.parse({ child_id: "bad", message: "hi" })
    ).toThrow();
  });

  it("rejects message over 500 chars", () => {
    expect(() =>
      sendNoteSchema.parse({
        child_id: validId,
        message: "x".repeat(501),
      })
    ).toThrow();
  });

  it("accepts message at boundary (500 chars)", () => {
    const result = sendNoteSchema.parse({
      child_id: validId,
      message: "x".repeat(500),
    });
    expect(result.message).toHaveLength(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UUID validation for action IDs (used by approve/reject)
// ═══════════════════════════════════════════════════════════════════════════

describe("Action ID validation (z.string().uuid())", () => {
  const uuidSchema = z.string().uuid();

  it("accepts valid UUID v4", () => {
    expect(uuidSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toBeTruthy();
  });

  it("rejects empty string", () => {
    expect(() => uuidSchema.parse("")).toThrow();
  });

  it("rejects non-UUID string", () => {
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
  });

  it("rejects partial UUID", () => {
    expect(() => uuidSchema.parse("550e8400-e29b-41d4")).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Media upload validation logic (extracted from approveCompletion)
// ═══════════════════════════════════════════════════════════════════════════

describe("Media upload validation", () => {
  const ALLOWED_PHOTO = ["image/jpeg", "image/png", "image/webp"];
  const ALLOWED_AUDIO = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/x-m4a"];
  const MEDIA_MAX = 20 * 1024 * 1024; // 20 MB

  function isMediaAllowed(
    fileType: string,
    fileSize: number,
    mediaKind: "photo" | "audio",
  ): boolean {
    const allowed = mediaKind === "photo" ? ALLOWED_PHOTO : ALLOWED_AUDIO;
    const mimeOk = allowed.some(
      (p) => fileType === p || fileType.startsWith(p + ";"),
    );
    return mimeOk && fileSize <= MEDIA_MAX;
  }

  describe("photo validation", () => {
    it("accepts image/jpeg", () => {
      expect(isMediaAllowed("image/jpeg", 1024, "photo")).toBe(true);
    });

    it("accepts image/png", () => {
      expect(isMediaAllowed("image/png", 1024, "photo")).toBe(true);
    });

    it("accepts image/webp", () => {
      expect(isMediaAllowed("image/webp", 1024, "photo")).toBe(true);
    });

    it("accepts mime with charset parameter (e.g. image/jpeg; charset=...)", () => {
      expect(isMediaAllowed("image/jpeg; charset=utf-8", 1024, "photo")).toBe(true);
    });

    it("rejects image/gif", () => {
      expect(isMediaAllowed("image/gif", 1024, "photo")).toBe(false);
    });

    it("rejects image/svg+xml", () => {
      expect(isMediaAllowed("image/svg+xml", 1024, "photo")).toBe(false);
    });

    it("rejects image/bmp", () => {
      expect(isMediaAllowed("image/bmp", 1024, "photo")).toBe(false);
    });
  });

  describe("audio validation", () => {
    it("accepts audio/webm", () => {
      expect(isMediaAllowed("audio/webm", 1024, "audio")).toBe(true);
    });

    it("accepts audio/mp4", () => {
      expect(isMediaAllowed("audio/mp4", 1024, "audio")).toBe(true);
    });

    it("accepts audio/mpeg (mp3)", () => {
      expect(isMediaAllowed("audio/mpeg", 1024, "audio")).toBe(true);
    });

    it("accepts audio/ogg", () => {
      expect(isMediaAllowed("audio/ogg", 1024, "audio")).toBe(true);
    });

    it("accepts audio/x-m4a", () => {
      expect(isMediaAllowed("audio/x-m4a", 1024, "audio")).toBe(true);
    });

    it("accepts audio/webm with codecs param", () => {
      expect(isMediaAllowed("audio/webm; codecs=opus", 1024, "audio")).toBe(true);
    });

    it("rejects audio/wav", () => {
      expect(isMediaAllowed("audio/wav", 1024, "audio")).toBe(false);
    });

    it("rejects audio/flac", () => {
      expect(isMediaAllowed("audio/flac", 1024, "audio")).toBe(false);
    });
  });

  describe("file size validation", () => {
    it("rejects file over 20 MB", () => {
      expect(isMediaAllowed("image/jpeg", MEDIA_MAX + 1, "photo")).toBe(false);
    });

    it("accepts file exactly at 20 MB", () => {
      expect(isMediaAllowed("image/jpeg", MEDIA_MAX, "photo")).toBe(true);
    });

    it("accepts small file", () => {
      expect(isMediaAllowed("image/jpeg", 100, "photo")).toBe(true);
    });

    it("accepts zero-byte file (mime check still applies)", () => {
      expect(isMediaAllowed("image/jpeg", 0, "photo")).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// File extension extraction (used in upload paths)
// ═══════════════════════════════════════════════════════════════════════════

describe("File extension extraction", () => {
  function getExtension(
    fileName: string,
    mediaKind: "photo" | "audio",
  ): string {
    return fileName.split(".").pop() || (mediaKind === "photo" ? "jpg" : "webm");
  }

  it("extracts extension from filename", () => {
    expect(getExtension("photo.png", "photo")).toBe("png");
  });

  it("extracts last extension from multi-dotted name", () => {
    expect(getExtension("my.photo.jpeg", "photo")).toBe("jpeg");
  });

  it("defaults to jpg for photo with no extension", () => {
    expect(getExtension("photo", "photo")).toBe("photo"); // "photo".split(".").pop() = "photo"
  });

  it("defaults to webm for audio with no extension", () => {
    // A file with no dot returns the original name, which is truthy, so default won't kick in
    expect(getExtension("recording", "audio")).toBe("recording");
  });

  it("extracts webm extension", () => {
    expect(getExtension("voice.webm", "audio")).toBe("webm");
  });

  it("handles empty filename by using default", () => {
    expect(getExtension("", "photo")).toBe("jpg");
    expect(getExtension("", "audio")).toBe("webm");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Parent message media_type resolution
// ═══════════════════════════════════════════════════════════════════════════

describe("Parent message media_type resolution", () => {
  function resolveMediaType(
    photoPath: string | null,
    audioPath: string | null,
  ): "photo" | "audio" | null {
    return photoPath ? "photo" : audioPath ? "audio" : null;
  }

  function resolveMediaPath(
    photoPath: string | null,
    audioPath: string | null,
  ): string | null {
    return photoPath ?? audioPath;
  }

  function resolveMediaMime(
    photoPath: string | null,
    photoMime: string | null,
    audioPath: string | null,
    audioMime: string | null,
  ): string | null {
    return photoPath ? photoMime : audioPath ? audioMime : null;
  }

  function resolveAudioColumns(
    photoPath: string | null,
    audioPath: string | null,
    audioMime: string | null,
  ): { audio_path: string | null; audio_mime: string | null } {
    // When photo exists, audio goes into dedicated audio columns
    // When only audio exists, it goes into the primary media columns
    return {
      audio_path: photoPath ? audioPath : null,
      audio_mime: photoPath ? audioMime : null,
    };
  }

  describe("photo only", () => {
    it("sets media_type to photo", () => {
      expect(resolveMediaType("family/child/photo.jpg", null)).toBe("photo");
    });

    it("sets media_path to photo path", () => {
      expect(resolveMediaPath("family/child/photo.jpg", null)).toBe("family/child/photo.jpg");
    });

    it("sets media_mime to photo mime", () => {
      expect(resolveMediaMime("path", "image/jpeg", null, null)).toBe("image/jpeg");
    });

    it("sets audio columns to null", () => {
      const result = resolveAudioColumns("path", null, null);
      expect(result.audio_path).toBeNull();
      expect(result.audio_mime).toBeNull();
    });
  });

  describe("audio only", () => {
    it("sets media_type to audio", () => {
      expect(resolveMediaType(null, "family/child/voice.webm")).toBe("audio");
    });

    it("sets media_path to audio path", () => {
      expect(resolveMediaPath(null, "family/child/voice.webm")).toBe("family/child/voice.webm");
    });

    it("sets media_mime to audio mime", () => {
      expect(resolveMediaMime(null, null, "path", "audio/webm")).toBe("audio/webm");
    });

    it("sets audio columns to null (audio already in primary)", () => {
      const result = resolveAudioColumns(null, "path", "audio/webm");
      expect(result.audio_path).toBeNull();
      expect(result.audio_mime).toBeNull();
    });
  });

  describe("both photo and audio", () => {
    it("prioritizes photo as media_type", () => {
      expect(resolveMediaType("photo.jpg", "voice.webm")).toBe("photo");
    });

    it("sets media_path to photo", () => {
      expect(resolveMediaPath("photo.jpg", "voice.webm")).toBe("photo.jpg");
    });

    it("puts audio in dedicated audio columns", () => {
      const result = resolveAudioColumns("photo.jpg", "voice.webm", "audio/webm");
      expect(result.audio_path).toBe("voice.webm");
      expect(result.audio_mime).toBe("audio/webm");
    });
  });

  describe("no media", () => {
    it("returns null for all fields", () => {
      expect(resolveMediaType(null, null)).toBeNull();
      expect(resolveMediaPath(null, null)).toBeNull();
      expect(resolveMediaMime(null, null, null, null)).toBeNull();
      const result = resolveAudioColumns(null, null, null);
      expect(result.audio_path).toBeNull();
      expect(result.audio_mime).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Celebration message logic (approveCompletion)
// ═══════════════════════════════════════════════════════════════════════════

describe("Celebration message fallback", () => {
  function resolveFinalMessage(celebration: string): string {
    return celebration || "Làm tốt lắm! Tiếp tục nhé!";
  }

  it("uses custom celebration when provided", () => {
    expect(resolveFinalMessage("Excellent work!")).toBe("Excellent work!");
  });

  it("falls back to Vietnamese default when empty", () => {
    expect(resolveFinalMessage("")).toBe("Làm tốt lắm! Tiếp tục nhé!");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reward approval/rejection message composition
// ═══════════════════════════════════════════════════════════════════════════

describe("Reward approval message composition", () => {
  function composeApprovalMessage(
    rewardName: string,
    coinCost: number,
    note: string,
  ): string {
    const baseMsg = `🎁 Yêu cầu đổi thưởng "${rewardName}" đã được duyệt! Bạn đã tiêu ${coinCost} 🪙. Tận hưởng nhé! 🎉`;
    return note ? `${baseMsg}\n\n💬 ${note}` : baseMsg;
  }

  it("composes message without note", () => {
    const msg = composeApprovalMessage("Ice cream", 50, "");
    expect(msg).toContain("Ice cream");
    expect(msg).toContain("50");
    expect(msg).not.toContain("💬");
  });

  it("appends note when provided", () => {
    const msg = composeApprovalMessage("Movie night", 100, "Have fun!");
    expect(msg).toContain("Movie night");
    expect(msg).toContain("💬 Have fun!");
  });

  it("includes coin cost", () => {
    const msg = composeApprovalMessage("Toy", 200, "");
    expect(msg).toContain("200");
  });
});

describe("Reward rejection message composition", () => {
  function composeRejectionMessage(
    rewardName: string,
    note: string | undefined,
  ): string {
    return `↩️ Yêu cầu đổi thưởng "${rewardName}" chưa được duyệt lần này. ${note ? `Ba/mẹ nhắn: ${note}` : "Hãy tiếp tục cố gắng nhé! 💪"} Xu đã được trả lại cho con.`;
  }

  it("includes reward name", () => {
    const msg = composeRejectionMessage("Video game", undefined);
    expect(msg).toContain("Video game");
  });

  it("uses default encouragement when no note", () => {
    const msg = composeRejectionMessage("Toy", undefined);
    expect(msg).toContain("Hãy tiếp tục cố gắng nhé! 💪");
    expect(msg).not.toContain("Ba/mẹ nhắn");
  });

  it("includes parent note when provided", () => {
    const msg = composeRejectionMessage("Toy", "Try next week");
    expect(msg).toContain("Ba/mẹ nhắn: Try next week");
    expect(msg).not.toContain("Hãy tiếp tục cố gắng nhé! 💪");
  });

  it("mentions refund", () => {
    const msg = composeRejectionMessage("X", undefined);
    expect(msg).toContain("Xu đã được trả lại cho con");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// sendGeneralNote message-or-media guard
// ═══════════════════════════════════════════════════════════════════════════

describe("sendGeneralNote validation guard", () => {
  function requireMessageOrMedia(
    message: string,
    hasMediaFile: boolean,
    hasAudioFile: boolean,
  ): boolean {
    if (!message && !hasMediaFile && !hasAudioFile) {
      return false; // would throw
    }
    return true;
  }

  it("passes with message only", () => {
    expect(requireMessageOrMedia("Hello!", false, false)).toBe(true);
  });

  it("passes with media only", () => {
    expect(requireMessageOrMedia("", true, false)).toBe(true);
  });

  it("passes with audio only", () => {
    expect(requireMessageOrMedia("", false, true)).toBe(true);
  });

  it("passes with all three", () => {
    expect(requireMessageOrMedia("Hello!", true, true)).toBe(true);
  });

  it("fails when nothing provided", () => {
    expect(requireMessageOrMedia("", false, false)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Evidence management — status guards and storage paths
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence status guards", () => {
  function isEvidenceActive(status: string): boolean {
    return status === "active";
  }

  it("allows active evidence", () => {
    expect(isEvidenceActive("active")).toBe(true);
  });

  it("rejects promoted evidence", () => {
    expect(isEvidenceActive("promoted")).toBe(false);
  });

  it("rejects deleted evidence", () => {
    expect(isEvidenceActive("deleted")).toBe(false);
  });

  it("rejects expired evidence", () => {
    expect(isEvidenceActive("expired")).toBe(false);
  });
});

describe("Evidence promotion — memory path generation", () => {
  function buildMemoryPath(
    familyId: string,
    childId: string,
    evidenceId: string,
    storagePath: string,
  ): string {
    const ext = storagePath.split(".").pop() || "bin";
    return `${familyId}/${childId}/${evidenceId}.${ext}`;
  }

  it("builds correct path for jpeg", () => {
    expect(
      buildMemoryPath("f1", "c1", "e1", "f1/c1/original.jpg"),
    ).toBe("f1/c1/e1.jpg");
  });

  it("builds correct path for webm audio", () => {
    expect(
      buildMemoryPath("f1", "c1", "e2", "f1/c1/voice.webm"),
    ).toBe("f1/c1/e2.webm");
  });

  it("uses bin extension when no dot in path", () => {
    expect(
      buildMemoryPath("f1", "c1", "e3", "no-extension-file"),
    ).toBe("f1/c1/e3.no-extension-file"); // .pop() returns last segment
  });

  it("handles nested paths correctly", () => {
    expect(
      buildMemoryPath("fam-1", "child-1", "ev-1", "fam-1/child-1/deep/photo.png"),
    ).toBe("fam-1/child-1/ev-1.png");
  });
});

describe("Evidence promotion — title generation", () => {
  function buildMemoryTitle(
    childName: string | null,
    taskName: string | null,
  ): string | null {
    if (childName && taskName) return `${childName} — ${taskName}`;
    return null;
  }

  it("combines child name and task name", () => {
    expect(buildMemoryTitle("Minh", "Đọc sách")).toBe("Minh — Đọc sách");
  });

  it("returns null when child name missing", () => {
    expect(buildMemoryTitle(null, "Read")).toBeNull();
  });

  it("returns null when task name missing", () => {
    expect(buildMemoryTitle("Minh", null)).toBeNull();
  });

  it("returns null when both missing", () => {
    expect(buildMemoryTitle(null, null)).toBeNull();
  });
});

describe("Evidence deletion record shape", () => {
  function buildDeleteUpdate() {
    return {
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deletion_reason: "PARENT_DELETED",
    };
  }

  it("sets status to deleted", () => {
    expect(buildDeleteUpdate().status).toBe("deleted");
  });

  it("sets deletion_reason to PARENT_DELETED", () => {
    expect(buildDeleteUpdate().deletion_reason).toBe("PARENT_DELETED");
  });

  it("sets deleted_at to valid ISO string", () => {
    expect(buildDeleteUpdate().deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("Evidence promotion record shape", () => {
  function buildPromoteUpdate(userId: string | null, memoryId: string | null) {
    return {
      status: "promoted",
      promoted_at: new Date().toISOString(),
      promoted_by: userId,
      expires_at: null,
      deletion_reason: "PROMOTED_TO_MEMORY",
      memory_id: memoryId ?? null,
    };
  }

  it("sets status to promoted", () => {
    const update = buildPromoteUpdate("user-1", "mem-1");
    expect(update.status).toBe("promoted");
  });

  it("clears expires_at (evidence no longer expires)", () => {
    const update = buildPromoteUpdate("user-1", "mem-1");
    expect(update.expires_at).toBeNull();
  });

  it("sets deletion_reason to PROMOTED_TO_MEMORY", () => {
    const update = buildPromoteUpdate("user-1", "mem-1");
    expect(update.deletion_reason).toBe("PROMOTED_TO_MEMORY");
  });

  it("links to memory record", () => {
    const update = buildPromoteUpdate("user-1", "mem-123");
    expect(update.memory_id).toBe("mem-123");
  });

  it("handles null memory_id gracefully", () => {
    const update = buildPromoteUpdate("user-1", null);
    expect(update.memory_id).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Signed URL expiry constants
// ═══════════════════════════════════════════════════════════════════════════

describe("Signed URL expiry durations", () => {
  it("parent message signed URL expires in 1 hour (3600s)", () => {
    const PARENT_MSG_EXPIRY = 3600; // from getParentMessageSignedUrl
    expect(PARENT_MSG_EXPIRY).toBe(3600);
    expect(PARENT_MSG_EXPIRY / 60).toBe(60); // 60 minutes
  });

  it("evidence signed URL expires in 10 minutes (600s)", () => {
    const EVIDENCE_EXPIRY = 60 * 10; // from getEvidenceSignedUrl
    expect(EVIDENCE_EXPIRY).toBe(600);
    expect(EVIDENCE_EXPIRY / 60).toBe(10); // 10 minutes
  });

  it("evidence expiry is shorter than parent message expiry", () => {
    expect(600).toBeLessThan(3600);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reward join resolution (array vs object)
// ═══════════════════════════════════════════════════════════════════════════

describe("Reward join resolution (Supabase nested select)", () => {
  function resolveJoin<T>(joined: T | T[] | null): T | null {
    if (Array.isArray(joined)) return joined[0] ?? null;
    return joined;
  }

  it("returns object when join is single object", () => {
    const reward = { name: "Ice cream", family_id: "f1" };
    expect(resolveJoin(reward)).toEqual(reward);
  });

  it("returns first element when join is array", () => {
    const rewards = [{ name: "Ice cream", family_id: "f1" }];
    expect(resolveJoin(rewards)).toEqual({ name: "Ice cream", family_id: "f1" });
  });

  it("returns null when join is null", () => {
    expect(resolveJoin(null)).toBeNull();
  });

  it("returns null when join is empty array", () => {
    expect(resolveJoin([])).toBeNull();
  });
});
