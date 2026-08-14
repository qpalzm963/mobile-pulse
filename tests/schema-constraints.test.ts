import { describe, expect, it } from "vitest";
import { raw } from "./db";

// 規格把「每人每篇每天最多一筆」「每人每篇回饋最多一筆」定為資料庫責任，
// 不是應用層責任。這些測試守的就是那個決定：若有人日後把 UNIQUE 或
// PRIMARY KEY 從 schema 拿掉，改回「先查再寫」，這裡會紅。

const VIEW = "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)";
const FEEDBACK = "insert into article_feedback (article_slug, visitor_id, reaction) values (?, ?, ?)";

describe("資料庫連線", () => {
  it("getDb() 回傳可用的 SQLite handle", () => {
    expect(raw().prepare("select 1 as ok").get()).toEqual({ ok: 1 });
  });
});

describe("article_views 的唯一約束", () => {
  it("同一 slug + visitor + day 的第二筆會被資料庫擋下", () => {
    const insert = () => raw().prepare(VIEW).run("a", "v1", "2026-08-14");

    insert();
    expect(insert).toThrow(/UNIQUE/i);
  });

  it("換一天就是新的一筆", () => {
    raw().prepare(VIEW).run("a", "v1", "2026-08-14");
    raw().prepare(VIEW).run("a", "v1", "2026-08-15");

    expect(raw().prepare("select count(*) as n from article_views").get()).toEqual({ n: 2 });
  });
});

describe("article_feedback 的約束", () => {
  it("同一 slug + visitor 的第二筆會被主鍵擋下", () => {
    const insert = () => raw().prepare(FEEDBACK).run("a", "v1", "useful");

    insert();
    expect(insert).toThrow(/UNIQUE|PRIMARY/i);
  });

  it("reaction 只接受 useful 與 not_useful", () => {
    expect(() => raw().prepare(FEEDBACK).run("a", "v1", "maybe")).toThrow(/CHECK/i);
  });
});
