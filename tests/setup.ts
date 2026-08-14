import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

// 每個測試檔啟動時把 drizzle 的 migration 套到該檔專屬的記憶體 D1。
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// @cloudflare/vitest-pool-workers 0.21（vitest v4 改寫版）已移除 isolatedStorage，
// 測試之間的寫入不會自動回捲。這裡明確清表，讓每個測試都從空資料開始，
// 否則前一個測試留下的資料列會讓後一個測試的計數與唯一性斷言失真。
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("delete from article_views"),
    env.DB.prepare("delete from article_feedback"),
  ]);
});
