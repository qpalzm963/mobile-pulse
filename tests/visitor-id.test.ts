import { describe, expect, it } from "vitest";
import { readOrCreateVisitorId } from "../lib/visitor-id";
import { isKnownSlug } from "../data/articles";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

describe("readOrCreateVisitorId", () => {
  it("首次呼叫建立 ID 並寫入 storage", () => {
    const storage = memoryStorage();
    const id = readOrCreateVisitorId(storage);

    expect(id).toBeTruthy();
    expect(storage.getItem("mobile-pulse-visitor-id")).toBe(id);
  });

  it("第二次呼叫回傳同一個 ID —— 重整不會變成新訪客", () => {
    const storage = memoryStorage();
    const first = readOrCreateVisitorId(storage);
    const second = readOrCreateVisitorId(storage);

    expect(second).toBe(first);
  });

  it("storage 不存在時回傳 null，不產生臨時 ID", () => {
    expect(readOrCreateVisitorId(null)).toBeNull();
    expect(readOrCreateVisitorId(undefined)).toBeNull();
  });

  it("setItem 拋例外時回傳 null（無痕模式）", () => {
    const storage = {
      ...memoryStorage(),
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    } as unknown as Storage;

    expect(readOrCreateVisitorId(storage)).toBeNull();
  });

  it("setItem 靜默失敗時也回傳 null，而不是回傳一個下次讀不到的 ID", () => {
    // 這是最陰險的情況：setItem 不拋錯，但值沒真的存進去。
    // 若只信任 setItem 沒拋錯，每次載入都會產生新 ID，瀏覽數持續灌水。
    const storage = {
      ...memoryStorage(),
      getItem: () => null,
      setItem: () => {},
    } as unknown as Storage;

    expect(readOrCreateVisitorId(storage)).toBeNull();
  });
});

describe("isKnownSlug", () => {
  it("接受 ARTICLES 中實際存在的 slug", () => {
    expect(isKnownSlug("app-dev-weekly-2026-08-13")).toBe(true);
  });

  it("拒絕未列於 ARTICLES 的 slug", () => {
    expect(isKnownSlug("../../etc/passwd")).toBe(false);
    expect(isKnownSlug("")).toBe(false);
    expect(isKnownSlug("app-dev-weekly-2026-08-14")).toBe(false);
  });
});
