import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

/** 資料庫檔案位置。預設放在專案的 .data/，該目錄已加入 .gitignore。 */
const FILE = process.env.DATABASE_FILE ?? ".data/mobile-pulse.sqlite";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * 取得資料庫連線（同一個行程共用一個）。
 *
 * 自架在單一台機器上，SQLite 檔案就足夠：schema 與 migration 與先前的 D1
 * 版本完全相同（同為 sqlite dialect），不需要任何轉換。
 */
export function getDb() {
  if (!cached) {
    mkdirSync(dirname(FILE), { recursive: true });
    const sqlite = new Database(FILE);
    // WAL 讓讀取不會被寫入擋住；統計是「讀多寫少」的形態。
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    cached = drizzle(sqlite, { schema });
  }

  return cached;
}
