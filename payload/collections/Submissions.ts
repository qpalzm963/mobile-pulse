import type { CollectionConfig } from "payload";

export const Submissions: CollectionConfig = {
  slug: "submissions",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "authorAlias", "createdAt"],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
      label: "自訂網址 Slug",
    },
    {
      name: "summary",
      type: "textarea",
      required: true,
      label: "文章摘要",
    },
    {
      name: "contentMarkdown",
      type: "textarea",
      required: true,
      label: "Markdown 正文內容",
    },
    {
      name: "authorAlias",
      type: "text",
      defaultValue: "匿名組員",
      label: "作者暱稱 / 團隊標記",
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "📝 草稿 (Draft)", value: "draft" },
        { label: "🔍 同儕審評中 (Reviewing)", value: "reviewing" },
        { label: "⚠️ 需修改 / 退修 (Changes Requested)", value: "changes_requested" },
        { label: "✓ 已審核採納 (Approved)", value: "approved" },
        { label: "🚀 已正式發布 (Published)", value: "published" },
        { label: "❌ 未採納 (Rejected)", value: "rejected" },
      ],
      defaultValue: "draft",
      required: true,
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
      name: "coverImage",
      type: "relationship",
      relationTo: "media",
      hasMany: false,
      label: "封面圖片",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "submittedAt",
      type: "date",
      label: "送審時間",
      admin: {
        position: "sidebar",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "approvedAt",
      type: "date",
      label: "採納時間",
      admin: {
        position: "sidebar",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "publishedAt",
      type: "date",
      label: "正式發布時間",
      admin: {
        position: "sidebar",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "publishedArticle",
      type: "relationship",
      relationTo: "articles",
      hasMany: false,
      label: "對應正式文章",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "legacyId",
      type: "number",
      index: true,
      label: "舊 Drizzle 系統 ID (向後相容)",
      admin: {
        position: "sidebar",
        readOnly: true,
      },
    },
  ],
  timestamps: true,
};
