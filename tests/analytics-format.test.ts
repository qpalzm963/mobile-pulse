import { describe, expect, it } from "vitest";
import { formatTaipei } from "../lib/analytics";

describe("formatTaipei", () => {
  it("把 UTC 時間換算成台北時間（+8）", () => {
    // SQLite 的 CURRENT_TIMESTAMP 沒有時區標記，若當成本地時間解析就會差 8 小時。
    expect(formatTaipei("2026-08-14 01:30:00")).toBe("2026/08/14 09:30");
  });

  it("跨日的換算也正確", () => {
    expect(formatTaipei("2026-08-14 20:00:00")).toBe("2026/08/15 04:00");
  });

  it("沒有回饋時顯示破折號而不是 1970 年", () => {
    expect(formatTaipei(null)).toBe("—");
  });

  it("無法解析的值顯示破折號而不是 Invalid Date", () => {
    expect(formatTaipei("not a timestamp")).toBe("—");
  });
});
