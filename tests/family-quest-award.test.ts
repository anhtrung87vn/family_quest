import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/dev-family", () => ({ DEV_BYPASS: false, DEV_USER_ID: "" }));

import { familyQuestAwards } from "@/lib/ledger";

describe("familyQuestAwards", () => {
  it("pays the per-child reward to every contributing child", () => {
    const out = familyQuestAwards(
      [{ child_id: "july", contributions: 3 }, { child_id: "berry", contributions: 2 }],
      50,
      10,
    );
    expect(out.coins).toEqual([{ child_id: "july", amount: 50 }, { child_id: "berry", amount: 50 }]);
    expect(out.stars).toEqual([{ child_id: "july", amount: 10 }, { child_id: "berry", amount: 10 }]);
  });

  it("skips children who never contributed and de-duplicates members", () => {
    const out = familyQuestAwards(
      [{ child_id: "july", contributions: 1 }, { child_id: "july", contributions: 2 }, { child_id: "berry", contributions: 0 }],
      20,
      5,
    );
    expect(out.coins).toEqual([{ child_id: "july", amount: 20 }]);
  });

  it("writes no coin rows for 0-coin quests but still gives stars", () => {
    const out = familyQuestAwards([{ child_id: "july", contributions: 7 }], 0, 50);
    expect(out.coins).toEqual([]);
    expect(out.stars).toEqual([{ child_id: "july", amount: 50 }]);
  });
});
