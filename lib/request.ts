const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 從請求 body 取出匿名訪客 ID。
 *
 * 限定 UUID 格式不是為了防偽造（用戶端本來就能任意產生合法 UUID），
 * 而是不讓任意長度的字串進資料庫。
 */
export function readVisitorId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as { visitorId?: unknown }).visitorId;
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** UTC 日期字串 YYYY-MM-DD。存 UTC 讓去重不受時區換算影響。 */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
