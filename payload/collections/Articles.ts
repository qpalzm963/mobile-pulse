import type { CollectionConfig } from "payload";

export const Articles: CollectionConfig = {
  slug: "articles",
  labels: {
    singular: "文章",
    plural: "📰 文章管理",
  },
  admin: {
    group: "內容出版",
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "publishedAt", "updatedAt"],
    listSearchableFields: ["title", "slug", "summary"],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      label: "文章標題",
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "網址代稱 (Slug)",
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "💡 靈感 / 待查證 (Idea)", value: "idea" },
        { label: "✍️ 草稿撰寫中 (Draft)", value: "draft" },
        { label: "🔍 待審核 (Review)", value: "review" },
        { label: "🚀 已發布 (Published)", value: "published" },
      ],
      defaultValue: "draft",
      required: true,
      admin: {
        position: "sidebar",
      },
      label: "發布狀態",
    },
    {
      name: "summary",
      type: "textarea",
      required: true,
      label: "文章前言 / 摘要",
    },
    {
      name: "eyebrow",
      type: "text",
      label: "頂部小標 (例如：資安工程 / 系統架構)",
    },
    {
      name: "author",
      type: "text",
      defaultValue: "MOBILE PULSE 編輯部",
      label: "作者署名",
    },
    {
      name: "readTime",
      type: "text",
      defaultValue: "5 MIN READ",
      label: "閱讀時間估計",
    },
    {
      name: "publishedAt",
      type: "text",
      label: "發布日期 (例如：2026.08.20)",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
      label: "關聯標籤",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "interactiveComponent",
      type: "text",
      label: "專屬互動元件名稱 (選填，如 BrunoVsCloudComparison)",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "contentMarkdown",
      type: "textarea",
      label: "文章主體內容 (Markdown / 互動語法)",
    },
  ],
};
