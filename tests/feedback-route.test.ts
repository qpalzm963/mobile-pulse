import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/articles/[slug]/feedback/route";
import { raw } from "./db";

const SLUG = "app-dev-weekly-2026-08-13";
const VISITOR = "11111111-2222-4333-8444-555555555555";
const OTHER_VISITOR = "99999999-2222-4333-8444-555555555555";

function post(slug: string, body: unknown) {
  return POST(
    new Request("https://example.com/api/articles/x/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug }) }
  );
}

function get(slug: string, visitorId?: string) {
  return GET(
    new Request("https://example.com/api/articles/x/feedback", {
      headers: visitorId ? { "x-visitor-id": visitorId } : {},
    }),
    { params: Promise.resolve({ slug }) }
  );
}

function rows() {
  return raw()
    .prepare("select article_slug, visitor_id, reaction from article_feedback order by visitor_id")
    .all();
}

describe("POST /api/articles/[slug]/feedback", () => {
  it("首次選擇會寫入一筆", async () => {
    const response = await post(SLUG, { visitorId: VISITOR, reaction: "useful" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reaction: "useful" });
    expect(rows()).toEqual([
      { article_slug: SLUG, visitor_id: VISITOR, reaction: "useful" },
    ]);
  });

  it("改選只會更新那一筆，不會變成兩筆", async () => {
    await post(SLUG, { visitorId: VISITOR, reaction: "useful" });
    await post(SLUG, { visitorId: VISITOR, reaction: "not_useful" });

    expect(rows()).toEqual([
      { article_slug: SLUG, visitor_id: VISITOR, reaction: "not_useful" },
    ]);
  });

  it("clear 會刪除該筆", async () => {
    await post(SLUG, { visitorId: VISITOR, reaction: "useful" });
    const response = await post(SLUG, { visitorId: VISITOR, reaction: "clear" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reaction: null });
    expect(rows()).toEqual([]);
  });

  it("對沒有回饋的文章 clear 不會出錯", async () => {
    const response = await post(SLUG, { visitorId: VISITOR, reaction: "clear" });

    expect(response.status).toBe(200);
    expect(rows()).toEqual([]);
  });

  it("不同讀者的選擇互不影響", async () => {
    await post(SLUG, { visitorId: VISITOR, reaction: "useful" });
    await post(SLUG, { visitorId: OTHER_VISITOR, reaction: "not_useful" });

    expect(rows()).toEqual([
      { article_slug: SLUG, visitor_id: VISITOR, reaction: "useful" },
      { article_slug: SLUG, visitor_id: OTHER_VISITOR, reaction: "not_useful" },
    ]);
  });

  it("非法 reaction 回 400 且不寫入", async () => {
    for (const reaction of ["maybe", "", null, 1, undefined]) {
      const response = await post(SLUG, { visitorId: VISITOR, reaction });
      expect(response.status).toBe(400);
    }

    expect(rows()).toEqual([]);
  });

  it("未列於 ARTICLES 的 slug 回 400 且不寫入", async () => {
    const response = await post("does-not-exist", {
      visitorId: VISITOR,
      reaction: "useful",
    });

    expect(response.status).toBe(400);
    expect(rows()).toEqual([]);
  });
});

describe("GET /api/articles/[slug]/feedback", () => {
  it("回傳這位讀者目前的選擇", async () => {
    await post(SLUG, { visitorId: VISITOR, reaction: "not_useful" });
    const response = await get(SLUG, VISITOR);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reaction: "not_useful" });
  });

  it("沒有選擇過時回 null", async () => {
    const response = await get(SLUG, VISITOR);

    expect(await response.json()).toEqual({ reaction: null });
  });

  it("只看得到自己的選擇，看不到別人的", async () => {
    await post(SLUG, { visitorId: OTHER_VISITOR, reaction: "useful" });
    const response = await get(SLUG, VISITOR);

    expect(await response.json()).toEqual({ reaction: null });
  });

  it("回應不含任何彙總票數", async () => {
    await post(SLUG, { visitorId: VISITOR, reaction: "useful" });
    await post(SLUG, { visitorId: OTHER_VISITOR, reaction: "useful" });

    const body = (await (await get(SLUG, VISITOR)).json()) as object;

    // 規格明訂總數只在管理端出現：公開端點洩漏票數，就等於把無法審核的
    // 負面計數公開展示。
    expect(Object.keys(body)).toEqual(["reaction"]);
  });

  it("回應標記為 no-store，不讓任何一層快取住個人選擇", async () => {
    const response = await get(SLUG, VISITOR);

    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("缺少或格式不符的 X-Visitor-Id 回 400", async () => {
    expect((await get(SLUG)).status).toBe(400);
    expect((await get(SLUG, "not-a-uuid")).status).toBe(400);
  });
});
