const KEY = "mobile-pulse-reviewer-token";

/**
 * 取得或建立這台瀏覽器的匿名評審 Token（UUID）。
 * 儲存在 localStorage，不記錄姓名與個人資訊，用以避免同一位組員重複灌票。
 */
export function getOrCreateReviewerToken(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    const created = crypto.randomUUID();
    localStorage.setItem(KEY, created);
    return created;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 10);
  }
}
