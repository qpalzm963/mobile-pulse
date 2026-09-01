import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach } from "vitest";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getPayload } from "payload";
import payloadConfig from "../payload.config";
import { ARTICLES, TAGS } from "../data/articles";

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

// Seed Payload tags and articles if empty
const payload = await getPayload({ config: payloadConfig });
const tagCount = await payload.count({ collection: "tags" });
if (tagCount.totalDocs === 0) {
  const tagMap = new Map<string, number | string>();
  for (const tag of TAGS) {
    if (tag.id === "all") continue;
    const created = await payload.create({
      collection: "tags",
      data: { tagId: tag.id, name: tag.label },
    });
    tagMap.set(tag.id, created.id);
  }

  const artCount = await payload.count({ collection: "articles" });
  if (artCount.totalDocs === 0) {
    for (const art of ARTICLES) {
      const tagIds = art.tags.map((t) => tagMap.get(t)).filter(Boolean) as (number | string)[];
      await payload.create({
        collection: "articles",
        data: {
          title: art.title,
          slug: art.slug,
          summary: art.summary,
          eyebrow: art.eyebrow,
          author: art.author,
          readTime: art.readTime,
          publishedAt: art.publishedAt,
          status: "published",
          interactiveComponent: art.interactiveComponent,
          tags: tagIds,
          contentMarkdown: `# ${art.title}\n\n${art.summary}`,
        },
      });
    }
  }
}

// 測試之間清表，讓每個測試都從空資料開始，否則前一個測試留下的資料列
// 會讓後一個測試的計數與唯一性斷言失真。
beforeEach(() => {
  getDb().$client.exec("delete from article_views; delete from article_feedback; delete from submission_annotations; delete from submission_ratings; delete from submissions;");
});
