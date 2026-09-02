import Database from "better-sqlite3";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

export interface MigrationResult {
  columnAdded: boolean;
  totalProcessed: number;
  backfilledCount: number;
  duplicatesRemoved: number;
  uniqueIndexCreated: boolean;
}

/**
 * Migration script for production/development Payload SQLite database:
 * 1. Safely checks and adds `review_key` column to `submission_reviews` table if missing.
 * 2. Backfills all existing review records with `${submission_id}:${reviewer_token}`.
 * 3. Identifies and deduplicates any existing duplicate ratings (keeps most recent update/record).
 * 4. Ensures DB-level unique index `submission_reviews_review_key_idx` is active on SQLite.
 */
export function migratePayloadReviewsReviewKey(dbPath?: string): MigrationResult {
  const targetPath =
    dbPath ||
    (process.env.PAYLOAD_DATABASE_FILE
      ? process.env.PAYLOAD_DATABASE_FILE.startsWith("/")
        ? process.env.PAYLOAD_DATABASE_FILE
        : path.resolve(process.cwd(), process.env.PAYLOAD_DATABASE_FILE)
      : path.resolve(process.cwd(), ".data/cms.sqlite"));

  if (targetPath !== ":memory:") {
    const dir = path.dirname(targetPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(targetPath);
  db.pragma("journal_mode = WAL");

  let columnAdded = false;
  let backfilledCount = 0;
  let duplicatesRemoved = 0;
  let uniqueIndexCreated = false;

  // 1. Check if submission_reviews table exists
  const tableCheck = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='submission_reviews'")
    .get();

  if (!tableCheck) {
    console.log("ℹ️ Table submission_reviews does not exist yet. Migration skipped.");
    return {
      columnAdded: false,
      totalProcessed: 0,
      backfilledCount: 0,
      duplicatesRemoved: 0,
      uniqueIndexCreated: false,
    };
  }

  // 2. Check if review_key column exists
  const columns = db.prepare("PRAGMA table_info(submission_reviews)").all() as Array<{
    name: string;
  }>;
  const hasReviewKey = columns.some((c) => c.name === "review_key");

  if (!hasReviewKey) {
    console.log("➕ Adding review_key column to submission_reviews table...");
    db.prepare("ALTER TABLE submission_reviews ADD COLUMN review_key TEXT").run();
    columnAdded = true;
  }

  // 3. Query all records and detect/resolve duplicates
  const rows = db.prepare("SELECT * FROM submission_reviews ORDER BY id ASC").all() as Array<{
    id: number | string;
    submission_id: number | string;
    reviewer_token: string;
    review_key: string | null;
    created_at?: string;
    updated_at?: string;
  }>;

  // Group by submission_id + reviewer_token
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.submission_id}:${row.reviewer_token}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  const deleteStmt = db.prepare("DELETE FROM submission_reviews WHERE id = ?");
  const updateKeyStmt = db.prepare("UPDATE submission_reviews SET review_key = ? WHERE id = ?");

  const runTx = db.transaction(() => {
    for (const [key, group] of groups.entries()) {
      if (group.length > 1) {
        // Resolve duplicates: keep the most recently updated or highest id row
        group.sort((a, b) => {
          const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return Number(b.id) - Number(a.id);
        });

        const keepDoc = group[0];
        const duplicates = group.slice(1);

        for (const dup of duplicates) {
          deleteStmt.run(dup.id);
          duplicatesRemoved++;
          console.log(`  🗑️ Removed duplicate review ID ${dup.id} for key ${key}`);
        }

        if (keepDoc.review_key !== key) {
          updateKeyStmt.run(key, keepDoc.id);
          backfilledCount++;
        }
      } else {
        const single = group[0];
        if (single.review_key !== key) {
          updateKeyStmt.run(key, single.id);
          backfilledCount++;
        }
      }
    }

    // 4. Ensure Unique Index exists
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS submission_reviews_review_key_idx
      ON submission_reviews (review_key)
    `).run();
    uniqueIndexCreated = true;
  });

  runTx();

  console.log(
    `✨ migratePayloadReviewsReviewKey complete: ${backfilledCount} backfilled, ${duplicatesRemoved} duplicates resolved, unique index active.`
  );

  return {
    columnAdded,
    totalProcessed: rows.length,
    backfilledCount,
    duplicatesRemoved,
    uniqueIndexCreated,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migratePayloadReviewsReviewKey();
}
