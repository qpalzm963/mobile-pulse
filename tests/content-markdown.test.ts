import { describe, expect, it } from "vitest";
import {
  extractSummaryFromMarkdown,
  validateArticleInput,
  ARTICLE_CONTENT_LIMITS,
  MARKDOWN_AI_PROMPT_TEMPLATE,
  SAMPLE_MARKDOWN,
} from "../lib/content-markdown";

describe("Content Markdown Utilities", () => {
  it("從 Markdown 第一段正確擷取摘要並過濾標題", () => {
    const md = `
# 文章大標題

## 第一章：背景介紹

這是一段關於 Swift 6 嚴格並發的核心介紹文字。解決了多執行緒競態問題。

## 第二章：實作細節
這是第二段內容。
`;
    const summary = extractSummaryFromMarkdown(md);
    expect(summary).toBe("這是一段關於 Swift 6 嚴格並發的核心介紹文字。解決了多執行緒競態問題。");
  });

  it("過濾代碼區塊與 Shortcode，提取純文字段落", () => {
    const md = `
# 標題

:::terminal title="swift"
$ swift test
:::

\`\`\`swift
let x = 10
\`\`\`

:::image id="media_123" alt="圖片" :::

真正的一段解說文字在此，說明了 **Actor** 與 \`Sendable\` 的關係。
`;
    const summary = extractSummaryFromMarkdown(md);
    expect(summary).toBe("真正的一段解說文字在此，說明了 Actor 與 Sendable 的關係。");
  });

  it("過濾表格語法，不讓表格管道字元污染摘要", () => {
    const md = `
# 架構選型

| 方案 | 效能 | 易用性 |
| :--- | :---: | ---: |
| Redux | 中 | 複雜 |
| Riverpod | 極高 | 簡易 |

這是表格後方的第一段實質說明文字。
`;
    const summary = extractSummaryFromMarkdown(md);
    expect(summary).toBe("這是表格後方的第一段實質說明文字。");
  });

  it("清除行內 Markdown 格式（粗體、斜體、連結、行內代碼、圖片）", () => {
    const md = `透過 **Strict Concurrency** 與 *Data Isolation*，搭配 [官方文件](https://swift.org) 與 \`Mutex\` 模型。`;
    const summary = extractSummaryFromMarkdown(md);
    expect(summary).toBe("透過 Strict Concurrency 與 Data Isolation，搭配 官方文件 與 Mutex 模型。");
  });

  it("超出長度限制時自動截斷並加上省略號", () => {
    const longText = "這是一段很長很長很長很長的技術文章前言介紹。".repeat(10);
    const summary = extractSummaryFromMarkdown(longText, 40);
    expect(summary.length).toBeLessThanOrEqual(44); // 40 + "..."
    expect(summary.endsWith("...")).toBe(true);
  });

  it("空字串或無實質段落時回傳空字串", () => {
    expect(extractSummaryFromMarkdown("")).toBe("");
    expect(extractSummaryFromMarkdown("# 僅有標題\n\n## 無段落")).toBe("");
  });

  it("AI Prompt Template 包含全站自訂 shortcodes 規範並以 Media ID 為主規格", () => {
    expect(MARKDOWN_AI_PROMPT_TEMPLATE).toContain(":::terminal");
    expect(MARKDOWN_AI_PROMPT_TEMPLATE).toContain(":::compare");
    expect(MARKDOWN_AI_PROMPT_TEMPLATE).toContain(":::timeline");
    expect(MARKDOWN_AI_PROMPT_TEMPLATE).toContain(":::metric");
    expect(MARKDOWN_AI_PROMPT_TEMPLATE).toContain(":::callout");
    expect(MARKDOWN_AI_PROMPT_TEMPLATE).toContain(":::image");
    expect(MARKDOWN_AI_PROMPT_TEMPLATE).toContain("id=\"media_arch_01\"");
  });

  it("Sample Markdown 格式正確且能正常擷取摘要", () => {
    const summary = extractSummaryFromMarkdown(SAMPLE_MARKDOWN);
    expect(summary).toContain("當 Swift 6 將嚴格並發檢查");
  });

  it("共用驗證函式 validateArticleInput 嚴格檢驗各欄位邊界", () => {
    // 1. Valid Input
    const valid = validateArticleInput({
      title: "Swift 6 Concurrency",
      summary: "簡短摘要",
      contentMarkdown: "這是一篇內容長度大於十個字元的完整文章內容。",
    });
    expect(valid.isValid).toBe(true);

    // 2. Title too short
    const shortTitle = validateArticleInput({
      title: "a",
      contentMarkdown: "這是一篇內容長度大於十個字元的完整文章內容。",
    });
    expect(shortTitle.isValid).toBe(false);
    expect(shortTitle.error).toContain("Title is required and must be at least");

    // 3. Summary exceeds 300 chars
    const longSummary = validateArticleInput({
      title: "正常標題",
      summary: "a".repeat(301),
      contentMarkdown: "這是一篇內容長度大於十個字元的完整文章內容。",
    });
    expect(longSummary.isValid).toBe(false);
    expect(longSummary.error).toContain("Summary cannot exceed 300 characters");

    // 4. Content too short (< 10)
    const shortContent = validateArticleInput({
      title: "正常標題",
      contentMarkdown: "太短",
    });
    expect(shortContent.isValid).toBe(false);
    expect(shortContent.error).toContain("contentMarkdown is required and must be at least 10 characters");

    // 5. PATCH mode allows partial fields
    const patchValid = validateArticleInput({ summary: "更新摘要" }, { isPatch: true });
    expect(patchValid.isValid).toBe(true);

    const patchInvalid = validateArticleInput({ contentMarkdown: "過短" }, { isPatch: true });
    expect(patchInvalid.isValid).toBe(false);
  });

  it("定義了正確的文章長度限制常數", () => {
    expect(ARTICLE_CONTENT_LIMITS.MIN_TITLE_LENGTH).toBe(2);
    expect(ARTICLE_CONTENT_LIMITS.MAX_TITLE_LENGTH).toBe(200);
    expect(ARTICLE_CONTENT_LIMITS.MIN_CONTENT_LENGTH).toBe(10);
    expect(ARTICLE_CONTENT_LIMITS.MAX_CONTENT_LENGTH).toBe(100_000);
    expect(ARTICLE_CONTENT_LIMITS.MAX_SUMMARY_LENGTH).toBe(300);
  });
});
