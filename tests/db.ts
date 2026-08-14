import type BetterSqlite3 from "better-sqlite3";
import { getDb } from "../db";

/**
 * 測試用的原始 SQLite 連線，與應用程式共用同一個記憶體資料庫。
 *
 * 用來在測試裡直接塞資料或驗證結果，不必經過應用層 —— 這樣斷言才是在
 * 驗證資料庫的實際狀態，而不是在驗證應用層自己回報的狀態。
 */
export function raw(): BetterSqlite3.Database {
  return getDb().$client;
}
