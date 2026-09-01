import type { CollectionConfig } from "payload";

export const Tags: CollectionConfig = {
  slug: "tags",
  labels: {
    singular: "標籤",
    plural: "🏷️ 分類標籤",
  },
  admin: {
    group: "內容出版",
    useAsTitle: "name",
    defaultColumns: ["name", "tagId"],
  },
  fields: [
    {
      name: "tagId",
      type: "text",
      required: true,
      unique: true,
      label: "標籤 ID (例如 ai, android, ios)",
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: "顯示名稱 (例如 AI 開發, Android)",
    },
  ],
};
