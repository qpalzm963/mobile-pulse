export interface ArticleInput {
  title: string;
  summary?: string;
  tags?: string[];
  contentMarkdown: string;
  coverImageId?: string;
  authorAlias?: string;
  status?: "draft" | "reviewing" | "approved" | "published" | "rejected";
}

/**
 * Extracts a concise plain-text summary from Markdown content.
 * Skips headings, code blocks, and custom shortcodes.
 */
export function extractSummaryFromMarkdown(content: string, maxLength: number = 140): string {
  if (!content || typeof content !== "string") {
    return "";
  }

  // Split by double newline or single newline to parse blocks
  const lines = content.split("\n");
  const paragraphLines: string[] = [];
  let inCodeBlock = false;
  let inShortcode = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Single-line shortcode
    if (trimmed.startsWith(":::") && trimmed.length > 3 && trimmed.slice(3).trim().endsWith(":::")) {
      continue;
    }

    // Multiline shortcode toggle
    if (trimmed.startsWith(":::")) {
      inShortcode = !inShortcode;
      continue;
    }
    if (inShortcode) continue;

    // Skip headings
    if (trimmed.startsWith("#")) continue;

    // Skip horizontal rules
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) continue;

    // Skip image markdown
    if (trimmed.startsWith("![")) continue;

    // Skip table lines
    if (/^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(trimmed)) continue;
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) continue;

    // If we have an empty line and we already collected some paragraph lines, that completes the first paragraph
    if (!trimmed) {
      if (paragraphLines.length > 0) {
        break;
      }
      continue;
    }

    // Clean list markers or blockquote prefix
    const cleanLine = trimmed
      .replace(/^>\s*/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+\.\s+/, "");

    paragraphLines.push(cleanLine);
  }

  if (paragraphLines.length === 0) {
    return "";
  }

  let text = paragraphLines.join(" ");

  // Strip inline Markdown formatting
  text = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // Images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // Links
    .replace(/(`{1,3})([^`]+)\1/g, "$2") // Inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold **
    .replace(/__([^_]+)__/g, "$1") // Bold __
    .replace(/\*([^*]+)\*/g, "$1") // Italic *
    .replace(/_([^_]+)_/g, "$1") // Italic _
    .replace(/~~([^~]+)~~/g, "$1") // Strikethrough
    .replace(/<[^>]+>/g, "") // Any inline HTML tags
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim() + "...";
}

export const ARTICLE_CONTENT_LIMITS = {
  MIN_TITLE_LENGTH: 2,
  MAX_TITLE_LENGTH: 200,
  MIN_CONTENT_LENGTH: 10,
  MAX_CONTENT_LENGTH: 100_000,
  MAX_SUMMARY_LENGTH: 300,
};

/**
 * Shared validator for article inputs across POST, PATCH, and MCP endpoints.
 */
export function validateArticleInput(
  input: {
    title?: unknown;
    summary?: unknown;
    contentMarkdown?: unknown;
  },
  options: { isPatch?: boolean } = {}
): { isValid: boolean; error?: string } {
  const { isPatch = false } = options;

  // 1. Validate Title
  if (!isPatch || input.title !== undefined) {
    if (
      !input.title ||
      typeof input.title !== "string" ||
      input.title.trim().length < ARTICLE_CONTENT_LIMITS.MIN_TITLE_LENGTH
    ) {
      return {
        isValid: false,
        error: `Title is required and must be at least ${ARTICLE_CONTENT_LIMITS.MIN_TITLE_LENGTH} characters`,
      };
    }
    if (input.title.trim().length > ARTICLE_CONTENT_LIMITS.MAX_TITLE_LENGTH) {
      return {
        isValid: false,
        error: `Title cannot exceed ${ARTICLE_CONTENT_LIMITS.MAX_TITLE_LENGTH} characters`,
      };
    }
  }

  // 2. Validate Summary (if provided)
  if (input.summary !== undefined && input.summary !== null && input.summary !== "") {
    if (typeof input.summary !== "string") {
      return { isValid: false, error: "Summary must be a string" };
    }
    if (input.summary.trim().length > ARTICLE_CONTENT_LIMITS.MAX_SUMMARY_LENGTH) {
      return {
        isValid: false,
        error: `Summary cannot exceed ${ARTICLE_CONTENT_LIMITS.MAX_SUMMARY_LENGTH} characters`,
      };
    }
  }

  // 3. Validate Content (Markdown)
  if (!isPatch || input.contentMarkdown !== undefined) {
    if (
      !input.contentMarkdown ||
      typeof input.contentMarkdown !== "string" ||
      input.contentMarkdown.trim().length < ARTICLE_CONTENT_LIMITS.MIN_CONTENT_LENGTH
    ) {
      return {
        isValid: false,
        error: `contentMarkdown is required and must be at least ${ARTICLE_CONTENT_LIMITS.MIN_CONTENT_LENGTH} characters`,
      };
    }
    if (input.contentMarkdown.trim().length > ARTICLE_CONTENT_LIMITS.MAX_CONTENT_LENGTH) {
      return {
        isValid: false,
        error: `contentMarkdown exceeds maximum length of ${ARTICLE_CONTENT_LIMITS.MAX_CONTENT_LENGTH} characters`,
      };
    }
  }

  return { isValid: true };
}

