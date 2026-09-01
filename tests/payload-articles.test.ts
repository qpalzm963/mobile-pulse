import { describe, expect, it } from "vitest";
import { getPayload } from "payload";
import config from "../payload.config";

describe("Payload CMS Integration", () => {
  it("should initialize Payload and retrieve published articles", async () => {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "articles",
      where: {
        status: { equals: "published" },
      },
    });

    expect(result.docs.length).toBeGreaterThan(0);
    const firstArticle = result.docs[0];
    expect(firstArticle.title).toBeDefined();
    expect(firstArticle.slug).toBeDefined();
    expect(firstArticle.status).toBe("published");
  });

  it("should find tags in Payload", async () => {
    const payload = await getPayload({ config });
    const tags = await payload.find({
      collection: "tags",
    });

    expect(tags.docs.length).toBeGreaterThan(0);
    const tagIds = tags.docs.map((t) => t.tagId);
    expect(tagIds).toContain("ai");
    expect(tagIds).toContain("engineering");
  });
});
