import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWithRetry } from "@/lib/supabase/fetch-retry";

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns response on first successful attempt", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockResponse));

    const res = await fetchWithRetry("https://example.com");
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("retries on ECONNRESET and succeeds on second attempt", async () => {
    const mockResponse = new Response("{}", { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("fetch failed — ECONNRESET"))
        .mockResolvedValueOnce(mockResponse),
    );

    const res = await fetchWithRetry("https://example.com");
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("retries on 'fetch failed' message", async () => {
    const mockResponse = new Response("{}", { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValueOnce(mockResponse),
    );

    const res = await fetchWithRetry("https://example.com");
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("throws after MAX_RETRIES (3) consecutive failures", async () => {
    const err = new TypeError("fetch failed — ECONNRESET");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    await expect(fetchWithRetry("https://example.com")).rejects.toThrow("ECONNRESET");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("does not retry on non-network errors (e.g. SyntaxError)", async () => {
    const err = new SyntaxError("Unexpected token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    await expect(fetchWithRetry("https://example.com")).rejects.toThrow("Unexpected token");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("does not retry on non-TypeError network errors", async () => {
    const err = new Error("Some other error");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    await expect(fetchWithRetry("https://example.com")).rejects.toThrow("Some other error");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("retries on socket hang up", async () => {
    const mockResponse = new Response("{}", { status: 200 });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("socket hang up"))
        .mockResolvedValueOnce(mockResponse),
    );

    const res = await fetchWithRetry("https://example.com");
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("passes init options through to fetch", async () => {
    const mockResponse = new Response("{}", { status: 201 });
    const mockFetch = vi.fn().mockResolvedValueOnce(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    await fetchWithRetry("https://example.com", { method: "POST", body: "data" });
    expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
      method: "POST",
      body: "data",
    });
  });
});
