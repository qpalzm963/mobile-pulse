import type { CollectionConfig } from "payload";

export const SubmissionReviews: CollectionConfig = {
  slug: "submission-reviews",
  admin: {
    useAsTitle: "reviewerToken",
    defaultColumns: ["submission", "reviewerToken", "scoreDepth", "scoreClarity", "scorePracticality", "createdAt"],
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
      index: true,
      label: "審稿者 Token",
    },
    {
      name: "priorKnowledge",
      type: "select",
      options: [
        { label: "全新知識", value: "new_knowledge" },
        { label: "略有涉獵", value: "familiar_surface" },
        { label: "相當熟悉", value: "already_expert" },
      ],
      defaultValue: "new_knowledge",
      required: true,
      label: "審稿前背景認知",
    },
    {
      name: "scoreDepth",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      label: "技術深度評分 (1-5)",
    },
    {
      name: "scoreClarity",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      label: "論述清晰評分 (1-5)",
    },
    {
      name: "scorePracticality",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      label: "落地實用評分 (1-5)",
    },
    {
      name: "generalFeedback",
      type: "textarea",
      label: "總體文字回饋",
    },
  ],
  timestamps: true,
};
