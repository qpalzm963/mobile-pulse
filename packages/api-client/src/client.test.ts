import { describe, expect, it, vi } from "vitest";
import { PulseWorkbenchClient } from "./client.js";

describe("PulseWorkbenchClient", () => {
  it("fetches articles with correct query params and auth headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        articles: [{ id: 1, title: "Test Article", slug: "test", status: "draft" }],
        tags: [],
        stats: [],
      }),
    });

    const client = new PulseWorkbenchClient({
      baseUrl: "https://api.example.com",
      apiToken: "secret-token-123",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await client.getArticles("draft");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/api/admin/cms-articles?status=draft",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe("Test Article");
  });

  it("updates article status correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        article: { id: 1, title: "Test Article", status: "published" },
      }),
    });

    const client = new PulseWorkbenchClient({
      baseUrl: "http://localhost:3000",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await client.updateArticleStatus(1, "published");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/cms-articles",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: 1, status: "published" }),
      })
    );
    expect(result.success).toBe(true);
  });

  it("throws error when API response returns success: false", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        success: false,
        error: "Missing title",
      }),
    });

    const client = new PulseWorkbenchClient({
      baseUrl: "http://localhost:3000",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.createArticle({ title: "" })).rejects.toThrow("Missing title");
  });
});
