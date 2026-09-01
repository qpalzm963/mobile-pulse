import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach } from "vitest";

// 必須在載入 ../db 之前設定：getDb() 讀這個變數決定資料庫位置。
// 因此下面用動態 import，靜態 import 會被提升到這行之前。
process.env.DATABASE_FILE = ":memory:";
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ADMIN_SESSION_SECRET = "test-session-secret";

const { getDb, openDbForMigration } = await import("../db");

// 跑的是與正式環境同一份 migration SQL，唯一約束與 CHECK 都真的存在。
// 用 openDbForMigration 而非 getDb：後者會檢查資料表存在，而此刻還沒建。
migrate(openDbForMigration(), { migrationsFolder: "./drizzle" });

// 測試之間清表，讓每個測試都從空資料開始，否則前一個測試留下的資料列
// 會讓後一個測試的計數與唯一性斷言失真。
beforeEach(() => {
  getDb().$client.exec("delete from article_views; delete from article_feedback; delete from submission_annotations; delete from submission_ratings; delete from submissions;");
});
