import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { GET as analytics } from "../app/api/admin/analytics/route";
import { POST as login } from "../app/api/admin/login/route";
import { POST as logout } from "../app/api/admin/logout/route";
import { SESSION_COOKIE, createSessionToken } from "../lib/admin-session";

const PASSWORD = "test-admin-password";
const SECRET = "test-session-secret";
const SLUG = "app-dev-weekly-2026-08-13";
const VISITOR = "11111111-2222-4333-8444-555555555555";
const OTHER_VISITOR = "99999999-2222-4333-8444-555555555555";

function loginWith(password: unknown) {
  return login(
    new Request("https://example.com/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    })
  );
}

function analyticsWith(cookie?: string) {
  return analytics(
    new Request("https://example.com/api/admin/analytics", {
      headers: cookie ? { cookie } : {},
    })
  );
}

async function validCookie() {
  return `${SESSION_COOKIE}=${await createSessionToken(SECRET)}`;
}

describe("POST /api/admin/login", () => {
  it("正確密碼回 204 並設定 cookie", async () => {
    const response = await loginWith(PASSWORD);
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(204);
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toContain("Path=/;");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("錯誤密碼回 401 且完全不設 cookie", async () => {
    for (const password of ["wrong", "", null, undefined, 42]) {
      const response = await loginWith(password);
      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });
});

describe("POST /api/admin/logout", () => {
  it("清除 cookie", async () => {
    const response = await logout();

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("GET /api/admin/analytics", () => {
  it("未登入回 401", async () => {
    expect((await analyticsWith()).status).toBe(401);
  });

  it("竄改過的 cookie 回 401", async () => {
    const token = await createSessionToken(SECRET);
    const [expiresAt] = token.split(".");

    expect(
      (await analyticsWith(`${SESSION_COOKIE}=${expiresAt}.forged`)).status
    ).toBe(401);
  });

  it("登入後才拿得到資料", async () => {
    const response = await analyticsWith(await validCookie());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("login 設下的 cookie 真的能通過 analytics 的驗證", async () => {
    // 這條守的是 cookie 的 Path：若寫成 Path=/admin，瀏覽器根本不會把
    // cookie 送到 /api/admin/analytics，登入成功卻永遠 401。
    const setCookie = (await loginWith(PASSWORD)).headers.get("set-cookie") ?? "";
    const value = setCookie.split(";")[0];

    expect((await analyticsWith(value)).status).toBe(200);
  });

  it("沒有任何資料時仍列出每篇文章，計數為 0、有用率為 null", async () => {
    const body = (await (await analyticsWith(await validCookie())).json()) as {
      articles: Array<Record<string, unknown>>;
    };

    expect(body.articles).toHaveLength(1);
    expect(body.articles[0]).toMatchObject({
      slug: SLUG,
      views: 0,
      useful: 0,
      notUseful: 0,
      usefulRate: null,
      lastFeedbackAt: null,
    });
  });

  it("正確彙總瀏覽、有用、沒用與有用率", async () => {
    await env.DB.batch([
      env.DB.prepare(
        "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)"
      ).bind(SLUG, VISITOR, "2026-08-14"),
      env.DB.prepare(
        "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)"
      ).bind(SLUG, OTHER_VISITOR, "2026-08-14"),
      env.DB.prepare(
        "insert into article_views (article_slug, visitor_id, view_day) values (?, ?, ?)"
      ).bind(SLUG, VISITOR, "2026-08-15"),
      env.DB.prepare(
        "insert into article_feedback (article_slug, visitor_id, reaction) values (?, ?, ?)"
      ).bind(SLUG, VISITOR, "useful"),
      env.DB.prepare(
        "insert into article_feedback (article_slug, visitor_id, reaction) values (?, ?, ?)"
      ).bind(SLUG, OTHER_VISITOR, "not_useful"),
    ]);

    const body = (await (await analyticsWith(await validCookie())).json()) as {
      articles: Array<Record<string, unknown>>;
    };

    expect(body.articles[0]).toMatchObject({
      views: 3,
      useful: 1,
      notUseful: 1,
      usefulRate: 0.5,
    });
    expect(body.articles[0].lastFeedbackAt).toBeTruthy();
  });
});
