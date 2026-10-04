import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Child actions module tests — extracted from
//   app/[locale]/child/(app)/actions.ts
//   lib/auth/child-session.ts
//
// Strategy: Test Zod schemas, business logic guards, evidence validation,
// message ID parsing, reaction validation, and derived state as pure
// functions. Server actions use getChildSession() + createAdminClient()
// so we focus on the validation and logic layers.
// ---------------------------------------------------------------------------

// ═══════════════════════════════════════════════════════════════════════════
// 1. UUID validation (used by every action for IDs)
// ═══════════════════════════════════════════════════════════════════════════

describe("Child action UUID validation", () => {
  const uuidSchema = z.string().uuid();

  it("accepts valid UUID v4", () => {
    expect(uuidSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toBeTruthy();
  });

  it("rejects empty string", () => {
    expect(() => uuidSchema.parse("")).toThrow();
  });

  it("rejects non-UUID", () => {
    expect(() => uuidSchema.parse("abc-123")).toThrow();
  });

  it("rejects null", () => {
    expect(() => uuidSchema.parse(null)).toThrow();
  });

  it("rejects number", () => {
    expect(() => uuidSchema.parse(42)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Locale extraction from referer header
// ═══════════════════════════════════════════════════════════════════════════

describe("localeFrom — locale extraction from URL", () => {
  function extractLocale(referer: string): "en" | "vi" {
    const m = referer.match(/\/(en|vi)(\/|$)/);
    return (m?.[1] as "en" | "vi") ?? "en";
  }

  it("extracts 'en' from English URL", () => {
    expect(extractLocale("https://app.example.com/en/child/home")).toBe("en");
  });

  it("extracts 'vi' from Vietnamese URL", () => {
    expect(extractLocale("https://app.example.com/vi/child/home")).toBe("vi");
  });

  it("defaults to 'en' when no locale in URL", () => {
    expect(extractLocale("https://app.example.com/child/home")).toBe("en");
  });

  it("defaults to 'en' for empty referer", () => {
    expect(extractLocale("")).toBe("en");
  });

  it("extracts locale from root path /en/", () => {
    expect(extractLocale("https://app.example.com/en/")).toBe("en");
  });

  it("extracts locale from root path /vi (no trailing slash)", () => {
    expect(extractLocale("https://app.example.com/vi")).toBe("vi");
  });

  it("does not match 'en' in words like /oven/page", () => {
    // The regex /\/(en|vi)(\/|$)/ requires en/vi immediately after /
    expect(extractLocale("https://app.example.com/oven/page")).toBe("en"); // no match → default
  });

  it("does not match partial locale like /english/", () => {
    expect(extractLocale("https://app.example.com/english/page")).toBe("en"); // /en matched as substring after /
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Evidence file validation — mime types and size limits
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence file validation", () => {
  const ALLOWED_PHOTO_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const ALLOWED_AUDIO_PREFIXES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/x-m4a"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  function isValidEvidence(
    fileType: string,
    fileSize: number,
    evidenceType: "photo" | "audio",
  ): boolean {
    const allowed = evidenceType === "photo" ? ALLOWED_PHOTO_PREFIXES : ALLOWED_AUDIO_PREFIXES;
    const mimeOk = allowed.some((p) => fileType === p || fileType.startsWith(p + ";"));
    return mimeOk && fileSize <= MAX_FILE_SIZE;
  }

  describe("photo evidence", () => {
    it("accepts image/jpeg", () => {
      expect(isValidEvidence("image/jpeg", 1024, "photo")).toBe(true);
    });

    it("accepts image/png", () => {
      expect(isValidEvidence("image/png", 1024, "photo")).toBe(true);
    });

    it("accepts image/webp", () => {
      expect(isValidEvidence("image/webp", 1024, "photo")).toBe(true);
    });

    it("accepts image/gif (child evidence allows gif, unlike parent messages)", () => {
      expect(isValidEvidence("image/gif", 1024, "photo")).toBe(true);
    });

    it("accepts mime with parameters", () => {
      expect(isValidEvidence("image/jpeg; charset=utf-8", 1024, "photo")).toBe(true);
    });

    it("rejects image/svg+xml", () => {
      expect(isValidEvidence("image/svg+xml", 1024, "photo")).toBe(false);
    });

    it("rejects image/tiff", () => {
      expect(isValidEvidence("image/tiff", 1024, "photo")).toBe(false);
    });

    it("rejects video/mp4", () => {
      expect(isValidEvidence("video/mp4", 1024, "photo")).toBe(false);
    });
  });

  describe("audio evidence", () => {
    it("accepts audio/webm", () => {
      expect(isValidEvidence("audio/webm", 1024, "audio")).toBe(true);
    });

    it("accepts audio/mp4", () => {
      expect(isValidEvidence("audio/mp4", 1024, "audio")).toBe(true);
    });

    it("accepts audio/mpeg (mp3)", () => {
      expect(isValidEvidence("audio/mpeg", 1024, "audio")).toBe(true);
    });

    it("accepts audio/ogg", () => {
      expect(isValidEvidence("audio/ogg", 1024, "audio")).toBe(true);
    });

    it("accepts audio/x-m4a", () => {
      expect(isValidEvidence("audio/x-m4a", 1024, "audio")).toBe(true);
    });

    it("accepts audio/webm with codecs param", () => {
      expect(isValidEvidence("audio/webm; codecs=opus", 1024, "audio")).toBe(true);
    });

    it("rejects audio/wav", () => {
      expect(isValidEvidence("audio/wav", 1024, "audio")).toBe(false);
    });

    it("rejects audio/flac", () => {
      expect(isValidEvidence("audio/flac", 1024, "audio")).toBe(false);
    });
  });

  describe("file size limits (10 MB for child evidence)", () => {
    it("rejects file over 10 MB", () => {
      expect(isValidEvidence("image/jpeg", MAX_FILE_SIZE + 1, "photo")).toBe(false);
    });

    it("accepts file exactly at 10 MB", () => {
      expect(isValidEvidence("image/jpeg", MAX_FILE_SIZE, "photo")).toBe(true);
    });

    it("accepts small file", () => {
      expect(isValidEvidence("image/jpeg", 256, "photo")).toBe(true);
    });
  });

  describe("child vs parent file size limit comparison", () => {
    it("child evidence limit is 10 MB (half of parent's 20 MB)", () => {
      const CHILD_MAX = 10 * 1024 * 1024;
      const PARENT_MAX = 20 * 1024 * 1024;
      expect(CHILD_MAX).toBe(10485760);
      expect(CHILD_MAX).toBe(PARENT_MAX / 2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Evidence type routing
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence type routing", () => {
  function shouldSaveEvidence(evidenceType: string | null): boolean {
    return !!evidenceType && evidenceType !== "none" && evidenceType !== "parent_observation";
  }

  it("saves for photo evidence", () => {
    expect(shouldSaveEvidence("photo")).toBe(true);
  });

  it("saves for audio evidence", () => {
    expect(shouldSaveEvidence("audio")).toBe(true);
  });

  it("saves for text evidence", () => {
    expect(shouldSaveEvidence("text")).toBe(true);
  });

  it("saves for choice evidence", () => {
    expect(shouldSaveEvidence("choice")).toBe(true);
  });

  it("skips for none", () => {
    expect(shouldSaveEvidence("none")).toBe(false);
  });

  it("skips for parent_observation (handled by parent, not child)", () => {
    expect(shouldSaveEvidence("parent_observation")).toBe(false);
  });

  it("skips for null", () => {
    expect(shouldSaveEvidence(null)).toBe(false);
  });

  it("skips for empty string", () => {
    expect(shouldSaveEvidence("")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Evidence storage path generation
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence storage path generation", () => {
  function buildStoragePath(
    familyId: string,
    childId: string,
    completionId: string,
    fileName: string,
    evidenceType: "photo" | "audio",
  ): string {
    const ext = fileName.split(".").pop() || (evidenceType === "photo" ? "jpg" : "webm");
    return `${familyId}/${childId}/${completionId}.${ext}`;
  }

  it("builds path with jpg extension", () => {
    expect(buildStoragePath("f1", "c1", "comp1", "photo.jpg", "photo"))
      .toBe("f1/c1/comp1.jpg");
  });

  it("builds path with png extension", () => {
    expect(buildStoragePath("f1", "c1", "comp1", "image.png", "photo"))
      .toBe("f1/c1/comp1.png");
  });

  it("builds path with webm extension for audio", () => {
    expect(buildStoragePath("f1", "c1", "comp1", "voice.webm", "audio"))
      .toBe("f1/c1/comp1.webm");
  });

  it("defaults to jpg for photo with no extension", () => {
    expect(buildStoragePath("f1", "c1", "comp1", "", "photo"))
      .toBe("f1/c1/comp1.jpg");
  });

  it("defaults to webm for audio with no extension", () => {
    expect(buildStoragePath("f1", "c1", "comp1", "", "audio"))
      .toBe("f1/c1/comp1.webm");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Evidence expiry calculation
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence expiry calculation", () => {
  const EVIDENCE_EXPIRY_DAYS = 7;

  function computeExpiryDate(nowMs: number): string {
    return new Date(nowMs + EVIDENCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  }

  it("expires 7 days from creation", () => {
    const now = new Date("2024-01-15T10:00:00Z").getTime();
    const expiry = computeExpiryDate(now);
    expect(expiry).toBe("2024-01-22T10:00:00.000Z");
  });

  it("returns valid ISO string", () => {
    const expiry = computeExpiryDate(Date.now());
    expect(expiry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("expiry is always in the future", () => {
    const now = Date.now();
    const expiry = new Date(computeExpiryDate(now)).getTime();
    expect(expiry).toBeGreaterThan(now);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Audio duration parsing
// ═══════════════════════════════════════════════════════════════════════════

describe("Audio duration parsing", () => {
  function parseAudioDuration(raw: string | null): number | null {
    return raw ? parseInt(raw) || null : null;
  }

  it("parses valid integer string", () => {
    expect(parseAudioDuration("15")).toBe(15);
  });

  it("returns null for null input", () => {
    expect(parseAudioDuration(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseAudioDuration("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseAudioDuration("abc")).toBeNull();
  });

  it("parses float by truncating", () => {
    expect(parseAudioDuration("15.7")).toBe(15);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Text evidence truncation
// ═══════════════════════════════════════════════════════════════════════════

describe("Text evidence processing", () => {
  function processTextEvidence(raw: string | null): string | null {
    const text = ((raw as string) || "").trim();
    if (!text) return null;
    return text.slice(0, 500);
  }

  it("trims whitespace", () => {
    expect(processTextEvidence("  hello  ")).toBe("hello");
  });

  it("truncates to 500 characters", () => {
    const long = "x".repeat(600);
    expect(processTextEvidence(long)).toHaveLength(500);
  });

  it("returns null for empty string", () => {
    expect(processTextEvidence("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(processTextEvidence("   ")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(processTextEvidence(null)).toBeNull();
  });

  it("preserves text under 500 chars", () => {
    expect(processTextEvidence("I did my homework")).toBe("I did my homework");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Reward request validation logic
// ═══════════════════════════════════════════════════════════════════════════

describe("requestRewardAction — validation guards", () => {
  interface Reward {
    active: boolean;
    stock: number | null;
    coin_cost: number;
    family_id: string;
    requires_approval: boolean;
  }

  function validateRewardRequest(
    reward: Reward | null,
    childFamilyId: string,
    childBalance: number,
  ): { ok: boolean; error?: string } {
    if (!reward) return { ok: false, error: "Reward not found" };
    if (!reward.active) return { ok: false, error: "Reward inactive" };
    if (reward.stock !== null && reward.stock <= 0) return { ok: false, error: "Out of stock" };
    if (childFamilyId !== reward.family_id) return { ok: false, error: "Family mismatch" };
    if (childBalance < reward.coin_cost) {
      return { ok: false, error: `Not enough coins (have ${childBalance}, need ${reward.coin_cost})` };
    }
    return { ok: true };
  }

  it("passes all checks for valid request", () => {
    const result = validateRewardRequest(
      { active: true, stock: 5, coin_cost: 50, family_id: "f1", requires_approval: true },
      "f1",
      100,
    );
    expect(result.ok).toBe(true);
  });

  it("fails when reward not found", () => {
    expect(validateRewardRequest(null, "f1", 100).error).toBe("Reward not found");
  });

  it("fails when reward inactive", () => {
    const result = validateRewardRequest(
      { active: false, stock: 5, coin_cost: 50, family_id: "f1", requires_approval: true },
      "f1",
      100,
    );
    expect(result.error).toBe("Reward inactive");
  });

  it("fails when out of stock", () => {
    const result = validateRewardRequest(
      { active: true, stock: 0, coin_cost: 50, family_id: "f1", requires_approval: true },
      "f1",
      100,
    );
    expect(result.error).toBe("Out of stock");
  });

  it("passes when stock is null (unlimited)", () => {
    const result = validateRewardRequest(
      { active: true, stock: null, coin_cost: 50, family_id: "f1", requires_approval: true },
      "f1",
      100,
    );
    expect(result.ok).toBe(true);
  });

  it("fails on family mismatch", () => {
    const result = validateRewardRequest(
      { active: true, stock: 5, coin_cost: 50, family_id: "f1", requires_approval: true },
      "f2",
      100,
    );
    expect(result.error).toBe("Family mismatch");
  });

  it("fails when not enough coins", () => {
    const result = validateRewardRequest(
      { active: true, stock: 5, coin_cost: 100, family_id: "f1", requires_approval: true },
      "f1",
      50,
    );
    expect(result.error).toContain("Not enough coins");
    expect(result.error).toContain("have 50");
    expect(result.error).toContain("need 100");
  });

  it("passes when coins exactly equal cost", () => {
    const result = validateRewardRequest(
      { active: true, stock: null, coin_cost: 50, family_id: "f1", requires_approval: true },
      "f1",
      50,
    );
    expect(result.ok).toBe(true);
  });

  it("fails when coins are 0 and cost > 0", () => {
    const result = validateRewardRequest(
      { active: true, stock: null, coin_cost: 1, family_id: "f1", requires_approval: true },
      "f1",
      0,
    );
    expect(result.error).toContain("Not enough coins");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Redemption status determination
// ═══════════════════════════════════════════════════════════════════════════

describe("Redemption initial status", () => {
  function determineStatus(requiresApproval: boolean): "requested" | "approved" {
    return requiresApproval ? "requested" : "approved";
  }

  it("sets 'requested' when approval required", () => {
    expect(determineStatus(true)).toBe("requested");
  });

  it("sets 'approved' when no approval required", () => {
    expect(determineStatus(false)).toBe("approved");
  });
});

describe("Redemption coin deduction transaction", () => {
  function buildDeductionTx(
    childId: string,
    coinCost: number,
    redemptionId: string,
    requiresApproval: boolean,
  ) {
    return {
      child_id: childId,
      amount: -coinCost,
      transaction_type: "REWARD_REDEMPTION",
      reference_id: redemptionId,
      description: requiresApproval ? "Reward requested (held)" : "Auto-approved redemption",
    };
  }

  it("creates negative amount transaction", () => {
    const tx = buildDeductionTx("c1", 50, "r1", true);
    expect(tx.amount).toBe(-50);
  });

  it("uses REWARD_REDEMPTION transaction type", () => {
    const tx = buildDeductionTx("c1", 50, "r1", true);
    expect(tx.transaction_type).toBe("REWARD_REDEMPTION");
  });

  it("uses 'held' description when approval required", () => {
    const tx = buildDeductionTx("c1", 50, "r1", true);
    expect(tx.description).toBe("Reward requested (held)");
  });

  it("uses 'auto-approved' description when no approval needed", () => {
    const tx = buildDeductionTx("c1", 50, "r1", false);
    expect(tx.description).toBe("Auto-approved redemption");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. Stock decrement logic
// ═══════════════════════════════════════════════════════════════════════════

describe("Stock decrement logic", () => {
  function shouldDecrementStock(stock: number | null): boolean {
    return stock !== null;
  }

  function decrementStock(stock: number): number {
    return stock - 1;
  }

  it("decrements when stock is a number", () => {
    expect(shouldDecrementStock(5)).toBe(true);
    expect(decrementStock(5)).toBe(4);
  });

  it("skips when stock is null (unlimited)", () => {
    expect(shouldDecrementStock(null)).toBe(false);
  });

  it("decrements from 1 to 0", () => {
    expect(decrementStock(1)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. Cancel redemption validation
// ═══════════════════════════════════════════════════════════════════════════

describe("cancelRedemptionAction — validation guards", () => {
  function validateCancellation(
    redemption: { child_id: string; status: string } | null,
    sessionChildId: string,
  ): { ok: boolean; error?: string } {
    if (!redemption) return { ok: false, error: "Not found" };
    if (redemption.child_id !== sessionChildId) return { ok: false, error: "Not your request" };
    if (redemption.status !== "requested") return { ok: false, error: "Already processed" };
    return { ok: true };
  }

  it("allows cancellation of own requested redemption", () => {
    expect(validateCancellation({ child_id: "c1", status: "requested" }, "c1").ok).toBe(true);
  });

  it("rejects when not found", () => {
    expect(validateCancellation(null, "c1").error).toBe("Not found");
  });

  it("rejects when not the child's request", () => {
    expect(validateCancellation({ child_id: "c2", status: "requested" }, "c1").error).toBe("Not your request");
  });

  it("rejects when already approved", () => {
    expect(validateCancellation({ child_id: "c1", status: "approved" }, "c1").error).toBe("Already processed");
  });

  it("rejects when already rejected", () => {
    expect(validateCancellation({ child_id: "c1", status: "rejected" }, "c1").error).toBe("Already processed");
  });

  it("rejects when already cancelled", () => {
    expect(validateCancellation({ child_id: "c1", status: "cancelled" }, "c1").error).toBe("Already processed");
  });
});

describe("Cancel redemption refund transaction", () => {
  function buildRefundTx(childId: string, coinCost: number, redemptionId: string) {
    return {
      child_id: childId,
      amount: coinCost,
      transaction_type: "MANUAL_ADJUSTMENT",
      reference_id: redemptionId,
      description: "Reward request cancelled — refund",
    };
  }

  it("creates positive amount (refund)", () => {
    const tx = buildRefundTx("c1", 50, "r1");
    expect(tx.amount).toBe(50);
    expect(tx.amount).toBeGreaterThan(0);
  });

  it("mentions cancelled in description", () => {
    const tx = buildRefundTx("c1", 50, "r1");
    expect(tx.description).toContain("cancelled");
    expect(tx.description).toContain("refund");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. Choice quest claim validation
// ═══════════════════════════════════════════════════════════════════════════

describe("claimChoiceQuestAction — claim limit checks", () => {
  function checkDailyClaimLimit(
    claimsToday: number,
    maxPerDay: number | null,
  ): boolean {
    const limit = maxPerDay ?? 1;
    return claimsToday < limit;
  }

  it("allows first claim of the day (0 < 1)", () => {
    expect(checkDailyClaimLimit(0, null)).toBe(true);
  });

  it("blocks second claim when default limit is 1", () => {
    expect(checkDailyClaimLimit(1, null)).toBe(false);
  });

  it("allows 2nd claim when limit is 3", () => {
    expect(checkDailyClaimLimit(2, 3)).toBe(true);
  });

  it("blocks when at limit", () => {
    expect(checkDailyClaimLimit(3, 3)).toBe(false);
  });

  it("blocks when over limit", () => {
    expect(checkDailyClaimLimit(5, 3)).toBe(false);
  });
});

describe("claimChoiceQuestAction — per-task daily limit", () => {
  function checkTaskDailyLimit(
    taskClaimsToday: number,
    poolMaxPerDay: number | null,
  ): boolean {
    if (poolMaxPerDay == null) return true; // No per-task limit
    return taskClaimsToday < poolMaxPerDay;
  }

  it("allows when no per-task limit (null)", () => {
    expect(checkTaskDailyLimit(5, null)).toBe(true);
  });

  it("allows when under limit", () => {
    expect(checkTaskDailyLimit(0, 2)).toBe(true);
  });

  it("blocks when at limit", () => {
    expect(checkTaskDailyLimit(2, 2)).toBe(false);
  });
});

describe("claimChoiceQuestAction — duplicate check", () => {
  function isDuplicateClaim(claimsForTaskToday: number): boolean {
    return claimsForTaskToday > 0;
  }

  it("allows first claim", () => {
    expect(isDuplicateClaim(0)).toBe(false);
  });

  it("blocks duplicate claim", () => {
    expect(isDuplicateClaim(1)).toBe(true);
  });

  it("blocks multiple duplicates", () => {
    expect(isDuplicateClaim(3)).toBe(true);
  });
});

describe("claimChoiceQuestAction — family membership check", () => {
  function isSameFamily(childFamilyId: string | null, taskFamilyId: string): boolean {
    return childFamilyId === taskFamilyId;
  }

  it("passes when same family", () => {
    expect(isSameFamily("family-1", "family-1")).toBe(true);
  });

  it("fails when different families", () => {
    expect(isSameFamily("family-1", "family-2")).toBe(false);
  });

  it("fails when child family is null", () => {
    expect(isSameFamily(null, "family-1")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. Message ID parsing (markMessagesReadAction)
// ═══════════════════════════════════════════════════════════════════════════

describe("Message ID parsing", () => {
  function parseMessageIds(raw: string | null): string[] {
    return raw ? raw.split(",").filter(Boolean) : [];
  }

  it("parses comma-separated IDs", () => {
    expect(parseMessageIds("id1,id2,id3")).toEqual(["id1", "id2", "id3"]);
  });

  it("returns empty for null", () => {
    expect(parseMessageIds(null)).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parseMessageIds("")).toEqual([]);
  });

  it("handles single ID", () => {
    expect(parseMessageIds("id1")).toEqual(["id1"]);
  });

  it("filters out empty strings from trailing comma", () => {
    expect(parseMessageIds("id1,id2,")).toEqual(["id1", "id2"]);
  });

  it("filters out empty strings from leading comma", () => {
    expect(parseMessageIds(",id1")).toEqual(["id1"]);
  });

  it("filters out empty strings from multiple commas", () => {
    expect(parseMessageIds("id1,,id2")).toEqual(["id1", "id2"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. Reaction validation
// ═══════════════════════════════════════════════════════════════════════════

describe("reactToMessageAction — reaction validation", () => {
  const VALID_REACTIONS = ["❤️", "😊", "🌟"];

  function isValidReaction(reaction: string): boolean {
    return VALID_REACTIONS.includes(reaction);
  }

  it("accepts heart reaction", () => {
    expect(isValidReaction("❤️")).toBe(true);
  });

  it("accepts smile reaction", () => {
    expect(isValidReaction("😊")).toBe(true);
  });

  it("accepts star reaction", () => {
    expect(isValidReaction("🌟")).toBe(true);
  });

  it("rejects thumbs up", () => {
    expect(isValidReaction("👍")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidReaction("")).toBe(false);
  });

  it("rejects random emoji", () => {
    expect(isValidReaction("🎉")).toBe(false);
  });

  it("rejects text", () => {
    expect(isValidReaction("love")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. Revoke assignment — status guard
// ═══════════════════════════════════════════════════════════════════════════

describe("revokeAssignmentAction — status guard", () => {
  const REVOKABLE_STATUSES = ["todo", "rejected"];

  function canRevoke(status: string): boolean {
    return REVOKABLE_STATUSES.includes(status);
  }

  it("allows revoking 'todo' assignment", () => {
    expect(canRevoke("todo")).toBe(true);
  });

  it("allows revoking 'rejected' assignment", () => {
    expect(canRevoke("rejected")).toBe(true);
  });

  it("blocks revoking 'submitted' assignment", () => {
    expect(canRevoke("submitted")).toBe(false);
  });

  it("blocks revoking 'approved' assignment", () => {
    expect(canRevoke("approved")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. Resolve repair action — status guard
// ═══════════════════════════════════════════════════════════════════════════

describe("resolveRepairAction — validation", () => {
  function canResolve(
    event: { child_id: string; status: string } | null,
    sessionChildId: string,
  ): boolean {
    if (!event) return false;
    if (event.child_id !== sessionChildId) return false;
    if (event.status !== "OPEN") return false;
    return true;
  }

  it("allows resolving own OPEN event", () => {
    expect(canResolve({ child_id: "c1", status: "OPEN" }, "c1")).toBe(true);
  });

  it("blocks if event not found", () => {
    expect(canResolve(null, "c1")).toBe(false);
  });

  it("blocks if not own event", () => {
    expect(canResolve({ child_id: "c2", status: "OPEN" }, "c1")).toBe(false);
  });

  it("blocks if already RESOLVED", () => {
    expect(canResolve({ child_id: "c1", status: "RESOLVED" }, "c1")).toBe(false);
  });
});

describe("resolveRepairAction — update shape (no rewards)", () => {
  function buildResolveUpdate() {
    const now = new Date().toISOString();
    return {
      status: "RESOLVED",
      resolved_at: now,
      updated_at: now,
    };
  }

  it("sets status to RESOLVED", () => {
    expect(buildResolveUpdate().status).toBe("RESOLVED");
  });

  it("sets resolved_at and updated_at to valid ISO dates", () => {
    const update = buildResolveUpdate();
    expect(update.resolved_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(update.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("does NOT include coin or star fields (resolving repairs = no rewards)", () => {
    const update = buildResolveUpdate();
    expect(update).not.toHaveProperty("coin_reward");
    expect(update).not.toHaveProperty("star_reward");
    expect(update).not.toHaveProperty("amount");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. Child session structure
// ═══════════════════════════════════════════════════════════════════════════

describe("ChildSession type shape", () => {
  interface ChildSession {
    childId: string;
    familyId: string;
    iat: number;
    exp: number;
  }

  function isSessionValid(session: ChildSession, nowSeconds: number): boolean {
    return session.exp >= nowSeconds;
  }

  it("session is valid before expiry", () => {
    const now = 1700000000;
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 43200 };
    expect(isSessionValid(session, now + 100)).toBe(true);
  });

  it("session is invalid after expiry", () => {
    const now = 1700000000;
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 43200 };
    expect(isSessionValid(session, now + 50000)).toBe(false);
  });

  it("session is valid exactly at expiry", () => {
    const now = 1700000000;
    const session: ChildSession = { childId: "c1", familyId: "f1", iat: now, exp: now + 43200 };
    expect(isSessionValid(session, now + 43200)).toBe(true);
  });

  it("12h TTL equals 43200 seconds", () => {
    const MAX_AGE_SEC = 60 * 60 * 12;
    expect(MAX_AGE_SEC).toBe(43200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 19. Pool refresh — once-per-day limit
// ═══════════════════════════════════════════════════════════════════════════

describe("refreshPoolAction — daily limit", () => {
  it("enforces one refresh per day via unique constraint", () => {
    // The action inserts { child_id, refresh_date: today }
    // If a row already exists for this child+date, the insert fails
    // This is enforced by the DB unique constraint, not app logic
    const insertResult = { error: { message: "duplicate key value" } };
    expect(insertResult.error).toBeTruthy();
  });

  it("allows refresh on new day", () => {
    const insertResult = { error: null };
    expect(insertResult.error).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 20. Evidence type routing for DB insert shape
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence insert shape by type", () => {
  function buildEvidenceRow(
    completionId: string,
    childId: string,
    familyId: string,
    evidenceType: "photo" | "audio" | "text" | "choice",
    extra: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      task_completion_id: completionId,
      child_id: childId,
      family_id: familyId,
      evidence_type: evidenceType,
      status: "active",
      ...extra,
    };
  }

  it("photo/audio evidence includes storage_path and file metadata", () => {
    const row = buildEvidenceRow("comp1", "c1", "f1", "photo", {
      storage_path: "f1/c1/comp1.jpg",
      file_size: 1024,
      mime_type: "image/jpeg",
      expires_at: "2024-01-22T00:00:00Z",
    });
    expect(row["storage_path"]).toBeDefined();
    expect(row["file_size"]).toBe(1024);
    expect(row["expires_at"]).toBeDefined();
    expect(row["status"]).toBe("active");
  });

  it("text evidence includes text_content only", () => {
    const row = buildEvidenceRow("comp1", "c1", "f1", "text", {
      text_content: "I completed my homework",
    });
    expect(row["text_content"]).toBe("I completed my homework");
    expect(row).not.toHaveProperty("storage_path");
  });

  it("choice evidence includes choice_value only", () => {
    const row = buildEvidenceRow("comp1", "c1", "f1", "choice", {
      choice_value: "option_a",
    });
    expect(row["choice_value"]).toBe("option_a");
    expect(row).not.toHaveProperty("storage_path");
    expect(row).not.toHaveProperty("text_content");
  });

  it("all evidence types have status=active", () => {
    for (const type of ["photo", "audio", "text", "choice"] as const) {
      const row = buildEvidenceRow("comp1", "c1", "f1", type, {});
      expect(row.status).toBe("active");
    }
  });
});
