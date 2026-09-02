import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { assertSchemaPresent } from "../db";

// better-sqlite3 開啟不存在的檔案會建立一個空資料庫而不報錯。相對路徑加上
// 錯誤的工作目錄（launchd 預設 cwd 是 /），結果是頁面正常、統計端點 500、
// 而且在別處長出一個永遠是空的資料庫。這個守衛把那種靜默失敗變成明確錯誤。

describe("assertSchemaPresent", () => {
  it("資料表齊全時不拋錯", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec("create table article_views (id integer primary key)");

    expect(() => assertSchemaPresent(sqlite, ":memory:")).not.toThrow();
  });

  it("空資料庫會拋錯", () => {
    expect(() => assertSchemaPresent(new Database(":memory:"), "x.sqlite")).toThrow(
      /article_views/
    );
  });

  it("錯誤訊息包含絕對路徑與修法，讓人知道該檢查什麼", () => {
    let message = "";
    try {
      assertSchemaPresent(new Database(":memory:"), ".data/mobile-pulse.sqlite");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    // 相對路徑會跟著工作目錄跑，錯誤訊息必須印出它實際解析到哪裡。
    expect(message).toMatch(/[\\/]/);
    expect(message).toContain("DATABASE_FILE");
    expect(message).toContain("db:migrate");
  });
});
