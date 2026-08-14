import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

/**
 * 資料庫檔案位置。預設放在專案的 .data/（已 gitignore）。
 *
 * 這是**相對於工作目錄**的路徑。以服務方式常駐時（launchd 預設 cwd 是 `/`）
 * 請設成絕對路徑，否則會在別的地方開出一個全新的空資料庫。
 */
const FILE = process.env.DATABASE_FILE ?? ".data/mobile-pulse.sqlite";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;
let schemaChecked = false;

function open() {
  if (!cached) {
    if (FILE !== ":memory:") mkdirSync(dirname(FILE), { recursive: true });
    const sqlite = new Database(FILE);
    // WAL 讓讀取不會被寫入擋住；統計是「讀多寫少」的形態。
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    cached = drizzle(sqlite, { schema });
  }

  return cached;
}

/**
 * 確認資料表存在。
 *
 * better-sqlite3 開啟不存在的檔案時會**建立一個空資料庫**，不會報錯。搭配
 * 相對路徑，從錯誤的工作目錄啟動的後果是：頁面正常、統計端點 500、而且悄悄
 * 在別處長出一個永遠是空的資料庫。與其讓它安靜地壞，不如在第一次用到時就
 * 明講路徑與修法。
 */
export function assertSchemaPresent(sqlite: Database.Database, file: string) {
  const found = sqlite
    .prepare("select name from sqlite_master where type = 'table' and name = 'article_views'")
    .get();

  if (!found) {
    throw new Error(
      `資料庫沒有 article_views 資料表：${resolve(file)}\n` +
        `若這不是你預期的位置，代表工作目錄不對 —— 請用絕對路徑設定 DATABASE_FILE。\n` +
        `若位置正確，請執行 npm run db:migrate。`
    );
  }
}

/** 供 migration 使用：不檢查資料表，因為它的工作就是把資料表建出來。 */
export function openDbForMigration() {
  return open();
}

export function getDb() {
  const db = open();

  if (!schemaChecked) {
    assertSchemaPresent(db.$client, FILE);
    schemaChecked = true;
  }

  return db;
}
