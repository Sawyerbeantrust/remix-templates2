import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "../server/utils/fetchWithRetry.js";

describe("fetchWithRetry", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns parsed JSON data on successful HTTP 200 response", async () => {
    const mockData = { success: true, message: "Hello Triton" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify(mockData),
    } as unknown as Response);

    const res = await fetchWithRetry("https://example.com/api/test", {}, { retries: 0 });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual(mockData);
  });

  it("retries on transient HTTP 503 error and succeeds on subsequent attempt", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 503,
          headers: new Headers({ "content-type": "text/plain" }),
          text: async () => "Service Unavailable",
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ recovered: true }),
      } as unknown as Response;
    });

    const res = await fetchWithRetry(
      "https://example.com/api/transient",
      {},
      { retries: 2, backoffMs: 10, jitter: false }
    );

    expect(callCount).toBe(2);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ recovered: true });
  });

  it("retries on HTTP 429 rate limit response", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ "content-type": "text/plain" }),
          text: async () => "Too Many Requests",
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ success: true }),
      } as unknown as Response;
    });

    const res = await fetchWithRetry(
      "https://example.com/api/ratelimited",
      {},
      { retries: 2, backoffMs: 10, jitter: false }
    );

    expect(callCount).toBe(3);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  it("handles non-JSON content-type gracefully without throwing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => "<html><body>Not JSON</body></html>",
    } as unknown as Response);

    const res = await fetchWithRetry("https://example.com/page.html", {}, { retries: 0 });

    expect(res.ok).toBe(true);
    expect(res.data).toBeNull();
    expect(res.text).toContain("Not JSON");
  });

  it("handles network failure / connection abort cleanly", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection dropped"));

    const res = await fetchWithRetry(
      "https://unreachable.domain.test",
      {},
      { retries: 1, backoffMs: 10, jitter: false }
    );

    expect(res.ok).toBe(false);
    expect(res.status).toBe(0);
    expect(res.error).toBe("Network connection dropped");
  });
});
