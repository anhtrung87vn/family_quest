import { test, expect } from "@playwright/test";

test.describe("Core navigation flow", () => {
  test("parent dashboard loads with expected elements", async ({ page }) => {
    await page.goto("/en/dashboard");
    // Should see the app name in header
    await expect(page.locator("header")).toBeVisible();
    // Should have navigation links
    await expect(page.getByText("Tasks")).toBeVisible();
    await expect(page.getByText("Rewards")).toBeVisible();
    await expect(page.getByText("Approvals")).toBeVisible();
  });

  test("child select page loads", async ({ page }) => {
    await page.goto("/en/child/select");
    // Should show the child selection UI
    await expect(page.locator("body")).toContainText("playing");
  });

  test("locale switch preserves navigation", async ({ page }) => {
    await page.goto("/en/dashboard");
    await expect(page.locator("header")).toBeVisible();
    // Navigate to Vietnamese
    await page.goto("/vi/dashboard");
    await expect(page.locator("header")).toBeVisible();
    // Vietnamese nav text
    await expect(page.getByText("Nhiệm vụ")).toBeVisible();
  });

  test("tasks page loads", async ({ page }) => {
    await page.goto("/en/tasks");
    await expect(page.getByText("New task")).toBeVisible();
  });

  test("rewards page loads", async ({ page }) => {
    await page.goto("/en/rewards");
    await expect(page.getByText("New reward")).toBeVisible();
  });

  test("family quests page loads", async ({ page }) => {
    await page.goto("/en/quests");
    await expect(page.getByText("Family Quests")).toBeVisible();
  });

  test("statistics page loads", async ({ page }) => {
    await page.goto("/en/stats");
    await expect(page.getByText("Statistics")).toBeVisible();
  });

  test("reflections page loads", async ({ page }) => {
    await page.goto("/en/reflections");
    await expect(page.getByText("Weekly Reflection")).toBeVisible();
  });

  test("offline page renders", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByText("offline")).toBeVisible();
  });
});