export const MARKDOWN_AI_PROMPT_TEMPLATE = `請針對 [你的技術主題] 撰寫一篇深度技術文章，並輸出為符合「MOBILE PULSE」標準的 Markdown 格式（含自訂 Shortcodes）：

【MOBILE PULSE 排版與 Shortcode 規範】
1. 標題與段落：
   - 大章節使用 ##，子章節使用 ###
   - 段落之間保持空行，敘述緊湊、節奏明快
   - 引言重點使用 > 引用文字
   - 粗體 **關鍵字**、行內代碼 \`code\`

2. 終端機指令（:::terminal）：
:::terminal title="bash"
$ flutter test --coverage
> All 42 tests passed.
:::

3. 技術選型 / 架構對比（:::compare）：
:::compare before="傳統做法" after="推薦實務"
- 手動維護全域鎖 | + 使用 Actor 與 Mutex
- 執行期捕捉 Data Race | + 編譯期強制檢查 Sendable
:::

4. 演進時間軸 / 步驟說明（:::timeline）：
:::timeline
- 步驟 1 :: 升級依賴至最新版本
- 步驟 2 :: 開啟 Strict Concurrency 檢查
- 步驟 3 :: 重構非 Sendable 共享狀態
:::

5. 關鍵指標卡片（:::metric）：
:::metric value="99.9%" label="測試覆蓋率" trend="up"
:::

6. 重點提示（:::callout）：
:::callout type="tip"
這是一段關鍵提示資訊。支援 type="info" | "warn" | "danger" | "tip"
:::

7. 圖片插圖（:::image）：
:::image id="media_arch_01" alt="系統架構圖" caption="圖 1：現代化架構邊界示意" :::
`;

export const SAMPLE_MARKDOWN = `當 Swift 6 將嚴格並發檢查（Strict Concurrency）提升為強制編譯門檻，過往依賴開發者自律的執行期防禦已徹底退場。本文將帶你繞過編譯警告的表面修補陷阱，從核心隔離邊界與現代化無競態架構出發，完成大型代碼庫的平滑升級。

## 一、 範式轉變：編譯期數據競態安全時代的降臨

在 Swift 6 之前，多執行緒數據競態（Data Races）如同幽靈般潛伏在生產環境中。即便借助 Thread Sanitizer，也只能在特定的測試路徑下捕捉問題。

Swift 6 徹底改變了遊戲規則。透過靜態型別系統，編譯器在構建階段強制推導記憶體隔離邊界（Isolation Domains），任何跨執行緒的潛在未受保護存取都將直接阻斷編譯流程。

:::terminal title="swift build"
$ swift build -Xswiftc -strict-concurrency=complete
error: passing argument of non-sendable type 'UserProfile' across actor-isolated boundary risks causing data races
    await analyticsService.track(user: currentUser)
                                       ^
note: class 'UserProfile' does not conform to the 'Sendable' protocol
:::

## 二、 架構對比實例

:::compare before="傳統做法 (Pre-Swift 6)" after="現代實務 (Swift 6)"
- 手動維護全域鎖與 DispatchQueue，容易在併發時產生死鎖或崩潰 | + 使用 Actor 隔離模型與 Mutex，由編譯器保證 Sendable
- 依賴執行期防禦，多執行緒競態難以在測試期排查 | + 靜態推導記憶體邊界，編譯期阻斷未受保護存取
:::

## 三、 重構路徑與演進步驟

:::timeline
- 階段 1：開啟 Minimal 並發檢查 :: 盤點現有全域變數與跨執行緒傳遞之參考型別。
- 階段 2：實作 Sendable 標註 :: 將純資料傳遞模型宣告為 \`Sendable\` 或改為 Value Type。
- 階段 3：啟用 Complete 嚴格檢查 :: 引入 Actor 邊界並全面消弭資料競態警告。
:::

:::metric value="0" label="執行期並發崩潰" trend="down"
:::

:::callout type="tip"
嚴格並發檢查不是編譯器強加的枷鎖，而是現代系統在多核架構下實現零數據競態的基石。
:::

:::image id="media_swift6_arch" alt="現代架構工作流" caption="圖 1：Swift 6 靜態隔離邊界與記憶體模型" :::
`;
