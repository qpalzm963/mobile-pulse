import { isKnownSlug } from "../../../../../data/articles";
import { getDb } from "../../../../../db";
import { articleViews } from "../../../../../db/schema";
import { readJson, readVisitorId, utcDay } from "../../../../../lib/request";

type Params = { params: Promise<{ slug: string }> };

/**
 * 記錄一次匿名瀏覽。同一 slug + visitor + UTC 日期只會有一筆，
 * 由資料庫的 UNIQUE 索引保證，重複請求交給 ON CONFLICT DO NOTHING 吸收。
 *
 * 一律回 204：不告訴呼叫端這次有沒有被計入，也不回傳任何讀者資料。
 */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!isKnownSlug(slug)) {
    return new Response(null, { status: 400 });
  }

  const visitorId = readVisitorId(await readJson(request));
  if (!visitorId) {
    return new Response(null, { status: 400 });
  }

  try {
    await getDb()
      .insert(articleViews)
      .values({ articleSlug: slug, visitorId, viewDay: utcDay() })
      .onConflictDoNothing();
  } catch (error) {
    // 用戶端是 fire-and-forget，收到 500 也不會做任何事。但這裡不能靜默吞掉：
    // 統計壞掉時站長只會看到數字停止成長，沒有其他線索。
    console.error("failed to record article view", error);
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
