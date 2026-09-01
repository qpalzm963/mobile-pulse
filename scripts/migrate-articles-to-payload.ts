import { getPayload } from "payload";
import config from "../payload.config";
import { ARTICLES, TAGS } from "../data/articles";

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

  console.log("📰 3. Migrating Articles...");
  for (const article of ARTICLES) {
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

    if (existing.docs.length > 0) {
      console.log(`  ✓ Article already exists: ${article.title} (${article.slug})`);
    } else {
      await payload.create({
        collection: "articles",
        data: {
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          publishedAt: article.publishedAt,
          status: "published",
          author: "MOBILE PULSE 編輯部",
          readTime: "6 MIN READ",
          tags: relatedTagIds as any,
          contentMarkdown: `# ${article.title}\n\n${article.summary}\n\n:::callout type="tip"\n本文已同步遷移至 Payload CMS 動態內容系統。\n:::\n`,
        },
      });
      console.log(`  + Created article: ${article.title} (${article.slug})`);
    }
  }

  console.log("✨ Migration completed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
