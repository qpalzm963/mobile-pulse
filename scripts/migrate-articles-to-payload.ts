import { getPayload } from "payload";
import config from "../payload.config";
import { TAGS } from "../data/articles";
import { SEED_ARTICLES } from "../data/seed-articles";

function toIsoDate(dateVal: unknown): string {
  if (!dateVal) return new Date().toISOString();
  if (typeof dateVal === "string") {
    const formatted = dateVal.replace(/\./g, "-");
    const parsed = new Date(formatted);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toISOString();
  }
  return new Date().toISOString();
}

async function run() {
  console.log("🚀 Initializing Payload...");
  const payload = await getPayload({ config });

  console.log("📦 1. Migrating Tags...");
  const tagMap = new Map<string, number | string>();

  for (const tag of TAGS) {
    if (tag.id === "all") continue;
    const existing = await payload.find({
      collection: "tags",
      where: {
        tagId: { equals: tag.id },
      },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      tagMap.set(tag.id, existing.docs[0].id);
      console.log(`  ✓ Tag already exists: ${tag.label} (${tag.id})`);
    } else {
      const created = await payload.create({
        collection: "tags",
        data: {
          tagId: tag.id,
          name: tag.label,
        },
      });
      tagMap.set(tag.id, created.id);
      console.log(`  + Created tag: ${tag.label} (${tag.id})`);
    }
  }

  console.log("👤 2. Checking Admin User...");
  const existingUsers = await payload.find({
    collection: "users",
    where: {
      email: { equals: "admin@mobilepulse.dev" },
    },
    limit: 1,
  });

  if (existingUsers.docs.length === 0) {
    await payload.create({
      collection: "users",
      data: {
        email: "admin@mobilepulse.dev",
        password: process.env.ADMIN_PASSWORD || "AdminPulse2026!",
        name: "Mobile Pulse Admin",
        role: "admin",
      },
    });
    console.log("  + Created default admin user: admin@mobilepulse.dev");
  } else {
    console.log("  ✓ Admin user exists: admin@mobilepulse.dev");
  }

  console.log("📰 3. Migrating Articles (Upserting Full Rich Content)...");
  for (const article of SEED_ARTICLES) {
    const existing = await payload.find({
      collection: "articles",
      where: {
        slug: { equals: article.slug },
      },
      limit: 1,
    });

    const relatedTagIds = article.tags
      .map((t) => tagMap.get(t))
      .filter((id): id is number | string => id !== undefined);

    const isoDate = toIsoDate(article.publishedAt);

    if (existing.docs.length > 0) {
      const doc = existing.docs[0];
      const existingMarkdown = (doc.contentMarkdown as string) || "";
      const isPlaceholder =
        !existingMarkdown ||
        existingMarkdown.includes("本文已同步遷移至 Payload CMS") ||
        existingMarkdown.length < 200;

      await payload.update({
        collection: "articles",
        id: doc.id,
        data: {
          title: article.title,
          summary: article.summary,
          eyebrow: article.eyebrow || (doc.eyebrow as string) || null,
          author: article.author || (doc.author as string) || "MOBILE PULSE 編輯部",
          readTime: article.readTime || (doc.readTime as string) || "5 MIN READ",
          publishedAt: isoDate,
          status: "published",
          tags: relatedTagIds,
          ...(isPlaceholder ? { contentMarkdown: article.contentMarkdown } : {}),
        },
      });
      console.log(`  ✓ Updated existing article with ISO date and verified content: ${article.title} (${article.slug})`);
    } else {
      await payload.create({
        collection: "articles",
        data: {
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          eyebrow: article.eyebrow,
          publishedAt: isoDate,
          status: "published",
          author: article.author || "MOBILE PULSE 編輯部",
          readTime: article.readTime || "5 MIN READ",
          tags: relatedTagIds,
          contentMarkdown: article.contentMarkdown,
        },
      });
      console.log(`  + Created article with full rich content: ${article.title} (${article.slug})`);
    }
  }

  console.log("✨ Migration and Content Verification completed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
