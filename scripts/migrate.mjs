// 套用 drizzle 產出的 migration 到本機 SQLite 檔案。
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const file = process.env.DATABASE_FILE ?? ".data/mobile-pulse.sqlite";
mkdirSync(dirname(file), { recursive: true });

const sqlite = new Database(file);
sqlite.pragma("journal_mode = WAL");
migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
console.log(`migrations applied to ${file}`);
