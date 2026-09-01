import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach } from "vitest";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getPayload } from "payload";
import payloadConfig from "../payload.config";
import { TAGS } from "../data/articles";
import { SEED_ARTICLES } from "../data/seed-articles";

// Ensure local storage directories exist
mkdirSync(resolve(".data"), { recursive: true });
mkdirSync(resolve("media"), { recursive: true });

// 必須在載入 ../db 之前設定：getDb() 讀這個變數決定資料庫位置。
// 因此下面用動態 import，靜態 import 會被提升到這行之前。
process.env.DATABASE_FILE = ":memory:";
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ADMIN_SESSION_SECRET = "test-session-secret";

const { getDb, openDbForMigration } = await import("../db");

// 跑的是與正式環境同一份 migration SQL，唯一約束與 CHECK 都真的存在。
// 用 openDbForMigration 而非 getDb：後者會檢查資料表存在，而此刻還沒建。
migrate(openDbForMigration(), { migrationsFolder: "./drizzle" });

// Seed / Sync Payload tags and seed articles
const payload = await getPayload({ config: payloadConfig });
const tagMap = new Map<string, number | string>();

for (const tag of TAGS) {
  if (tag.id === "all") continue;
  const existing = await payload.find({
    collection: "tags",
    where: { tagId: { equals: tag.id } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    tagMap.set(tag.id, existing.docs[0].id);
  } else {
    const created = await payload.create({
      collection: "tags",
      data: { tagId: tag.id, name: tag.label },
    });
    tagMap.set(tag.id, created.id);
  }
}

for (const art of SEED_ARTICLES) {
  const existing = await payload.find({
    collection: "articles",
    where: { slug: { equals: art.slug } },
    limit: 1,
  });

  const tagIds = art.tags.map((t) => tagMap.get(t)).filter(Boolean) as (number | string)[];
  const isoDate = art.publishedAt
    ? new Date(art.publishedAt.replace(/\./g, "-")).toISOString()
    : new Date().toISOString();

  if (existing.docs.length > 0) {
    const doc = existing.docs[0];
    await payload.update({
      collection: "articles",
      id: doc.id,
      data: {
        title: art.title,
        summary: art.summary,
        eyebrow: art.eyebrow,
        author: art.author || "MOBILE PULSE 編輯部",
        readTime: art.readTime || "5 MIN READ",
        publishedAt: isoDate,
        status: "published",
        tags: tagIds,
        contentMarkdown: art.contentMarkdown,
      },
    });
  } else {
    await payload.create({
      collection: "articles",
      data: {
        title: art.title,
        slug: art.slug,
        summary: art.summary,
        eyebrow: art.eyebrow,
        author: art.author || "MOBILE PULSE 編輯部",
        readTime: art.readTime || "5 MIN READ",
        publishedAt: isoDate,
        status: "published",
        tags: tagIds,
        contentMarkdown: art.contentMarkdown,
      },
    });
  }
}

// 測試之間清表，讓每個測試都從空資料開始，否則前一個測試留下的資料列
// 會讓後一個測試的計數與唯一性斷言失真。
beforeEach(() => {
  getDb().$client.exec("delete from article_views; delete from article_feedback; delete from submission_annotations; delete from submission_ratings; delete from submissions;");
});
