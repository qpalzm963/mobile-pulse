const KEY = "mobile-pulse-visitor-id";

/**
 * 取得（必要時建立）這台瀏覽器的匿名訪客 ID。
 *
 * storage 不可用時回傳 null，**絕不產生臨時 ID**。臨時 ID 會讓每次重新整理
 * 都被算成新訪客，直接違反「重整不增加」的驗收標準，而且不會有任何錯誤訊息
 * ——是這個功能最容易默默壞掉的地方。
 *
 * 呼叫端拿到 null 就該放棄記錄瀏覽、回饋改為僅存在於當前畫面。
 */
export function readOrCreateVisitorId(
  storage: Storage | null | undefined
): string | null {
  if (!storage) return null;

  try {
    const existing = storage.getItem(KEY);
    if (existing) return existing;

    const created = crypto.randomUUID();
    storage.setItem(KEY, created);

    // 讀回來確認真的寫進去了。有些瀏覽器的 setItem 不丟例外但不生效，
    // 只信任 setItem 沒拋錯就會回傳一個下次載入讀不到的 ID。
    return storage.getItem(KEY) === created ? created : null;
  } catch {
    return null;
  }
}
