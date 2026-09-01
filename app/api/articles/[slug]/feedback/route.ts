import { and, eq, sql } from "drizzle-orm";
import { isPublishedArticleSlug } from "@/lib/articles";
import { getDb } from "../../../../../db";
import { articleFeedback } from "../../../../../db/schema";
import { readJson, readVisitorId } from "../../../../../lib/request";

type Params = { params: Promise<{ slug: string }> };

const REACTIONS = ["useful", "not_useful"] as const;
type Reaction = (typeof REACTIONS)[number];

function isReaction(value: unknown): value is Reaction {
  return REACTIONS.includes(value as Reaction);
}

// 讀者自己的選擇不得被任何一層快取住。
const PRIVATE = { "cache-control": "no-store" };

/**
 * 回傳這位匿名讀者目前的選擇，**不包含全站彙總票數**。
 *
 * visitorId 走 X-Visitor-Id 標頭而非 query string：query string 會讓這個
 * 匿名識別碼進入伺服器記錄與 referrer，違反規格的隱私限制。
 */
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug || !(await isPublishedArticleSlug(slug))) {
    return new Response(null, { status: 400 });
  }

  const visitorId = readVisitorId({
    visitorId: request.headers.get("x-visitor-id") ?? undefined,
  });
  if (!visitorId) {
    return new Response(null, { status: 400 });
  }

  try {
    const rows = await getDb()
      .select({ reaction: articleFeedback.reaction })
      .from(articleFeedback)
      .where(
        and(
          eq(articleFeedback.articleSlug, slug),
          eq(articleFeedback.visitorId, visitorId)
        )
      )
      .limit(1);

    return Response.json(
      { reaction: rows[0]?.reaction ?? null },
      { headers: PRIVATE }
    );
  } catch (error) {
    console.error("failed to read article feedback", error);
    return new Response(null, { status: 500 });
  }
}

/**
 * 寫入、改選或取消回饋。
 *
 * reaction 為 "clear" 時刪除該筆；useful/not_useful 走 upsert，
 * 同一讀者對同一篇文章永遠只有一筆（複合主鍵保證）。
 */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug || !(await isPublishedArticleSlug(slug))) {
    return new Response(null, { status: 400 });
  }

  const body = await readJson(request);
  const visitorId = readVisitorId(body);
  if (!visitorId) {
    return new Response(null, { status: 400 });
  }

  const reaction = (body as { reaction?: unknown }).reaction;
  if (reaction !== "clear" && !isReaction(reaction)) {
    return new Response(null, { status: 400 });
  }

  const db = getDb();
  const owner = and(
    eq(articleFeedback.articleSlug, slug),
    eq(articleFeedback.visitorId, visitorId)
  );

  try {
    if (reaction === "clear") {
      await db.delete(articleFeedback).where(owner);
      return Response.json({ reaction: null }, { headers: PRIVATE });
    }

    await db
      .insert(articleFeedback)
      .values({ articleSlug: slug, visitorId, reaction })
      .onConflictDoUpdate({
        target: [articleFeedback.articleSlug, articleFeedback.visitorId],
        set: { reaction, updatedAt: sql`CURRENT_TIMESTAMP` },
      });

    return Response.json({ reaction }, { headers: PRIVATE });
  } catch (error) {
    console.error("failed to write article feedback", error);
    return new Response(null, { status: 500 });
  }
}
