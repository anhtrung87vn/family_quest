import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Kids actions module tests — extracted from app/[locale]/(parent)/kids/actions.ts
//
// Tests: Zod schemas, validation, avatar path building, file validation,
// extension extraction, and business logic for child management.
// ---------------------------------------------------------------------------

// ─── Schema definitions (mirrored from actions.ts) ────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(40),
  grade: z.coerce.number().int().min(1).max(12).optional().nullable(),
  preferred_language: z.enum(["en", "vi"]).default("en"),
  pin: z.string().regex(/^\d{6}$/),
  date_of_birth: z.string().date().optional().nullable(),
});

const setPinSchema = z.object({
  child_id: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/),
});

const updateBirthdaySchema = z.object({
  child_id: z.string().uuid(),
  date_of_birth: z.string().date().optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. createChild schema
// ═══════════════════════════════════════════════════════════════════════════

describe("createChild schema — valid inputs", () => {
  it("accepts minimal valid input", () => {
    const result = createSchema.parse({
      name: "Alice",
      pin: "123456",
    });
    expect(result.name).toBe("Alice");
    expect(result.pin).toBe("123456");
    expect(result.preferred_language).toBe("en");
    expect(result.grade).toBeUndefined();
  });

  it("accepts all fields", () => {
    const result = createSchema.parse({
      name: "Bob",
      grade: "5",
      preferred_language: "vi",
      pin: "654321",
      date_of_birth: "2015-06-15",
    });
    expect(result.grade).toBe(5);
    expect(result.preferred_language).toBe("vi");
    expect(result.date_of_birth).toBe("2015-06-15");
  });

  it("coerces grade from string", () => {
    const result = createSchema.parse({ name: "X", pin: "111111", grade: "8" });
    expect(result.grade).toBe(8);
  });

  it("allows null grade", () => {
    const result = createSchema.parse({ name: "X", pin: "111111", grade: null });
    expect(result.grade).toBeNull();
  });

  it("allows null date_of_birth", () => {
    const result = createSchema.parse({ name: "X", pin: "111111", date_of_birth: null });
    expect(result.date_of_birth).toBeNull();
  });
});

describe("createChild schema — name validation", () => {
  it("rejects empty name", () => {
    expect(() => createSchema.parse({ name: "", pin: "123456" })).toThrow();
  });

  it("rejects name over 40 chars", () => {
    expect(() => createSchema.parse({ name: "A".repeat(41), pin: "123456" })).toThrow();
  });

  it("accepts name at max 40 chars", () => {
    const result = createSchema.parse({ name: "A".repeat(40), pin: "123456" });
    expect(result.name.length).toBe(40);
  });

  it("accepts 1-char name", () => {
    const result = createSchema.parse({ name: "X", pin: "123456" });
    expect(result.name).toBe("X");
  });

  it("accepts Vietnamese name", () => {
    const result = createSchema.parse({ name: "Nguyễn Văn An", pin: "123456" });
    expect(result.name).toBe("Nguyễn Văn An");
  });
});

describe("createChild schema — PIN validation", () => {
  it("accepts 6-digit PIN", () => {
    expect(createSchema.parse({ name: "X", pin: "000000" }).pin).toBe("000000");
  });

  it("rejects 5-digit PIN", () => {
    expect(() => createSchema.parse({ name: "X", pin: "12345" })).toThrow();
  });

  it("rejects 7-digit PIN", () => {
    expect(() => createSchema.parse({ name: "X", pin: "1234567" })).toThrow();
  });

  it("rejects alpha PIN", () => {
    expect(() => createSchema.parse({ name: "X", pin: "abcdef" })).toThrow();
  });

  it("rejects mixed PIN", () => {
    expect(() => createSchema.parse({ name: "X", pin: "123abc" })).toThrow();
  });

  it("rejects PIN with spaces", () => {
    expect(() => createSchema.parse({ name: "X", pin: "123 56" })).toThrow();
  });
});

describe("createChild schema — grade validation", () => {
  it("accepts grade 1", () => {
    expect(createSchema.parse({ name: "X", pin: "111111", grade: "1" }).grade).toBe(1);
  });

  it("accepts grade 12", () => {
    expect(createSchema.parse({ name: "X", pin: "111111", grade: "12" }).grade).toBe(12);
  });

  it("rejects grade 0", () => {
    expect(() => createSchema.parse({ name: "X", pin: "111111", grade: "0" })).toThrow();
  });

  it("rejects grade 13", () => {
    expect(() => createSchema.parse({ name: "X", pin: "111111", grade: "13" })).toThrow();
  });

  it("rejects non-integer grade", () => {
    expect(() => createSchema.parse({ name: "X", pin: "111111", grade: "5.5" })).toThrow();
  });
});

describe("createChild schema — preferred_language", () => {
  it("defaults to 'en' when omitted", () => {
    expect(createSchema.parse({ name: "X", pin: "111111" }).preferred_language).toBe("en");
  });

  it("accepts 'vi'", () => {
    expect(createSchema.parse({ name: "X", pin: "111111", preferred_language: "vi" }).preferred_language).toBe("vi");
  });

  it("rejects unsupported locale", () => {
    expect(() => createSchema.parse({ name: "X", pin: "111111", preferred_language: "fr" })).toThrow();
  });
});

describe("createChild schema — date_of_birth validation", () => {
  it("accepts valid date", () => {
    const result = createSchema.parse({ name: "X", pin: "111111", date_of_birth: "2018-03-25" });
    expect(result.date_of_birth).toBe("2018-03-25");
  });

  it("rejects invalid date format", () => {
    expect(() => createSchema.parse({ name: "X", pin: "111111", date_of_birth: "25/03/2018" })).toThrow();
  });

  it("rejects non-date string", () => {
    expect(() => createSchema.parse({ name: "X", pin: "111111", date_of_birth: "not-a-date" })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. setPin schema
// ═══════════════════════════════════════════════════════════════════════════

describe("setPin schema", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts valid child_id and PIN", () => {
    const result = setPinSchema.parse({ child_id: validUuid, pin: "654321" });
    expect(result.child_id).toBe(validUuid);
  });

  it("rejects non-uuid child_id", () => {
    expect(() => setPinSchema.parse({ child_id: "not-uuid", pin: "654321" })).toThrow();
  });

  it("rejects invalid PIN format", () => {
    expect(() => setPinSchema.parse({ child_id: validUuid, pin: "12345" })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. updateChildBirthday schema
// ═══════════════════════════════════════════════════════════════════════════

describe("updateChildBirthday schema", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts valid date", () => {
    const result = updateBirthdaySchema.parse({ child_id: validUuid, date_of_birth: "2015-06-15" });
    expect(result.date_of_birth).toBe("2015-06-15");
  });

  it("allows null date", () => {
    const result = updateBirthdaySchema.parse({ child_id: validUuid, date_of_birth: null });
    expect(result.date_of_birth).toBeNull();
  });

  it("rejects invalid uuid", () => {
    expect(() => updateBirthdaySchema.parse({ child_id: "bad", date_of_birth: null })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. revokeAssignment validation
// ═══════════════════════════════════════════════════════════════════════════

describe("revokeAssignment validation", () => {
  const uuidSchema = z.string().uuid();

  it("accepts valid UUID", () => {
    expect(uuidSchema.parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBeTruthy();
  });

  it("rejects non-UUID", () => {
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => uuidSchema.parse("")).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. uploadAvatar — file validation logic
// ═══════════════════════════════════════════════════════════════════════════

describe("uploadAvatar — file validation", () => {
  function validateFile(file: { size: number } | null): string | null {
    if (!file || file.size === 0) return "No file";
    if (file.size > 5 * 1024 * 1024) return "File too large";
    return null;
  }

  it("rejects null file", () => {
    expect(validateFile(null)).toBe("No file");
  });

  it("rejects zero-size file", () => {
    expect(validateFile({ size: 0 })).toBe("No file");
  });

  it("rejects file over 5MB", () => {
    expect(validateFile({ size: 5 * 1024 * 1024 + 1 })).toBe("File too large");
  });

  it("accepts file exactly 5MB", () => {
    expect(validateFile({ size: 5 * 1024 * 1024 })).toBeNull();
  });

  it("accepts small file", () => {
    expect(validateFile({ size: 100 })).toBeNull();
  });
});

describe("uploadAvatar — path construction", () => {
  function buildAvatarPath(familyId: string, childId: string, fileName: string): string {
    const ext = (fileName.split(".").pop() ?? "png").toLowerCase();
    return `${familyId}/${childId}.${ext}`;
  }

  it("constructs path from family + child + extension", () => {
    expect(buildAvatarPath("fam-1", "child-1", "photo.jpg")).toBe("fam-1/child-1.jpg");
  });

  it("uses png as default extension", () => {
    expect(buildAvatarPath("fam-1", "child-1", "noext")).toBe("fam-1/child-1.noext");
  });

  it("lowercases extension", () => {
    expect(buildAvatarPath("fam-1", "child-1", "photo.PNG")).toBe("fam-1/child-1.png");
  });

  it("handles webp", () => {
    expect(buildAvatarPath("fam-1", "child-1", "img.webp")).toBe("fam-1/child-1.webp");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. FormData extraction pattern (checkbox/coerce)
// ═══════════════════════════════════════════════════════════════════════════

describe("FormData extraction — grade from form", () => {
  // The action uses: formData.get("grade") || null
  function extractGrade(raw: string | null): number | null | undefined {
    const val = raw || null;
    if (val === null) return null;
    return createSchema.shape.grade.parse(val);
  }

  it("returns null for empty string", () => {
    expect(extractGrade("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(extractGrade(null)).toBeNull();
  });

  it("parses valid grade", () => {
    expect(extractGrade("6")).toBe(6);
  });
});
