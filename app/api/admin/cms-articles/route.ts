import { getPayload } from "payload";
import config from "@payload-config";
import { readArticleStats } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// OPTIONS: 支援 CORS Preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token, x-reviewer-token",
    },
  });
}

// GET: 取得所有文章、標籤與讀者統計數據
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = { equals: status };
    }

    const [articlesRes, tagsRes, stats] = await Promise.all([
      payload.find({
        collection: "articles",
        where: where as never,
        limit: 100,
        sort: "-updatedAt",
      }),
      payload.find({
        collection: "tags",
        limit: 50,
      }),
      readArticleStats().catch(() => []),
    ]);

    // Map stats by slug
    const statsMap = new Map(stats.map((s) => [s.slug, s]));

    const enrichedArticles = articlesRes.docs.map((art) => ({
      ...art,
      stats: statsMap.get(art.slug) || {
        views: 0,
        useful: 0,
        notUseful: 0,
        usefulRate: null,
        lastFeedbackAt: null,
      },
    }));

    return Response.json({
      success: true,
      articles: enrichedArticles,
      tags: tagsRes.docs,
      stats,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

// POST: 建立新文章
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = await getPayload({ config });

    const created = await (payload.create as (args: unknown) => Promise<unknown>)({
      collection: "articles",
      data: {
        title: body.title,
        slug: body.slug || `article-${Date.now()}`,
        summary: body.summary || body.title || "暫無摘要",
        contentMarkdown: body.contentMarkdown || `# ${body.title}\n\n`,
        status: body.status || "draft",
        tags: body.tags || [],
        eyebrow: body.eyebrow || "App 開發",
        author: body.author || "MOBILE PULSE 編輯部",
        readTime: body.readTime || "5 MIN READ",
        publishedAt: body.publishedAt || new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      },
    });

    return Response.json({ success: true, article: created });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

// PATCH: 更新文章狀態或內容
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) {
      return Response.json({ success: false, error: "Missing article id" }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const updated = await (payload.update as (args: unknown) => Promise<unknown>)({
      collection: "articles",
      id,
      data: updateData,
    });

    return Response.json({ success: true, article: updated });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

// DELETE: 刪除文章
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ success: false, error: "Missing article id" }, { status: 400 });
    }

    const payload = await getPayload({ config });
    await payload.delete({
      collection: "articles",
      id,
    });

    return Response.json({ success: true });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
