import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { POST } from "../app/api/articles/[slug]/view/route";

const SLUG = "app-dev-weekly-2026-08-13";
const VISITOR = "11111111-2222-4333-8444-555555555555";
const OTHER_VISITOR = "99999999-2222-4333-8444-555555555555";

function post(slug: string, body: unknown) {
  return POST(
    new Request("https://example.com/api/articles/x/view", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug }) }
  );
}

async function countViews() {
  const { results } = await env.DB.prepare(
    "select count(*) as n from article_views"
  ).all<{ n: number }>();
  return results[0].n;
}

describe("POST /api/articles/[slug]/view", () => {
  it("首次瀏覽記一筆", async () => {
    const response = await post(SLUG, { visitorId: VISITOR });

    expect(response.status).toBe(204);
    expect(await countViews()).toBe(1);
  });

  it("同一天重整五次仍然只有一筆", async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await post(SLUG, { visitorId: VISITOR });
      expect(response.status).toBe(204);
    }

    expect(await countViews()).toBe(1);
  });

  it("兩個併發請求也只會留下一筆", async () => {
    // 「先查再寫」的實作會在這裡寫入兩筆：兩個請求都查到沒有資料列。
    const responses = await Promise.all([
      post(SLUG, { visitorId: VISITOR }),
      post(SLUG, { visitorId: VISITOR }),
    ]);

    expect(responses.map((r) => r.status)).toEqual([204, 204]);
    expect(await countViews()).toBe(1);
  });

  it("不同訪客各記一筆", async () => {
    await post(SLUG, { visitorId: VISITOR });
    await post(SLUG, { visitorId: OTHER_VISITOR });

    expect(await countViews()).toBe(2);
  });

  it("隔日再訪會是新的一筆", async () => {
    await post(SLUG, { visitorId: VISITOR });
    // 直接寫入前一天的資料列，模擬昨天已經來過。
    await env.DB.prepare(
      "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)"
    )
      .bind(SLUG, VISITOR, "2020-01-01")
      .run();

    expect(await countViews()).toBe(2);
  });

  it("未列於 ARTICLES 的 slug 回 400 且不寫入", async () => {
    const response = await post("does-not-exist", { visitorId: VISITOR });

    expect(response.status).toBe(400);
    expect(await countViews()).toBe(0);
  });

  it("visitorId 缺失或格式不符回 400 且不寫入", async () => {
    for (const body of [{}, { visitorId: "" }, { visitorId: "not-a-uuid" }, null]) {
      const response = await post(SLUG, body);
      expect(response.status).toBe(400);
    }

    expect(await countViews()).toBe(0);
  });

  it("body 不是合法 JSON 時回 400 而不是拋例外", async () => {
    const response = await POST(
      new Request("https://example.com/api/articles/x/view", {
        method: "POST",
        body: "{ 壞掉的 json",
      }),
      { params: Promise.resolve({ slug: SLUG }) }
    );

    expect(response.status).toBe(400);
  });
});
