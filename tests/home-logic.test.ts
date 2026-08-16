import { describe, it, expect } from "vitest";

// Test the core/optional split logic and status filtering
// extracted from child home page

interface Assignment {
  id: string;
  status: string;
  task: { name: string; category: string; coin_reward: number; star_reward: number };
}

function makeAssignment(id: string, status: string, name: string): Assignment {
  return {
    id,
    status,
    task: { name, category: "learning", coin_reward: 5, star_reward: 1 },
  };
}

function filterActionable(todos: Assignment[]) {
  return todos.filter((a) => a.status === "todo" || a.status === "rejected");
}

function filterSubmitted(todos: Assignment[]) {
  return todos.filter((a) => a.status === "submitted");
}

function splitCoreOptional(actionable: Assignment[], coreCount = 3) {
  return {
    core: actionable.slice(0, coreCount),
    optional: actionable.slice(coreCount),
  };
}

describe("Home page task filtering", () => {
  it("separates actionable from submitted tasks", () => {
    const todos = [
      makeAssignment("1", "todo", "Read"),
      makeAssignment("2", "submitted", "Clean"),
      makeAssignment("3", "rejected", "Music"),
      makeAssignment("4", "submitted", "Water"),
      makeAssignment("5", "todo", "Draw"),
    ];

    const actionable = filterActionable(todos);
    const submitted = filterSubmitted(todos);

    expect(actionable).toHaveLength(3);
    expect(submitted).toHaveLength(2);
    expect(actionable.map((a) => a.id)).toEqual(["1", "3", "5"]);
    expect(submitted.map((a) => a.id)).toEqual(["2", "4"]);
  });

  it("returns empty arrays when no tasks", () => {
    expect(filterActionable([])).toHaveLength(0);
    expect(filterSubmitted([])).toHaveLength(0);
  });

  it("handles all-submitted tasks", () => {
    const todos = [
      makeAssignment("1", "submitted", "A"),
      makeAssignment("2", "submitted", "B"),
    ];
    expect(filterActionable(todos)).toHaveLength(0);
    expect(filterSubmitted(todos)).toHaveLength(2);
  });

  it("ignores approved tasks", () => {
    const todos = [
      makeAssignment("1", "approved", "Done task"),
      makeAssignment("2", "todo", "Active task"),
    ];
    expect(filterActionable(todos)).toHaveLength(1);
    expect(filterSubmitted(todos)).toHaveLength(0);
  });
});

describe("Core/Optional split", () => {
  it("splits first 3 as core, rest as optional", () => {
    const tasks = Array.from({ length: 6 }, (_, i) =>
      makeAssignment(String(i), "todo", `Task ${i}`)
    );

    const { core, optional } = splitCoreOptional(tasks);

    expect(core).toHaveLength(3);
    expect(optional).toHaveLength(3);
    expect(core.map((a) => a.id)).toEqual(["0", "1", "2"]);
    expect(optional.map((a) => a.id)).toEqual(["3", "4", "5"]);
  });

  it("all core when <= 3 tasks", () => {
    const tasks = [
      makeAssignment("1", "todo", "A"),
      makeAssignment("2", "todo", "B"),
    ];
    const { core, optional } = splitCoreOptional(tasks);
    expect(core).toHaveLength(2);
    expect(optional).toHaveLength(0);
  });

  it("empty when no actionable tasks", () => {
    const { core, optional } = splitCoreOptional([]);
    expect(core).toHaveLength(0);
    expect(optional).toHaveLength(0);
  });

  it("exactly 3 tasks = all core, no optional", () => {
    const tasks = Array.from({ length: 3 }, (_, i) =>
      makeAssignment(String(i), "todo", `Task ${i}`)
    );
    const { core, optional } = splitCoreOptional(tasks);
    expect(core).toHaveLength(3);
    expect(optional).toHaveLength(0);
  });
});

describe("Dream reward display logic", () => {
  it("calculates dream progress correctly", () => {
    const coin = 320;
    const dreamCost = 5000;
    const pct = Math.min(100, Math.round((coin / dreamCost) * 100));
    const coinsLeft = dreamCost - coin;

    expect(pct).toBe(6);
    expect(coinsLeft).toBe(4680);
  });

  it("shows ready state when coins >= cost", () => {
    const coin = 5000;
    const dreamCost = 5000;
    expect(coin >= dreamCost).toBe(true);
  });

  it("handles zero coins", () => {
    const coin = 0;
    const dreamCost = 100;
    const pct = Math.min(100, Math.round((coin / dreamCost) * 100));
    expect(pct).toBe(0);
    expect(dreamCost - coin).toBe(100);
  });

  it("caps progress at 100%", () => {
    const coin = 6000;
    const dreamCost = 5000;
    const pct = Math.min(100, Math.round((coin / dreamCost) * 100));
    expect(pct).toBe(100);
  });
});

describe("Reward affordability logic", () => {
  it("shows request button only when affordable and in stock", () => {
    const coin = 50;
    const rewardCost = 30;
    const stock: number | null = 5;

    const canAfford = coin >= rewardCost;
    const inStock = stock == null || stock > 0;
    expect(canAfford).toBe(true);
    expect(inStock).toBe(true);
  });

  it("hides request button when not enough coins", () => {
    const coin = 10;
    const rewardCost = 30;
    expect(coin >= rewardCost).toBe(false);
  });

  it("hides request button when out of stock", () => {
    const coin = 100;
    const rewardCost = 30;
    const stock = 0;
    const inStock = stock == null || stock > 0;
    expect(inStock).toBe(false);
  });

  it("unlimited stock (null) is always in stock", () => {
    const stock: number | null = null;
    const inStock = stock == null || stock > 0;
    expect(inStock).toBe(true);
  });
});

describe("Badge progress calculation", () => {
  it("calculates progress toward next badge", () => {
    const current = 8;
    const target = 10;
    const pct = Math.min(100, Math.round((current / target) * 100));
    const remaining = target - current;

    expect(pct).toBe(80);
    expect(remaining).toBe(2);
  });

  it("shows 0% when no progress", () => {
    const pct = Math.min(100, Math.round((0 / 10) * 100));
    expect(pct).toBe(0);
  });

  it("caps at 100%", () => {
    const pct = Math.min(100, Math.round((15 / 10) * 100));
    expect(pct).toBe(100);
  });
});

describe("Weekly journey date grouping", () => {
  function groupByDate<T extends { created_at: string }>(items: T[]) {
    const groups: { date: string; items: T[] }[] = [];
    for (const item of items) {
      const d = new Date(item.created_at).toLocaleDateString("en", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const last = groups[groups.length - 1];
      if (last?.date === d) last.items.push(item);
      else groups.push({ date: d, items: [item] });
    }
    return groups;
  }

  it("groups transactions by date", () => {
    const txs = [
      { id: "1", created_at: "2024-01-15T10:00:00Z", amount: 5 },
      { id: "2", created_at: "2024-01-15T14:00:00Z", amount: 3 },
      { id: "3", created_at: "2024-01-14T10:00:00Z", amount: 5 },
    ];

    const groups = groupByDate(txs);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2); // Jan 15
    expect(groups[1].items).toHaveLength(1); // Jan 14
  });

  it("handles empty transaction list", () => {
    const groups = groupByDate([]);
    expect(groups).toHaveLength(0);
  });

  it("single transaction = single group", () => {
    const txs = [{ id: "1", created_at: "2024-01-15T10:00:00Z", amount: 5 }];
    const groups = groupByDate(txs);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
  });
});
