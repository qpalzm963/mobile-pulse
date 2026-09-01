import { describe, expect, it } from "vitest";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  listPublishedArticles,
  getPublishedArticleBySlug,
  isPublishedArticleSlug,
  listPublishedTags,
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
        publishedAt: "2026.09.01",
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
        publishedAt: "2025.01.01",
        status: "published",
      },
    });

    await payload.create({
      collection: "articles",
      data: {
        title: "New Article",
        slug: slugNew,
        summary: "New",
        publishedAt: "2026.12.31",
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

  it("listPublishedTags() returns tags from Payload with article counts", async () => {
    const tags = await listPublishedTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0].id).toBe("all");
    expect(tags[0].count).toBeGreaterThan(0);
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
});
