import { sql } from "drizzle-orm";
import { listPublishedArticles } from "./articles";
import { getDb } from "../db";

export type ArticleStats = {
  slug: string;
  title: string;
  publishedAt: string;
  views: number;
  useful: number;
  notUseful: number;
  /** 有用 ÷ 總回饋。完全沒有回饋時是 null，不是 0 —— 兩者意思完全不同。 */
  usefulRate: number | null;
  /** UTC 字串。呈現時才轉 Asia/Taipei。 */
  lastFeedbackAt: string | null;
};

/**
 * 把資料庫的 UTC 時間字串轉成台北時間顯示。
 *
 * SQLite 的 CURRENT_TIMESTAMP 產生 'YYYY-MM-DD HH:MM:SS' 且內容是 UTC，
 * 但字串本身沒有任何時區標記。直接丟給 Date 會被當成執行環境的本地時間，
 * 站長會看到差 8 小時的「最近回饋時間」而且不會有任何錯誤。
 */
export function formatTaipei(utcTimestamp: string | null): string {
  if (!utcTimestamp) return "—";

  const date = new Date(`${utcTimestamp.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "—";

  return (
    new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(date)
      // 不同執行環境的 ICU 會用不同的空白字元分隔日期與時間（Node 的 ICU 78
      // 用 U+2009 thin space，workerd 用一般空格）。統一成普通空格，輸出才
      // 不會隨執行環境或 ICU 升級而改變。
      .replace(/\p{Zs}/gu, " ")
  );
}

type ViewRow = { article_slug: string; views: number };
type FeedbackRow = {
  article_slug: string;
  useful: number;
  not_useful: number;
  last_feedback_at: string | null;
};

/**
 * 每篇文章一列，以 Payload published articles 為準：
 * 還沒有任何瀏覽或回饋的文章也必須出現在管理頁，否則新文章會憑空消失，
 * 站長無法分辨「沒人看」與「統計壞了」。
 */
export async function readArticleStats(): Promise<ArticleStats[]> {
  const db = getDb();

  const [articles, viewRows, feedbackRows] = await Promise.all([
    listPublishedArticles(),
    db.all<ViewRow>(sql`
      select article_slug, count(*) as views
      from article_views
      group by article_slug
    `),
    db.all<FeedbackRow>(sql`
      select article_slug,
             sum(case when reaction = 'useful' then 1 else 0 end) as useful,
             sum(case when reaction = 'not_useful' then 1 else 0 end) as not_useful,
             max(updated_at) as last_feedback_at
      from article_feedback
      group by article_slug
    `),
  ]);

  const views = new Map(viewRows.map((row) => [row.article_slug, row.views]));
  const feedback = new Map(feedbackRows.map((row) => [row.article_slug, row]));

  return articles.map((article) => {
    const row = feedback.get(article.slug);
    const useful = row?.useful ?? 0;
    const notUseful = row?.not_useful ?? 0;
    const total = useful + notUseful;

    return {
      slug: article.slug,
      title: article.title,
      publishedAt: article.publishedAt,
      views: views.get(article.slug) ?? 0,
      useful,
      notUseful,
      usefulRate: total === 0 ? null : useful / total,
      lastFeedbackAt: row?.last_feedback_at ?? null,
    };
  });
}
