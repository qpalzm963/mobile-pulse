import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clearedSessionCookieHeader,
  createSessionToken,
  isValidSessionToken,
  readSessionToken,
  sessionCookieHeader,
  verifyPassword,
} from "../lib/admin-session";

const SECRET = "session-secret-from-deployment";
const PASSWORD = "correct horse battery staple";

describe("verifyPassword", () => {
  it("接受正確密碼", async () => {
    expect(await verifyPassword(SECRET, PASSWORD, PASSWORD)).toBe(true);
  });

  it("拒絕錯誤密碼、空字串與非字串", async () => {
    for (const provided of [
      "wrong",
      PASSWORD.slice(0, -1),
      `${PASSWORD} `,
      "",
      null,
      undefined,
      123,
      { toString: () => PASSWORD },
    ]) {
      expect(await verifyPassword(SECRET, PASSWORD, provided)).toBe(false);
    }
  });
});

describe("session token", () => {
  it("剛簽發的 token 有效", async () => {
    const token = await createSessionToken(SECRET);
    expect(await isValidSessionToken(SECRET, token)).toBe(true);
  });

  it("過期的 token 無效", async () => {
    const issuedAt = Date.now() - SESSION_TTL_MS - 1000;
    const token = await createSessionToken(SECRET, issuedAt);

    expect(await isValidSessionToken(SECRET, token)).toBe(false);
  });

  it("竄改到期時間會讓簽章對不上", async () => {
    const token = await createSessionToken(SECRET);
    const [, signature] = token.split(".");
    const farFuture = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;

    // 攻擊者把有效期往後改，但簽章是對舊的有效期簽的。
    expect(
      await isValidSessionToken(SECRET, `${farFuture}.${signature}`)
    ).toBe(false);
  });

  it("竄改簽章無效", async () => {
    const token = await createSessionToken(SECRET);
    const [expiresAt] = token.split(".");

    expect(await isValidSessionToken(SECRET, `${expiresAt}.xxxx`)).toBe(false);
  });

  it("用別的 secret 簽出來的 token 無效", async () => {
    const token = await createSessionToken("another-secret");
    expect(await isValidSessionToken(SECRET, token)).toBe(false);
  });

  it("空值與格式錯誤的 token 無效", async () => {
    for (const token of [null, undefined, "", ".", "abc", ".sig", "notanumber.sig"]) {
      expect(await isValidSessionToken(SECRET, token)).toBe(false);
    }
  });
});

describe("cookie 標頭", () => {
  it("Path 是 / 而不是 /admin", async () => {
    // Path=/admin 的 cookie 不會被送到 /api/admin/analytics，
    // 會造成「登入成功但管理頁一直 401」。
    const header = sessionCookieHeader(await createSessionToken(SECRET));

    expect(header).toContain("Path=/;");
    expect(header).not.toContain("Path=/admin");
  });

  it("帶齊 HttpOnly、Secure、SameSite=Strict 與 Max-Age", async () => {
    const header = sessionCookieHeader(await createSessionToken(SECRET));

    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Strict");
    expect(header).toContain(`Max-Age=${SESSION_TTL_MS / 1000}`);
  });

  it("清除用的標頭把 Max-Age 設為 0", () => {
    expect(clearedSessionCookieHeader()).toContain("Max-Age=0");
  });
});

describe("readSessionToken", () => {
  function withCookie(cookie?: string) {
    return new Request("https://example.com/", {
      headers: cookie ? { cookie } : {},
    });
  }

  it("從多個 cookie 中取出工作階段", () => {
    const request = withCookie(`other=1; ${SESSION_COOKIE}=the-token; another=2`);
    expect(readSessionToken(request)).toBe("the-token");
  });

  it("沒有 cookie 或沒有這個名稱時回 null", () => {
    expect(readSessionToken(withCookie())).toBeNull();
    expect(readSessionToken(withCookie("other=1"))).toBeNull();
    expect(readSessionToken(withCookie(`${SESSION_COOKIE}=`))).toBeNull();
  });

  it("不會被名稱前綴相同的 cookie 騙到", () => {
    const request = withCookie(`${SESSION_COOKIE}_fake=evil`);
    expect(readSessionToken(request)).toBeNull();
  });
});
