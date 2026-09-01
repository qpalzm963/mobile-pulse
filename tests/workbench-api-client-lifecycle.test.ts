import { describe, expect, it } from "vitest";
import { PulseWorkbenchClient } from "../packages/api-client/src";
import { GET as getArticles, POST as createArticle, PATCH as updateArticle, DELETE as deleteArticle } from "../app/api/admin/cms-articles/route";
import { GET as getSubmissions } from "../app/api/submissions/route";
import { GET as getSubmissionDetail } from "../app/api/submissions/[id]/route";

/**
 * 建立一個自訂 fetchFn，將 PulseWorkbenchClient 的 HTTP 請求直接導向 Next.js App Router 的 Handler，
 * 用以進行真實資料庫的完整生命週期多輪複驗。
 */
function createRouteHandlerClient(apiToken?: string) {
  const customFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(urlString, "http://localhost:3000");
    const method = init?.method || "GET";
    const body = init?.body;
    const headers = new Headers(init?.headers);

    const req = new Request(url.toString(), {
      method,
      headers,
      body: body ? String(body) : undefined,
    });

    if (url.pathname === "/api/admin/cms-articles") {
      if (method === "GET") return getArticles(req);
      if (method === "POST") return createArticle(req);
      if (method === "PATCH") return updateArticle(req);
      if (method === "DELETE") return deleteArticle(req);
    }

    if (url.pathname === "/api/submissions") {
      if (method === "GET") return getSubmissions();
    }

    if (url.pathname.startsWith("/api/submissions/")) {
      const parts = url.pathname.split("/");
      const id = parts[parts.length - 1];
      if (method === "GET") {
        return getSubmissionDetail(req, { params: Promise.resolve({ id }) });
      }
    }

    return new Response(JSON.stringify({ error: `Not found: ${url.pathname}` }), { status: 404 });
  };

  return new PulseWorkbenchClient({
    baseUrl: "http://localhost:3000",
    apiToken,
    fetchFn: customFetch as unknown as typeof fetch,
  });
}

describe("工作台與 API Client 多輪複驗 (E2E Lifecycle Verification)", () => {
  const client = createRouteHandlerClient("test-admin-token");

  it("【第一輪複驗】文章完整生命週期：選題 ➔ 草稿 ➔ 審核 ➔ 發布 ➔ 編修 ➔ 刪除", async () => {
    const timestamp = Date.now();
    const slug = `e2e-test-article-${timestamp}`;

    // 1. 建立草稿
    const createRes = await client.createArticle({
      title: `E2E 測試文章 ${timestamp}`,
      slug,
      summary: "這是用於 E2E 複驗的測試文章摘要",
      eyebrow: "自動化測試",
      status: "draft",
      contentMarkdown: "# 初始內容\n\n這是第一輪複驗的初始內容。",
    });

    expect(createRes.success).toBe(true);
    expect(createRes.article).toBeDefined();
    const createdId = createRes.article!.id;
    expect(createdId).toBeDefined();

    // 2. 驗證能從 draft 列表中查詢到
    const draftListRes = await client.getArticles("draft");
    expect(draftListRes.success).toBe(true);
    const foundInDrafts = draftListRes.articles.find((a) => a.id === createdId || a.slug === slug);
    expect(foundInDrafts).toBeDefined();
    expect(foundInDrafts?.status).toBe("draft");

    // 3. 推進狀態：draft ➔ review
    const toReviewRes = await client.updateArticleStatus(createdId, "review");
    expect(toReviewRes.success).toBe(true);
    expect(toReviewRes.article?.status).toBe("review");

    // 4. 推進狀態：review ➔ published
    const toPublishedRes = await client.updateArticleStatus(createdId, "published");
    expect(toPublishedRes.success).toBe(true);
    expect(toPublishedRes.article?.status).toBe("published");

    // 5. 更新正文內容與標題
    const updateContentRes = await client.updateArticle(createdId, {
      title: `已發布文章 ${timestamp} (已編修)`,
      summary: "更新後的摘要",
      contentMarkdown: "# 已更新的大綱\n\n- 重點一\n- 重點二",
    });
    expect(updateContentRes.success).toBe(true);
    expect(updateContentRes.article?.title).toContain("(已編修)");

    // 6. 刪除測試文章
    const deleteRes = await client.deleteArticle(createdId);
    expect(deleteRes.success).toBe(true);

    // 7. 驗證已自列表移除
    const afterDeleteRes = await client.getArticles("all");
    const stillExists = afterDeleteRes.articles.some((a) => a.id === createdId || a.slug === slug);
    expect(stillExists).toBe(false);
  });

  it("【第二輪複驗】多狀態看板批次篩選與標籤匹配", async () => {
    const timestamp = Date.now();
    const prefix = `filter-test-${timestamp}`;

    // 建立 3 篇不同狀態的文章
    const res1 = await client.createArticle({
      title: `${prefix}-idea`,
      slug: `${prefix}-idea`,
      summary: "選題摘要",
      status: "idea",
      eyebrow: "選題庫",
    });
    const res2 = await client.createArticle({
      title: `${prefix}-draft`,
      slug: `${prefix}-draft`,
      summary: "草稿摘要",
      status: "draft",
      eyebrow: "撰稿中",
    });
    const res3 = await client.createArticle({
      title: `${prefix}-review`,
      slug: `${prefix}-review`,
      summary: "審核摘要",
      status: "review",
      eyebrow: "審核中",
    });

    expect(res1.success && res2.success && res3.success).toBe(true);

    // 依 status 篩選驗證
    const ideaRes = await client.getArticles("idea");
    expect(ideaRes.articles.some((a) => a.slug === `${prefix}-idea`)).toBe(true);
    expect(ideaRes.articles.some((a) => a.slug === `${prefix}-draft`)).toBe(false);

    const draftRes = await client.getArticles("draft");
    expect(draftRes.articles.some((a) => a.slug === `${prefix}-draft`)).toBe(true);
    expect(draftRes.articles.some((a) => a.slug === `${prefix}-review`)).toBe(false);

    const reviewRes = await client.getArticles("review");
    expect(reviewRes.articles.some((a) => a.slug === `${prefix}-review`)).toBe(true);

    // 清理 3 篇測試文章
    await Promise.all([
      client.deleteArticle(res1.article!.id),
      client.deleteArticle(res2.article!.id),
      client.deleteArticle(res3.article!.id),
    ]);
  });

  it("【第三輪複驗】異常防護與輸入容錯機制", async () => {
    // 1. 缺 ID 更新文章應拋出錯誤
    await expect(client.updateArticle("", { title: "No ID" })).rejects.toThrow();

    // 2. 缺 ID 刪除文章應拋出錯誤
    await expect(client.deleteArticle("")).rejects.toThrow();

    // 3. 獲取不存在的投稿應拋出錯誤
    await expect(client.getSubmission("99999999")).rejects.toThrow();
  });

  it("【第四輪複驗】投稿與審評系統 API 串接", async () => {
    const submissions = await client.getSubmissions();
    expect(Array.isArray(submissions)).toBe(true);

    if (submissions.length > 0) {
      const firstSub = submissions[0];
      // New submissions are routed by slug. Numeric values are reserved for
      // backward-compatible Drizzle legacyId lookup and must not be treated
      // as Payload's internal ID.
      const detail = await client.getSubmission(firstSub.slug, "test-reviewer-token");
      expect(detail).toBeDefined();
      expect(detail.title).toBeDefined();
      expect(detail.ratingStats).toBeDefined();
    }
  });
});
