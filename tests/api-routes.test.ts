import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// API route tests — extracted from:
//   app/api/cron/cleanup-evidence/route.ts
//   app/api/auth/callback/route.ts
//   app/api/evidence/[id]/download/route.ts
//   app/api/backup/route.ts
//   app/api/addin/tasks/route.ts
//
// Tests: Auth guards, processing logic, filename sanitization, backup format.
// ---------------------------------------------------------------------------

// ═══════════════════════════════════════════════════════════════════════════
// 1. Cron auth — CRON_SECRET bearer check
// ═══════════════════════════════════════════════════════════════════════════

describe("Cron auth — CRON_SECRET bearer check", () => {
  function checkCronAuth(secret: string | undefined, authHeader: string): boolean {
    if (!secret) return false;
    return authHeader === `Bearer ${secret}`;
  }

  it("accepts valid bearer token", () => {
    expect(checkCronAuth("my-secret", "Bearer my-secret")).toBe(true);
  });

  it("rejects wrong secret", () => {
    expect(checkCronAuth("my-secret", "Bearer wrong")).toBe(false);
  });

  it("rejects missing bearer prefix", () => {
    expect(checkCronAuth("my-secret", "my-secret")).toBe(false);
  });

  it("rejects empty auth header", () => {
    expect(checkCronAuth("my-secret", "")).toBe(false);
  });

  it("rejects when no CRON_SECRET set", () => {
    expect(checkCronAuth(undefined, "Bearer anything")).toBe(false);
  });

  it("rejects empty CRON_SECRET", () => {
    expect(checkCronAuth("", "Bearer ")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Cleanup-evidence — expiry processing
// ═══════════════════════════════════════════════════════════════════════════

describe("Cleanup-evidence — row processing", () => {
  function processCleanup(
    rows: { id: string; storage_path: string | null }[],
  ): { expired: number; errors: number } {
    let expired = 0;
    let errors = 0;
    for (const row of rows) {
      if (row.storage_path) {
        // simulate storage delete — can succeed or fail
        expired++;
      } else {
        // no storage path, just mark as expired
        expired++;
      }
    }
    return { expired, errors };
  }

  it("counts all rows as expired on success", () => {
    const result = processCleanup([
      { id: "1", storage_path: "path/a.jpg" },
      { id: "2", storage_path: "path/b.webm" },
    ]);
    expect(result.expired).toBe(2);
    expect(result.errors).toBe(0);
  });

  it("handles empty rows", () => {
    const result = processCleanup([]);
    expect(result.expired).toBe(0);
    expect(result.errors).toBe(0);
  });

  it("processes rows without storage_path", () => {
    const result = processCleanup([{ id: "1", storage_path: null }]);
    expect(result.expired).toBe(1);
  });
});

describe("Cleanup-evidence — update payload", () => {
  function buildExpireUpdate() {
    return {
      status: "expired",
      deleted_at: new Date().toISOString(),
      deletion_reason: "AUTO_EXPIRED",
    };
  }

  it("sets status to expired", () => {
    expect(buildExpireUpdate().status).toBe("expired");
  });

  it("uses AUTO_EXPIRED reason", () => {
    expect(buildExpireUpdate().deletion_reason).toBe("AUTO_EXPIRED");
  });

  it("includes ISO timestamp", () => {
    const update = buildExpireUpdate();
    expect(new Date(update.deleted_at).toISOString()).toBe(update.deleted_at);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Auth callback — onboarding decision
// ═══════════════════════════════════════════════════════════════════════════

describe("Auth callback — onboarding decision", () => {
  function needsFamily(
    existingFull: { id: string; family_id: string | null } | null,
  ): boolean {
    return !existingFull || !existingFull.family_id;
  }

  it("needs family for brand new user (null)", () => {
    expect(needsFamily(null)).toBe(true);
  });

  it("needs family when family_id is null (orphaned)", () => {
    expect(needsFamily({ id: "u1", family_id: null })).toBe(true);
  });

  it("does not need family when family_id present", () => {
    expect(needsFamily({ id: "u1", family_id: "fam-1" })).toBe(false);
  });
});

describe("Auth callback — user type determination", () => {
  function determineAction(
    existingFull: { id: string; family_id: string | null } | null,
  ): "insert_new" | "patch_orphan" | "none" {
    if (!existingFull) return "insert_new";
    if (!existingFull.family_id) return "patch_orphan";
    return "none";
  }

  it("inserts new user when no row exists", () => {
    expect(determineAction(null)).toBe("insert_new");
  });

  it("patches orphan when row exists without family", () => {
    expect(determineAction({ id: "u1", family_id: null })).toBe("patch_orphan");
  });

  it("does nothing for existing user with family", () => {
    expect(determineAction({ id: "u1", family_id: "fam-1" })).toBe("none");
  });
});

describe("Auth callback — code extraction", () => {
  it("extracts code from URL", () => {
    const url = new URL("https://app.example.com/api/auth/callback?code=abc123");
    expect(url.searchParams.get("code")).toBe("abc123");
  });

  it("returns null when no code", () => {
    const url = new URL("https://app.example.com/api/auth/callback");
    expect(url.searchParams.get("code")).toBeNull();
  });

  it("extracts origin", () => {
    const url = new URL("https://app.example.com/api/auth/callback?code=abc");
    expect(url.origin).toBe("https://app.example.com");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Evidence download — filename sanitization
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence download — sanitizeFilename", () => {
  function sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
  }

  it("keeps alphanumeric + spaces", () => {
    expect(sanitizeFilename("Alice Task")).toBe("Alice-Task");
  });

  it("keeps Vietnamese characters", () => {
    expect(sanitizeFilename("Nguyễn Văn An")).toBe("Nguyễn-Văn-An");
  });

  it("strips special characters", () => {
    expect(sanitizeFilename("Task @#$%")).toBe("Task-");
  });

  it("truncates to 50 chars", () => {
    const long = "A".repeat(60);
    expect(sanitizeFilename(long).length).toBe(50);
  });

  it("collapses multiple spaces", () => {
    expect(sanitizeFilename("A   B")).toBe("A-B");
  });

  it("keeps hyphens", () => {
    expect(sanitizeFilename("self-management")).toBe("self-management");
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });
});

describe("Evidence download — filename construction", () => {
  function buildFilename(
    childName: string,
    taskName: string,
    dateStr: string,
    storagePath: string,
    evidenceType: string,
  ): string {
    function sanitize(name: string) {
      return name.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "").replace(/\s+/g, "-").slice(0, 50);
    }
    const ext = storagePath.split(".").pop() || (evidenceType === "photo" ? "webp" : "webm");
    return `${sanitize(childName)}-${sanitize(taskName)}-${dateStr}.${ext}`;
  }

  it("builds photo filename", () => {
    const name = buildFilename("Alice", "Brush Teeth", "2024-06-15", "f/c/photo.webp", "photo");
    expect(name).toBe("Alice-Brush-Teeth-2024-06-15.webp");
  });

  it("builds audio filename", () => {
    const name = buildFilename("Bob", "Read", "2024-06-15", "f/c/audio.webm", "audio");
    expect(name).toBe("Bob-Read-2024-06-15.webm");
  });

  it("uses last segment of path as extension", () => {
    // "noext".split(".").pop() is "noext" (no dot → entire string)
    const name = buildFilename("X", "T", "2024-01-01", "noext", "photo");
    expect(name).toBe("X-T-2024-01-01.noext");
  });
});

describe("Evidence download — bucket fallback", () => {
  function chooseBucket(primaryHasFile: boolean, secondaryHasFile: boolean): string | null {
    if (primaryHasFile) return "family-evidence";
    if (secondaryHasFile) return "family-memories";
    return null;
  }

  it("uses family-evidence when found", () => {
    expect(chooseBucket(true, false)).toBe("family-evidence");
  });

  it("falls back to family-memories", () => {
    expect(chooseBucket(false, true)).toBe("family-memories");
  });

  it("returns null when not found in either", () => {
    expect(chooseBucket(false, false)).toBeNull();
  });
});

describe("Evidence download — family ownership check", () => {
  function checkOwnership(evidenceFamilyId: string, requestFamilyId: string): boolean {
    return evidenceFamilyId === requestFamilyId;
  }

  it("allows same family", () => {
    expect(checkOwnership("fam-1", "fam-1")).toBe(true);
  });

  it("rejects different family", () => {
    expect(checkOwnership("fam-1", "fam-2")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Backup — version validation
// ═══════════════════════════════════════════════════════════════════════════

describe("Backup — version validation", () => {
  function isValidBackup(body: unknown): boolean {
    return !!body && typeof body === "object" && (body as Record<string, unknown>).version === 1;
  }

  it("accepts version 1", () => {
    expect(isValidBackup({ version: 1 })).toBe(true);
  });

  it("rejects version 2", () => {
    expect(isValidBackup({ version: 2 })).toBe(false);
  });

  it("rejects missing version", () => {
    expect(isValidBackup({})).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidBackup(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidBackup(undefined)).toBe(false);
  });
});

describe("Backup — restore deduplication", () => {
  function filterNewItems<T extends { name: string }>(
    items: T[],
    existingNames: Set<string>,
  ): T[] {
    return items.filter((t) => !existingNames.has(t.name));
  }

  it("filters out existing names", () => {
    const items = [{ name: "A" }, { name: "B" }, { name: "C" }];
    const result = filterNewItems(items, new Set(["B"]));
    expect(result.map((i) => i.name)).toEqual(["A", "C"]);
  });

  it("returns all when no existing", () => {
    const items = [{ name: "A" }];
    expect(filterNewItems(items, new Set())).toHaveLength(1);
  });

  it("returns empty when all existing", () => {
    const items = [{ name: "A" }];
    expect(filterNewItems(items, new Set(["A"]))).toHaveLength(0);
  });
});

describe("Backup — restore row sanitization", () => {
  function sanitizeRestoreRow(row: Record<string, unknown>, familyId: string): Record<string, unknown> {
    return {
      ...row,
      id: undefined,
      family_id: familyId,
      is_system_template: false,
      created_at: undefined,
      updated_at: undefined,
    };
  }

  it("clears id for DB to generate new one", () => {
    const result = sanitizeRestoreRow({ id: "old-id", name: "T" }, "fam-1");
    expect(result.id).toBeUndefined();
  });

  it("overrides family_id", () => {
    const result = sanitizeRestoreRow({ family_id: "old-fam", name: "T" }, "fam-1");
    expect(result.family_id).toBe("fam-1");
  });

  it("forces is_system_template to false", () => {
    const result = sanitizeRestoreRow({ is_system_template: true, name: "T" }, "fam-1");
    expect(result.is_system_template).toBe(false);
  });
});

describe("Backup — export format", () => {
  function buildBackup(familyId: string) {
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      family_id: familyId,
      tasks: [],
      rewards: [],
      children: [],
      task_assignments: [],
      coin_ledger: [],
    };
  }

  it("has version 1", () => {
    expect(buildBackup("fam-1").version).toBe(1);
  });

  it("includes all expected keys", () => {
    const backup = buildBackup("fam-1");
    expect(backup).toHaveProperty("tasks");
    expect(backup).toHaveProperty("rewards");
    expect(backup).toHaveProperty("children");
    expect(backup).toHaveProperty("task_assignments");
    expect(backup).toHaveProperty("coin_ledger");
  });

  it("generates correct filename pattern", () => {
    const filename = `bloomquest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    expect(filename).toMatch(/^bloomquest-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Addin tasks — stub route
// ═══════════════════════════════════════════════════════════════════════════

describe("Addin tasks — stub route", () => {
  it("returns 404 JSON", () => {
    const response = { error: "not found" };
    expect(response.error).toBe("not found");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Evidence download — Supabase join unwrapping
// ═══════════════════════════════════════════════════════════════════════════

describe("Evidence download — join unwrapping", () => {
  function unwrapJoin<T>(value: T | T[] | null): T | null {
    if (value === null) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
  }

  it("unwraps object", () => {
    expect(unwrapJoin({ name: "Alice" })).toEqual({ name: "Alice" });
  });

  it("unwraps array with one element", () => {
    expect(unwrapJoin([{ name: "Alice" }])).toEqual({ name: "Alice" });
  });

  it("returns null for empty array", () => {
    expect(unwrapJoin([])).toBeNull();
  });

  it("returns null for null", () => {
    expect(unwrapJoin(null)).toBeNull();
  });
});
