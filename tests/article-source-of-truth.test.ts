import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  listPublishedArticles,
  getPublishedArticleBySlug,
  isPublishedArticleSlug,
  listPublishedTags,
  getHomePageData,
  formatDisplayDate,
} from "../lib/articles";
import { readArticleStats } from "../lib/analytics";

describe("Payload as Sole Article Source of Truth (Issue #5)", () => {
  it("listPublishedArticles() only returns articles with status = 'published'", async () => {
    const payload = await getPayload({ config });

    // Create a draft article
    const draftSlug = `test-draft-${Date.now()}`;
    await payload.create({
      collection: "articles",
      data: {
        title: "Test Draft Article",
        slug: draftSlug,
        summary: "Draft summary",
        status: "draft",
      },
    });

    // Create a review article
    const reviewSlug = `test-review-${Date.now()}`;
    await payload.create({
      collection: "articles",
      data: {
        title: "Test Review Article",
        slug: reviewSlug,
        summary: "Review summary",
        status: "review",
      },
    });

    const publishedArticles = await listPublishedArticles();
    const publishedSlugs = publishedArticles.map((a) => a.slug);

    expect(publishedSlugs).not.toContain(draftSlug);
    expect(publishedSlugs).not.toContain(reviewSlug);
  });

  it("getPublishedArticleBySlug() returns published article, but null for draft/review/nonexistent", async () => {
    const payload = await getPayload({ config });

    const publishedSlug = `test-pub-${Date.now()}`;
    await payload.create({
      collection: "articles",
      data: {
        title: "Test Published Article",
        slug: publishedSlug,
        summary: "Published summary",
        publishedAt: "2026-09-01T00:00:00.000Z",
        status: "published",
        contentMarkdown: "## Hello World Content",
      },
    });

    const draftSlug = `test-draft-2-${Date.now()}`;
    await payload.create({
      collection: "articles",
      data: {
        title: "Test Draft 2",
        slug: draftSlug,
        summary: "Draft 2",
        status: "draft",
      },
    });

    const published = await getPublishedArticleBySlug(publishedSlug);
    expect(published).not.toBeNull();
    expect(published?.title).toBe("Test Published Article");
    expect(published?.contentMarkdown).toBe("## Hello World Content");
    expect(published?.href).toBe(`/articles/${publishedSlug}`);

    const draft = await getPublishedArticleBySlug(draftSlug);
    expect(draft).toBeNull();

    const notFound = await getPublishedArticleBySlug("completely-nonexistent-slug");
    expect(notFound).toBeNull();
  });

  it("isPublishedArticleSlug() returns true for published, false for others", async () => {
    const payload = await getPayload({ config });

    const pubSlug = `test-is-pub-${Date.now()}`;
    await payload.create({
      collection: "articles",
      data: {
        title: "Is Pub Test",
        slug: pubSlug,
        summary: "Summary",
        status: "published",
      },
    });

    expect(await isPublishedArticleSlug(pubSlug)).toBe(true);
    expect(await isPublishedArticleSlug("nonexistent-slug-xyz")).toBe(false);
  });

  it("listPublishedArticles() sorts articles by publishedAt descending", async () => {
    const payload = await getPayload({ config });

    const slugOld = `test-sort-old-${Date.now()}`;
    const slugNew = `test-sort-new-${Date.now()}`;

    await payload.create({
      collection: "articles",
      data: {
        title: "Old Article",
        slug: slugOld,
        summary: "Old",
        publishedAt: "2025-01-01T00:00:00.000Z",
        status: "published",
      },
    });

    await payload.create({
      collection: "articles",
      data: {
        title: "New Article",
        slug: slugNew,
        summary: "New",
        publishedAt: "2026-12-31T00:00:00.000Z",
        status: "published",
      },
    });

    const articles = await listPublishedArticles();
    const indexNew = articles.findIndex((a) => a.slug === slugNew);
    const indexOld = articles.findIndex((a) => a.slug === slugOld);

    expect(indexNew).toBeGreaterThanOrEqual(0);
    expect(indexOld).toBeGreaterThanOrEqual(0);
    expect(indexNew).toBeLessThan(indexOld);
  });

  it("listPublishedTags() and getHomePageData() return tags with counts in single pass", async () => {
    const { articles, tags } = await getHomePageData();
    expect(articles.length).toBeGreaterThan(0);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0].id).toBe("all");
    expect(tags[0].count).toBe(articles.length);
  });

  it("formatDisplayDate() parses dates and strings into YYYY.MM.DD", () => {
    expect(formatDisplayDate("2026-08-20T12:00:00.000Z")).toBe("2026.08.20");
    expect(formatDisplayDate("2026.08.20")).toBe("2026.08.20");
    expect(formatDisplayDate(null)).toBe("近期發布");
  });

  it("readArticleStats() gets published articles from Payload", async () => {
    const stats = await readArticleStats();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);
    const first = stats[0];
    expect(first.slug).toBeDefined();
    expect(first.views).toBeDefined();
    expect(first.useful).toBeDefined();
  });

  it("regression: ensures old hardcoded article route directories are removed", () => {
    const removedDirs = [
      "app/(app)/articles/ai-agent-security-sandbox-audit/page.tsx",
      "app/(app)/articles/app-dev-weekly-2026-08-13/page.tsx",
      "app/(app)/articles/bruno-api-client-git-first/page.tsx",
      "app/(app)/articles/google-a2ui-agents-speak-ui/page.tsx",
    ];

    for (const file of removedDirs) {
      const fullPath = resolve(file);
      expect(existsSync(fullPath)).toBe(false);
    }
  });
});
