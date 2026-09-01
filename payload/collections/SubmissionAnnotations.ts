import type { CollectionConfig } from "payload";

export const SubmissionAnnotations: CollectionConfig = {
  slug: "submission-annotations",
  admin: {
    useAsTitle: "comment",
    defaultColumns: ["submission", "selectedText", "comment", "status", "createdAt"],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: "submission",
      type: "relationship",
      relationTo: "submissions",
      required: true,
      index: true,
      label: "關聯投稿稿件",
    },
    {
      name: "reviewerToken",
      type: "text",
      required: true,
      label: "審稿者 Token",
    },
    {
      name: "selectedText",
      type: "textarea",
      required: true,
      label: "選取的段落文字",
    },
    {
      name: "textOffsetStart",
      type: "number",
      required: true,
      defaultValue: 0,
      label: "選取起點 Offset",
    },
    {
      name: "textOffsetEnd",
      type: "number",
      required: true,
      defaultValue: 0,
      label: "選取終點 Offset",
    },
    {
      name: "comment",
      type: "textarea",
      required: true,
      label: "審評備註與建議",
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "開啟中 (Open)", value: "open" },
        { label: "已解決 (Resolved)", value: "resolved" },
      ],
      defaultValue: "open",
      required: true,
      label: "註解狀態",
    },
  ],
  timestamps: true,
};
