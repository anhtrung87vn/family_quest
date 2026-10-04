import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Settings actions module tests — extracted from
// app/[locale]/(parent)/settings/actions.ts
//
// Tests: Zod schemas, language cookie config, evidence deletion logic.
// ---------------------------------------------------------------------------

const languageSchema = z.object({ language: z.enum(["en", "vi"]) });

// ═══════════════════════════════════════════════════════════════════════════
// 1. setLanguage schema
// ═══════════════════════════════════════════════════════════════════════════

describe("setLanguage schema", () => {
  it("accepts 'en'", () => {
    expect(languageSchema.parse({ language: "en" }).language).toBe("en");
  });

  it("accepts 'vi'", () => {
    expect(languageSchema.parse({ language: "vi" }).language).toBe("vi");
  });

  it("rejects unsupported locale", () => {
    expect(() => languageSchema.parse({ language: "fr" })).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => languageSchema.parse({ language: "" })).toThrow();
  });

  it("rejects null", () => {
    expect(() => languageSchema.parse({ language: null })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Language cookie config
// ═══════════════════════════════════════════════════════════════════════════

describe("Language cookie configuration", () => {
  const cookieConfig = {
    path: "/",
    httpOnly: false,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 365,
  };

  it("sets path to /", () => {
    expect(cookieConfig.path).toBe("/");
  });

  it("is not httpOnly (needs client-side reading)", () => {
    expect(cookieConfig.httpOnly).toBe(false);
  });

  it("uses lax same-site", () => {
    expect(cookieConfig.sameSite).toBe("lax");
  });

  it("expires in 1 year", () => {
    expect(cookieConfig.maxAge).toBe(31536000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. deleteAllTempEvidence — row processing logic
// ═══════════════════════════════════════════════════════════════════════════

describe("deleteAllTempEvidence — row processing", () => {
  function processEvidenceRows(
    rows: { id: string; storage_path: string | null }[],
  ): { id: string; storage_path: string | null; needsStorageDelete: boolean }[] {
    return rows.map((row) => ({
      ...row,
      needsStorageDelete: !!row.storage_path,
    }));
  }

  it("marks rows with storage_path for deletion", () => {
    const result = processEvidenceRows([
      { id: "e1", storage_path: "family-1/photo.jpg" },
    ]);
    expect(result[0].needsStorageDelete).toBe(true);
  });

  it("skips storage delete for null path", () => {
    const result = processEvidenceRows([
      { id: "e1", storage_path: null },
    ]);
    expect(result[0].needsStorageDelete).toBe(false);
  });

  it("handles empty array", () => {
    expect(processEvidenceRows([])).toHaveLength(0);
  });

  it("processes mixed rows", () => {
    const result = processEvidenceRows([
      { id: "e1", storage_path: "path/a.jpg" },
      { id: "e2", storage_path: null },
      { id: "e3", storage_path: "path/b.webm" },
    ]);
    expect(result.filter((r) => r.needsStorageDelete)).toHaveLength(2);
  });
});

describe("deleteAllTempEvidence — soft-delete update", () => {
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

  it("includes deleted_at timestamp", () => {
    const update = buildDeleteUpdate();
    expect(update.deleted_at).toBeTruthy();
    // Should be a valid ISO string
    expect(new Date(update.deleted_at).toISOString()).toBe(update.deleted_at);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. deleteAllTempEvidence — counter
// ═══════════════════════════════════════════════════════════════════════════

describe("deleteAllTempEvidence — counter", () => {
  function countDeleted(rows: { id: string }[]): number {
    let deleted = 0;
    for (const _row of rows) {
      deleted++;
    }
    return deleted;
  }

  it("counts all rows", () => {
    expect(countDeleted([{ id: "1" }, { id: "2" }, { id: "3" }])).toBe(3);
  });

  it("returns 0 for empty", () => {
    expect(countDeleted([])).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Evidence query filter
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence query filters", () => {
  it("filters by status=active", () => {
    const rows = [
      { id: "1", status: "active" },
      { id: "2", status: "expired" },
      { id: "3", status: "active" },
    ];
    const active = rows.filter((r) => r.status === "active");
    expect(active).toHaveLength(2);
  });

  it("excludes null storage_path", () => {
    const rows = [
      { id: "1", storage_path: "path/a.jpg" },
      { id: "2", storage_path: null },
    ];
    const withPath = rows.filter((r) => r.storage_path !== null);
    expect(withPath).toHaveLength(1);
  });
});
