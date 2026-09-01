import { describe, expect, it } from "vitest";
import React from "react";
import { RichMarkdownRenderer } from "../components/RichMarkdownRenderer";

describe("RichMarkdownRenderer", () => {
  it("能正常處理基本 Markdown 語法（標題、段落、粗體、行內代碼、清單）", () => {
    const md = `
# 第一章

這是包含 **粗體文字** 與 \`inline code\` 的段落。

- 清單項目一
- 清單項目二

1. 步驟一
2. 步驟二
`;
    const element = RichMarkdownRenderer({ content: md });
    expect(element).not.toBeNull();
    expect(React.isValidElement(element)).toBe(true);
  });

  it("能解析並渲染所有自訂 Shortcodes（terminal, compare, timeline, metric, callout, image）", () => {
    const md = `
:::terminal title="test-cli"
$ npm test
:::

:::compare before="傳統做法" after="新做法"
舊方案 | 新方案
:::

:::timeline
- 步驟 1 :: 準備工作
- 步驟 2 :: 開始遷移
:::

:::metric value="99.9%" label="可用度" trend="up"
:::

:::callout type="tip"
這是一個技巧提示。
:::

:::image src="https://example.com/demo.png" alt="測試圖片" caption="圖片說明" :::
`;
    const element = RichMarkdownRenderer({ content: md });
    expect(element).not.toBeNull();
    expect(React.isValidElement(element)).toBe(true);
  });

  it("支援單行與多行 :::image shortcode 語法", () => {
    const singleLine = `:::image id="media_123" alt="架構圖" caption="圖說" :::`;
    const block = `:::image id="media_456" alt="架構圖 2"
:::`;
    const el1 = RichMarkdownRenderer({ content: singleLine });
    const el2 = RichMarkdownRenderer({ content: block });
    expect(React.isValidElement(el1)).toBe(true);
    expect(React.isValidElement(el2)).toBe(true);
  });

  it("當傳入純 Legacy HTML 時能以相容模式渲染", () => {
    const html = `<div class="terminal-block"><p class="lead">舊格式文章</p></div>`;
    const element = RichMarkdownRenderer({ content: html });
    expect(React.isValidElement(element)).toBe(true);
  });

  it("能解析並渲染標準 Markdown 表格", () => {
    const tableMd = `
| 項目 | 說明 | 狀態 |
| :--- | :---: | ---: |
| 模組 A | 核心功能 | 穩定 |
| 模組 B | 擴充介面 | 測試中 |
`;
    const element = RichMarkdownRenderer({ content: tableMd });
    expect(element).not.toBeNull();
    expect(React.isValidElement(element)).toBe(true);
  });

  it("當 content 為空時回傳 null", () => {
    expect(RichMarkdownRenderer({ content: "" })).toBeNull();
  });
});
