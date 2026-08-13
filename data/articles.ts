export type Article = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  coverImage: string;
  href: string;
  featured?: boolean;
};

export const TAGS = [
  { id: "all", label: "全部" },
  { id: "ai", label: "AI 開發" },
  { id: "android", label: "Android" },
  { id: "ios", label: "iOS" },
  { id: "cross-platform", label: "跨平台" },
  { id: "engineering", label: "工程實務" },
];

export const ARTICLES: Article[] = [
  {
    slug: "app-dev-weekly-2026-08-13",
    title: "本週 App 開發新技術與工具週報",
    summary: "Android、Apple、Flutter 與 AI 開發工具，這週哪些更新值得放進你的開發流程？",
    publishedAt: "2026.08.13",
    tags: ["ai", "android", "ios", "cross-platform", "engineering"],
    coverImage: "/weekly-cover.png",
    href: "/articles/app-dev-weekly-2026-08-13",
    featured: true,
  },
];
