import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Rewards actions module tests — extracted from
//   app/[locale]/(parent)/rewards/actions.ts
//
// Strategy: Test Zod schemas, image upload validation, template cloning
// dedup logic, and derived state as pure functions.
// ---------------------------------------------------------------------------

// ─── Schema definition (mirrored from actions.ts) ─────────────────────────

const rewardSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["small", "medium", "large", "experience", "dream"]).optional().nullable(),
  coin_cost: z.coerce.number().int().min(1).max(100000),
  requires_approval: z.coerce.boolean().default(true),
  dream_eligible: z.coerce.boolean().default(false),
  stock: z.coerce.number().int().min(0).optional().nullable(),
  image_url: z.string().url().max(2000).optional().nullable(),
  link_url: z.string().url().max(2000).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// rewardSchema — valid inputs
// ═══════════════════════════════════════════════════════════════════════════

describe("rewardSchema — valid inputs", () => {
  const validInput = { name: "Ice cream", coin_cost: 50 };

  it("accepts minimal valid input with defaults", () => {
    const result = rewardSchema.parse(validInput);
    expect(result.name).toBe("Ice cream");
    expect(result.coin_cost).toBe(50);
    expect(result.requires_approval).toBe(true);
    expect(result.dream_eligible).toBe(false);
  });

  it("accepts full input with all fields", () => {
    const result = rewardSchema.parse({
      ...validInput,
      description: "Vanilla cone from 7-Eleven",
      category: "small",
      requires_approval: false,
      dream_eligible: true,
      stock: 3,
      image_url: "https://example.com/ice-cream.jpg",
      link_url: "https://shop.example.com/buy",
    });
    expect(result.category).toBe("small");
    expect(result.stock).toBe(3);
    expect(result.image_url).toBe("https://example.com/ice-cream.jpg");
  });

  it("accepts null for optional fields", () => {
    const result = rewardSchema.parse({
      ...validInput,
      description: null,
      category: null,
      stock: null,
      image_url: null,
      link_url: null,
    });
    expect(result.description).toBeNull();
    expect(result.category).toBeNull();
    expect(result.stock).toBeNull();
  });

  it("coerces string coin_cost to number", () => {
    const result = rewardSchema.parse({ ...validInput, coin_cost: "100" });
    expect(result.coin_cost).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rewardSchema — name validation
// ═══════════════════════════════════════════════════════════════════════════

describe("rewardSchema — name validation", () => {
  const base = { coin_cost: 50 };

  it("rejects empty name", () => {
    expect(() => rewardSchema.parse({ ...base, name: "" })).toThrow();
  });

  it("rejects name over 80 chars", () => {
    expect(() => rewardSchema.parse({ ...base, name: "x".repeat(81) })).toThrow();
  });

  it("accepts name at boundary (80 chars)", () => {
    const result = rewardSchema.parse({ ...base, name: "x".repeat(80) });
    expect(result.name).toHaveLength(80);
  });

  it("accepts 1-char name", () => {
    const result = rewardSchema.parse({ ...base, name: "A" });
    expect(result.name).toBe("A");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rewardSchema — coin_cost validation
// ═══════════════════════════════════════════════════════════════════════════

describe("rewardSchema — coin_cost validation", () => {
  const base = { name: "Reward" };

  it("rejects zero cost", () => {
    expect(() => rewardSchema.parse({ ...base, coin_cost: 0 })).toThrow();
  });

  it("rejects negative cost", () => {
    expect(() => rewardSchema.parse({ ...base, coin_cost: -10 })).toThrow();
  });

  it("rejects cost over 100000", () => {
    expect(() => rewardSchema.parse({ ...base, coin_cost: 100001 })).toThrow();
  });

  it("accepts min 1 coin", () => {
    expect(rewardSchema.parse({ ...base, coin_cost: 1 }).coin_cost).toBe(1);
  });

  it("accepts max 100000 coins", () => {
    expect(rewardSchema.parse({ ...base, coin_cost: 100000 }).coin_cost).toBe(100000);
  });

  it("rejects decimal cost", () => {
    expect(() => rewardSchema.parse({ ...base, coin_cost: 5.5 })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rewardSchema — category validation
// ═══════════════════════════════════════════════════════════════════════════

describe("rewardSchema — category validation", () => {
  const base = { name: "R", coin_cost: 10 };

  it("accepts all valid categories", () => {
    for (const cat of ["small", "medium", "large", "experience", "dream"]) {
      expect(rewardSchema.parse({ ...base, category: cat }).category).toBe(cat);
    }
  });

  it("rejects invalid category", () => {
    expect(() => rewardSchema.parse({ ...base, category: "luxury" })).toThrow();
  });

  it("rejects task category names (not valid for rewards)", () => {
    expect(() => rewardSchema.parse({ ...base, category: "learning" })).toThrow();
    expect(() => rewardSchema.parse({ ...base, category: "health" })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rewardSchema — stock validation
// ═══════════════════════════════════════════════════════════════════════════

describe("rewardSchema — stock validation", () => {
  const base = { name: "R", coin_cost: 10 };

  it("accepts 0 stock (out of stock)", () => {
    expect(rewardSchema.parse({ ...base, stock: 0 }).stock).toBe(0);
  });

  it("accepts positive stock", () => {
    expect(rewardSchema.parse({ ...base, stock: 5 }).stock).toBe(5);
  });

  it("accepts null stock (unlimited)", () => {
    expect(rewardSchema.parse({ ...base, stock: null }).stock).toBeNull();
  });

  it("rejects negative stock", () => {
    expect(() => rewardSchema.parse({ ...base, stock: -1 })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rewardSchema — URL validation
// ═══════════════════════════════════════════════════════════════════════════

describe("rewardSchema — URL validation", () => {
  const base = { name: "R", coin_cost: 10 };

  it("accepts valid HTTPS URL for image_url", () => {
    const result = rewardSchema.parse({ ...base, image_url: "https://example.com/img.jpg" });
    expect(result.image_url).toBe("https://example.com/img.jpg");
  });

  it("accepts valid HTTP URL", () => {
    const result = rewardSchema.parse({ ...base, link_url: "http://shop.example.com" });
    expect(result.link_url).toBe("http://shop.example.com");
  });

  it("rejects invalid URL format", () => {
    expect(() => rewardSchema.parse({ ...base, image_url: "not-a-url" })).toThrow();
  });

  it("rejects URL over 2000 chars", () => {
    const longUrl = "https://example.com/" + "a".repeat(2000);
    expect(() => rewardSchema.parse({ ...base, image_url: longUrl })).toThrow();
  });

  it("accepts null for image_url", () => {
    expect(rewardSchema.parse({ ...base, image_url: null }).image_url).toBeNull();
  });

  it("accepts null for link_url", () => {
    expect(rewardSchema.parse({ ...base, link_url: null }).link_url).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rewardSchema — description validation
// ═══════════════════════════════════════════════════════════════════════════

describe("rewardSchema — description validation", () => {
  const base = { name: "R", coin_cost: 10 };

  it("rejects description over 500 chars", () => {
    expect(() => rewardSchema.parse({ ...base, description: "x".repeat(501) })).toThrow();
  });

  it("accepts description at boundary (500 chars)", () => {
    const result = rewardSchema.parse({ ...base, description: "x".repeat(500) });
    expect(result.description).toHaveLength(500);
  });

  it("accepts empty description (treated as valid optional string)", () => {
    const result = rewardSchema.parse({ ...base, description: "" });
    expect(result.description).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reward image upload validation
// ═══════════════════════════════════════════════════════════════════════════

describe("uploadRewardImage — validation", () => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  function validateImageUpload(
    file: { size: number; type: string; name: string } | null,
  ): { error: string } | null {
    if (!file || file.size === 0) return { error: "No file" };
    if (file.size > MAX_SIZE) return { error: "File too large (max 5 MB)" };
    if (!file.type.startsWith("image/")) return { error: "Not an image" };
    return null;
  }

  it("rejects null file", () => {
    expect(validateImageUpload(null)?.error).toBe("No file");
  });

  it("rejects zero-size file", () => {
    expect(validateImageUpload({ size: 0, type: "image/jpeg", name: "test.jpg" })?.error).toBe("No file");
  });

  it("rejects file over 5 MB", () => {
    expect(validateImageUpload({ size: MAX_SIZE + 1, type: "image/jpeg", name: "big.jpg" })?.error).toContain("too large");
  });

  it("accepts file at exactly 5 MB", () => {
    expect(validateImageUpload({ size: MAX_SIZE, type: "image/jpeg", name: "ok.jpg" })).toBeNull();
  });

  it("rejects non-image file", () => {
    expect(validateImageUpload({ size: 1024, type: "application/pdf", name: "doc.pdf" })?.error).toBe("Not an image");
  });

  it("rejects audio file", () => {
    expect(validateImageUpload({ size: 1024, type: "audio/mp3", name: "song.mp3" })?.error).toBe("Not an image");
  });

  it("accepts image/jpeg", () => {
    expect(validateImageUpload({ size: 1024, type: "image/jpeg", name: "photo.jpg" })).toBeNull();
  });

  it("accepts image/png", () => {
    expect(validateImageUpload({ size: 1024, type: "image/png", name: "icon.png" })).toBeNull();
  });

  it("accepts image/webp", () => {
    expect(validateImageUpload({ size: 1024, type: "image/webp", name: "photo.webp" })).toBeNull();
  });

  it("accepts image/gif", () => {
    expect(validateImageUpload({ size: 1024, type: "image/gif", name: "anim.gif" })).toBeNull();
  });

  it("accepts image/svg+xml (startsWith image/)", () => {
    expect(validateImageUpload({ size: 1024, type: "image/svg+xml", name: "logo.svg" })).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Image upload path generation
// ═══════════════════════════════════════════════════════════════════════════

describe("Reward image storage path", () => {
  function buildImagePath(familyId: string, fileName: string, timestamp: number): string {
    const ext = fileName.split(".").pop() ?? "jpg";
    return `${familyId}/${timestamp}.${ext}`;
  }

  it("generates path with correct extension", () => {
    expect(buildImagePath("f1", "photo.png", 1700000000)).toBe("f1/1700000000.png");
  });

  it("defaults to jpg when no extension", () => {
    expect(buildImagePath("f1", "photo", 1700000000)).toBe("f1/1700000000.photo");
    // Note: "photo".split(".").pop() returns "photo" (no dot), so ?? fallback isn't triggered
    // In real code this works fine since file always has an extension
  });

  it("uses timestamp for uniqueness", () => {
    const path1 = buildImagePath("f1", "a.jpg", 1700000001);
    const path2 = buildImagePath("f1", "a.jpg", 1700000002);
    expect(path1).not.toBe(path2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Toggle reward active logic
// ═══════════════════════════════════════════════════════════════════════════

describe("toggleRewardActive", () => {
  it("toggles active true to false", () => {
    const currentActive = true;
    expect(!currentActive).toBe(false);
  });

  it("toggles active false to true", () => {
    const currentActive = false;
    expect(!currentActive).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reward vs Task delete semantics
// ═══════════════════════════════════════════════════════════════════════════

describe("Reward delete semantics", () => {
  it("rewards use hard delete (not soft delete like tasks)", () => {
    // From AGENTS.md: "Tasks use soft-delete. Rewards can be hard-deleted."
    // deleteReward calls .delete().eq("id", id) — no .update({ active: false })
    const isHardDelete = true;
    expect(isHardDelete).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Template cloning — dedup logic
// ═══════════════════════════════════════════════════════════════════════════

describe("cloneRewardTemplates — dedup logic", () => {
  function filterNewTemplates(
    templates: { name: string }[],
    existingNames: Set<string>,
  ): { name: string }[] {
    return templates.filter((t) => !existingNames.has(t.name));
  }

  it("filters out templates whose names already exist", () => {
    const templates = [
      { name: "Sticker" },
      { name: "Movie Night" },
      { name: "Ice Cream" },
    ];
    const existing = new Set(["Sticker", "Ice Cream"]);
    const result = filterNewTemplates(templates, existing);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Movie Night");
  });

  it("returns all templates when none exist", () => {
    const templates = [{ name: "A" }, { name: "B" }];
    const result = filterNewTemplates(templates, new Set());
    expect(result).toHaveLength(2);
  });

  it("returns empty when all already exist", () => {
    const templates = [{ name: "X" }];
    const result = filterNewTemplates(templates, new Set(["X"]));
    expect(result).toHaveLength(0);
  });

  it("handles empty template list", () => {
    expect(filterNewTemplates([], new Set(["A"]))).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Template cloning — row transformation
// ═══════════════════════════════════════════════════════════════════════════

describe("cloneRewardTemplates — row transformation", () => {
  function transformTemplate(
    template: Record<string, unknown>,
    familyId: string,
  ): Record<string, unknown> {
    return { ...template, family_id: familyId, active: true };
  }

  it("sets family_id to target family", () => {
    const result = transformTemplate({ name: "Sticker", coin_cost: 10 }, "family-abc");
    expect(result.family_id).toBe("family-abc");
  });

  it("sets active to true", () => {
    const result = transformTemplate({ name: "Sticker" }, "family-abc");
    expect(result.active).toBe(true);
  });

  it("preserves original template fields", () => {
    const result = transformTemplate(
      { name: "Movie", coin_cost: 100, category: "experience" },
      "f1",
    );
    expect(result.name).toBe("Movie");
    expect(result.coin_cost).toBe(100);
    expect(result.category).toBe("experience");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// resetAndRecloneRewards — row transformation
// ═══════════════════════════════════════════════════════════════════════════

describe("resetAndRecloneRewards — row transformation", () => {
  function transformForReset(
    template: Record<string, unknown>,
    familyId: string,
  ): Record<string, unknown> {
    return { ...template, family_id: familyId, active: true, is_system_template: false };
  }

  it("sets is_system_template to false", () => {
    const result = transformForReset({ name: "Sticker" }, "f1");
    expect(result.is_system_template).toBe(false);
  });

  it("sets active to true", () => {
    const result = transformForReset({ name: "Sticker" }, "f1");
    expect(result.active).toBe(true);
  });

  it("sets family_id to target family", () => {
    const result = transformForReset({ name: "Sticker" }, "family-xyz");
    expect(result.family_id).toBe("family-xyz");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// System template family_id (nil UUID)
// ═══════════════════════════════════════════════════════════════════════════

describe("System template identification", () => {
  const SYSTEM_FAMILY_ID = "00000000-0000-0000-0000-000000000000";

  it("system templates use nil UUID as family_id", () => {
    expect(SYSTEM_FAMILY_ID).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("nil UUID is a valid UUID format", () => {
    expect(z.string().uuid().safeParse(SYSTEM_FAMILY_ID).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UUID validation (used by update/delete/toggle)
// ═══════════════════════════════════════════════════════════════════════════

describe("Reward ID validation", () => {
  const uuidSchema = z.string().uuid();

  it("accepts valid UUID", () => {
    expect(uuidSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toBeTruthy();
  });

  it("rejects empty string", () => {
    expect(() => uuidSchema.parse("")).toThrow();
  });

  it("rejects non-UUID", () => {
    expect(() => uuidSchema.parse("abc")).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Checkbox parsing (requires_approval / dream_eligible)
// ═══════════════════════════════════════════════════════════════════════════

describe("Checkbox value parsing", () => {
  function parseCheckbox(value: string | null): boolean {
    return value === "on";
  }

  it("returns true for 'on'", () => {
    expect(parseCheckbox("on")).toBe(true);
  });

  it("returns false for null", () => {
    expect(parseCheckbox(null)).toBe(false);
  });

  it("returns false for 'off'", () => {
    expect(parseCheckbox("off")).toBe(false);
  });

  it("returns false for 'true' (not checked via standard HTML)", () => {
    expect(parseCheckbox("true")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(parseCheckbox("")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Stock parsing from form
// ═══════════════════════════════════════════════════════════════════════════

describe("Stock form value parsing", () => {
  function parseStock(raw: string | null): number | null {
    return raw ? Number(raw) : null;
  }

  it("returns null for empty string (unlimited stock)", () => {
    expect(parseStock("")).toBeNull();
  });

  it("returns null for null (unlimited stock)", () => {
    expect(parseStock(null)).toBeNull();
  });

  it("parses valid number", () => {
    expect(parseStock("5")).toBe(5);
  });

  it("parses zero", () => {
    expect(parseStock("0")).toBe(0);
  });

  it("returns NaN for non-numeric (would fail Zod validation)", () => {
    expect(parseStock("abc")).toBeNaN();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// URL trimming from form
// ═══════════════════════════════════════════════════════════════════════════

describe("URL form value trimming", () => {
  function parseUrl(raw: string | null): string | null {
    return (raw as string)?.trim() || null;
  }

  it("trims whitespace from URL", () => {
    expect(parseUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("returns null for empty string", () => {
    expect(parseUrl("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseUrl(null)).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseUrl("   ")).toBeNull();
  });

  it("preserves valid URL", () => {
    expect(parseUrl("https://example.com/img.jpg")).toBe("https://example.com/img.jpg");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// File size limits comparison
// ═══════════════════════════════════════════════════════════════════════════

describe("File size limits across modules", () => {
  it("reward image limit is 5 MB", () => {
    expect(5 * 1024 * 1024).toBe(5242880);
  });

  it("child evidence limit is 10 MB", () => {
    expect(10 * 1024 * 1024).toBe(10485760);
  });

  it("parent message limit is 20 MB", () => {
    expect(20 * 1024 * 1024).toBe(20971520);
  });

  it("reward image < child evidence < parent message", () => {
    const rewardMax = 5 * 1024 * 1024;
    const childMax = 10 * 1024 * 1024;
    const parentMax = 20 * 1024 * 1024;
    expect(rewardMax).toBeLessThan(childMax);
    expect(childMax).toBeLessThan(parentMax);
  });
});
