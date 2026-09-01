import { describe, expect, it } from "vitest";
import { CURRENT_AI_PULSE } from "../data/ai-pulse";
import { isKnownSlug } from "../data/articles";

describe("AI Pulse Latest (近期 AI 大小事專欄)", () => {
  it("當期專欄資料完整（期數、日期區間、標題、摘要）", () => {
    expect(CURRENT_AI_PULSE.slug).toBe("ai-pulse-latest");
    expect(CURRENT_AI_PULSE.dateRange).toContain("2026");
    expect(CURRENT_AI_PULSE.title.length).toBeGreaterThan(10);
    expect(CURRENT_AI_PULSE.subtitle.length).toBeGreaterThan(10);
    expect(CURRENT_AI_PULSE.summary.length).toBeGreaterThan(20);
    expect(CURRENT_AI_PULSE.href).toBe("/articles/ai-pulse-latest");
  });

  it("本期焦點看點不少於 3 條", () => {
    expect(CURRENT_AI_PULSE.highlights.length).toBeGreaterThanOrEqual(3);
    for (const item of CURRENT_AI_PULSE.highlights) {
      expect(item.length).toBeGreaterThan(5);
    }
  });

  it("slug 在全站文章白名單中註冊有效（供瀏覽統計與回饋使用）", () => {
    expect(isKnownSlug("ai-pulse-latest")).toBe(true);
  });
});
