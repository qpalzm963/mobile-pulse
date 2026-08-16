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

// 新的排前面：首頁照這個順序列出，最新一期要在最上面。
export const ARTICLES: Article[] = [
  {
    slug: "a2ui-flutter-renderer",
    title: "一個表單怎麼從 agent 走進你的 Flutter App",
    summary: "A2UI 讓 agent 描述介面，但 Flutter renderer 仍掌握 widget、事件與安全邊界。",
    publishedAt: "2026.08.16",
    tags: ["ai", "cross-platform", "engineering"],
    href: "/articles/a2ui-flutter-renderer",
  },
  {
    slug: "ai-weekly-2026-08-14",
    title: "Agent 開始戳你的 API 了",
    summary: "這期三件事有一條共同線索：出問題的不是模型，是它們接上去的那些介面。",
    publishedAt: "2026.08.14",
    tags: ["ai", "engineering"],
    href: "/articles/ai-weekly-2026-08-14",
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

const SLUGS = new Set(ARTICLES.map((article) => article.slug));

/**
 * 統計 API 的 slug 白名單。未經此檢查，任意字串都能在 article_views 建立
 * 資料列，資料表會無上限成長。
 */
export function isKnownSlug(slug: string): boolean {
  return SLUGS.has(slug);
}
