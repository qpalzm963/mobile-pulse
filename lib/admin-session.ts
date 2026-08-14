export const SESSION_COOKIE = "mobile_pulse_admin";

/** 短效工作階段。站長重新輸入密碼的成本很低，不值得為了少打幾次字放長。 */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const encoder = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/**
 * 定時比較。兩邊都是固定長度的 HMAC 摘要，逐字元累積差異而不提早返回，
 * 不讓比對耗時洩漏「猜對了前幾個字元」。
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 驗證管理密碼。兩邊都先過 HMAC 再比對摘要，不直接比較原始字串：
 * 字串比較會在第一個不同的字元就返回，耗時本身就是提示。
 */
export async function verifyPassword(
  secret: string,
  expected: string,
  provided: unknown
): Promise<boolean> {
  if (typeof provided !== "string" || provided.length === 0) return false;
  const [a, b] = await Promise.all([
    hmac(secret, `password:${provided}`),
    hmac(secret, `password:${expected}`),
  ]);
  return safeEqual(a, b);
}

export async function createSessionToken(
  secret: string,
  now: number = Date.now()
): Promise<string> {
  const expiresAt = now + SESSION_TTL_MS;
  return `${expiresAt}.${await hmac(secret, String(expiresAt))}`;
}

export async function isValidSessionToken(
  secret: string,
  token: string | null | undefined,
  now: number = Date.now()
): Promise<boolean> {
  if (!token) return false;

  const separator = token.indexOf(".");
  if (separator <= 0) return false;

  const expiresPart = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(expiresPart);
  if (!Number.isSafeInteger(expiresAt)) return false;

  // 先驗簽章再看有效期：對簽章不合法的 token 不透露它的到期時間是否合理。
  if (!safeEqual(signature, await hmac(secret, expiresPart))) return false;

  return expiresAt > now;
}

/**
 * Path 必須是 `/` 而不是 `/admin`。
 * 分析端點在 /api/admin/analytics，不在 /admin 之下，Path=/admin 的 cookie
 * 不會被送出，會造成「登入成功但管理頁一直 401」。SameSite=Strict 補上
 * 範圍放寬後的跨站防護。
 */
export function sessionCookieHeader(token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearedSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === SESSION_COOKIE) {
      return part.slice(separator + 1).trim() || null;
    }
  }
  return null;
}
