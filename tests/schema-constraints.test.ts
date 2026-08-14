import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { getDb } from "../db";

// 規格把「每人每篇每天最多一筆」「每人每篇回饋最多一筆」定為資料庫責任，
// 不是應用層責任。這些測試守的就是那個決定：若有人日後把 UNIQUE 或
// PRIMARY KEY 從 schema 拿掉，改回「先查再寫」，這裡會紅。

describe("getDb()", () => {
  it("在 Workers 執行環境回傳可用的 D1 handle", async () => {
    const db = getDb();
    const rows = await db.$client.prepare("select 1 as ok").all();
    expect(rows.results).toEqual([{ ok: 1 }]);
  });
});

describe("article_views 的唯一約束", () => {
  it("同一 slug + visitor + day 的第二筆會被資料庫擋下", async () => {
    const insert = () =>
      env.DB.prepare(
        "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)"
      )
        .bind("a", "v1", "2026-08-14")
        .run();

    await insert();
    await expect(insert()).rejects.toThrow(/UNIQUE/i);
  });

  it("換一天就是新的一筆", async () => {
    await env.DB.prepare(
      "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)"
    )
      .bind("a", "v1", "2026-08-14")
      .run();
    await env.DB.prepare(
      "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)"
    )
      .bind("a", "v1", "2026-08-15")
      .run();

    const { results } = await env.DB.prepare(
      "select count(*) as n from article_views"
    ).all();
    expect(results[0]).toEqual({ n: 2 });
  });
});

describe("article_feedback 的約束", () => {
  it("同一 slug + visitor 的第二筆會被主鍵擋下", async () => {
    const insert = () =>
      env.DB.prepare(
        "insert into article_feedback (article_slug, visitor_id, reaction) values (?, ?, ?)"
      )
        .bind("a", "v1", "useful")
        .run();

    await insert();
    await expect(insert()).rejects.toThrow(/UNIQUE|PRIMARY/i);
  });

  it("reaction 只接受 useful 與 not_useful", async () => {
    await expect(
      env.DB.prepare(
        "insert into article_feedback (article_slug, visitor_id, reaction) values (?, ?, ?)"
      )
        .bind("a", "v1", "maybe")
        .run()
    ).rejects.toThrow(/CHECK/i);
  });
});
