/**
 * @deprecated
 * 注意：自 Issue #5 起，Payload CMS (payload/collections/Articles.ts) 為公開 Article 的唯一 Source of Truth。
 * 本檔案僅保留作為 Initial Seed / 靜態 fallback 與型別相容性支援。
 * 公開查詢請使用 @/lib/articles 的 listPublishedArticles() 與 getPublishedArticleBySlug()。
 */

export type Article = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  href: string;
};

export const TAGS = [
  { id: "all", label: "全部" },
  { id: "ai", label: "AI 開發" },
  { id: "android", label: "Android" },
  { id: "ios", label: "iOS" },
  { id: "cross-platform", label: "跨平台" },
  { id: "engineering", label: "工程實務" },
];

/**
 * @deprecated 請改由 Payload CMS 動態取得已發布文章列表。
 */
export const ARTICLES: Article[] = [
  {
    slug: "ai-agent-security-sandbox-audit",
    title: "從 Hugging Face 越獄事件到 EU AI Act：構建 AI Agent 的零逃逸沙盒與審計邊界",
    summary: "2026 年 8 月 OpenAI 測試 Agent 逃逸並入侵 Hugging Face 基礎設施，引發全球對自主 Agent 的安全震撼。本文深度解析多步驟 Agent 的攻擊路徑，並提供三層縱深沙盒防禦與不可竄改審計日誌的實戰架構。",
    publishedAt: "2026.08.20",
    tags: ["ai", "engineering"],
    href: "/articles/ai-agent-security-sandbox-audit",
  },
  {
    slug: "bruno-api-client-git-first",
    title: "我們為什麼受夠了 Postman？談談 Bruno 如何把 API 控制權還給前後端工程師",
    summary: "切換分支 API 沒同步、測 API 被迫先登入、隨手戳測試卻擔心 Token 外洩？Bruno 把 API 集合回歸純文字與 Git，打破前後端協作的斷層。",
    publishedAt: "2026.08.16",
    tags: ["engineering", "cross-platform"],
    href: "/articles/bruno-api-client-git-first",
  },
  {
    slug: "google-a2ui-agents-speak-ui",
    title: "超越純文字對話：解構 A2UI 宣告式介面協定",
    summary: "當 AI Agent 試圖從問答工具轉變為任務執行者，純文字已成瓶頸。剖析 A2UI 的雙通道資料流、零信任邊界與 4 大 GenUI 選型。",
    publishedAt: "2026.08.16",
    tags: ["ai", "cross-platform", "engineering"],
    href: "/articles/google-a2ui-agents-speak-ui",
  },
  {
    slug: "app-dev-weekly-2026-08-13",
    title: "本週 App 開發新技術與工具週報",
    summary: "Android、Apple、Flutter 與 AI 開發工具，這週哪些更新值得放進你的開發流程？",
    publishedAt: "2026.08.13",
    tags: ["ai", "android", "ios", "cross-platform", "engineering"],
    href: "/articles/app-dev-weekly-2026-08-13",
  },
];

const SLUGS = new Set([...ARTICLES.map((article) => article.slug), "ai-pulse-latest"]);

/**
 * @deprecated 請使用 @/lib/articles 的 isPublishedArticleSlug(slug) 進行非同步驗證。
 */
export function isKnownSlug(slug: string): boolean {
  return SLUGS.has(slug);
}
