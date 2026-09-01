import { sql } from "drizzle-orm";
import { check, primaryKey, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// 匿名統計。兩張表都以 (article_slug, visitor_id) 為核心，彼此無外鍵關聯，
// 文章本體仍留在 app/articles/<slug>/page.tsx 的靜態檔案。
//
//   讀者瀏覽器 localStorage
//     visitor_id (UUID)
//          │
//          ├──► article_views      每人每篇每天最多一筆（UNIQUE 保證）
//          │      (slug, visitor, day) ── 重複寫入 ──► ON CONFLICT DO NOTHING
//          │
//          └──► article_feedback   每人每篇最多一筆（PRIMARY KEY 保證）
//                 (slug, visitor)  ── 改選 ──► ON CONFLICT DO UPDATE
//                                  ── 取消 ──► DELETE
//
// 唯一性一律由資料庫保證，不可用「先查再寫」實作：同一次重整的併發請求
// 會同時通過查詢、各自寫入一筆，瀏覽數就會灌水。

export const articleViews = sqliteTable(
  "article_views",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    articleSlug: text("article_slug").notNull(),
    visitorId: text("visitor_id").notNull(),
    // UTC 日期字串 YYYY-MM-DD。存 UTC 讓去重不受時區換算影響，
    // 管理頁顯示時才轉 Asia/Taipei。
    viewDay: text("view_day").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("article_views_slug_visitor_day").on(
      table.articleSlug,
      table.visitorId,
      table.viewDay
    ),
  ]
);

export const articleFeedback = sqliteTable(
  "article_feedback",
  {
    articleSlug: text("article_slug").notNull(),
    visitorId: text("visitor_id").notNull(),
    reaction: text("reaction", { enum: ["useful", "not_useful"] }).notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.articleSlug, table.visitorId] }),
    // API 層已擋掉非法值，這裡是防線二：任何未來的寫入路徑忘了驗證，
    // 資料表也不會存進第三種 reaction。
    check(
      "article_feedback_reaction",
      sql`${table.reaction} in ('useful', 'not_useful')`
    ),
  ]
);

// ── 組員投稿與匿名評審系統 ──────────────────────────────────────

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  authorAlias: text("author_alias").notNull().default("匿名組員"),
  tags: text("tags").notNull().default("[]"),
  status: text("status", { enum: ["draft", "reviewing", "approved", "published", "rejected"] })
    .notNull()
    .default("reviewing"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const submissionRatings = sqliteTable(
  "submission_ratings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    reviewerToken: text("reviewer_token").notNull(),
    priorKnowledge: text("prior_knowledge", { enum: ["new_knowledge", "familiar_surface", "already_expert"] })
      .notNull()
      .default("new_knowledge"),
    scoreDepth: integer("score_depth").notNull(), // 1 to 5
    scoreClarity: integer("score_clarity").notNull(), // 1 to 5
    scorePracticality: integer("score_practicality").notNull(), // 1 to 5
    generalFeedback: text("general_feedback"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("submission_ratings_sub_reviewer").on(
      table.submissionId,
      table.reviewerToken
    ),
    check("score_depth_check", sql`${table.scoreDepth} >= 1 and ${table.scoreDepth} <= 5`),
    check("score_clarity_check", sql`${table.scoreClarity} >= 1 and ${table.scoreClarity} <= 5`),
    check("score_practicality_check", sql`${table.scorePracticality} >= 1 and ${table.scorePracticality} <= 5`),
  ]
);

export const submissionAnnotations = sqliteTable("submission_annotations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  reviewerToken: text("reviewer_token").notNull(),
  selectedText: text("selected_text").notNull(),
  textOffsetStart: integer("text_offset_start").notNull(),
  textOffsetEnd: integer("text_offset_end").notNull(),
  comment: text("comment").notNull(),
  status: text("status", { enum: ["open", "resolved"] })
    .notNull()
    .default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

