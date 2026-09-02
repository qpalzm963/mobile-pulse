import type { CollectionConfig } from "payload";

// Workflow fields that only admins can directly mutate through Payload admin UI
// External API routes must go through SubmissionService state machine
const workflowFieldNames = [
  "status",
  "submittedAt",
  "approvedAt",
  "publishedAt",
  "publishedArticle",
  "legacyId",
] as const;

type WorkflowMutationArgs = {
  operation: "create" | "update";
  req?: { user?: unknown };
  data: Record<string, unknown>;
  originalDoc?: Record<string, unknown> | null;
};

export function enforceSubmissionWorkflowStateMachine({
  operation,
  req,
  data,
  originalDoc,
}: WorkflowMutationArgs): Record<string, unknown> {
  if (!req?.user) {
    return data;
  }

  const explicitWorkflowFields = workflowFieldNames.filter((fieldName) =>
    Object.prototype.hasOwnProperty.call(data, fieldName)
  );

  if (operation === "create") {
    const requestedStatus = typeof data.status === "string" ? data.status : "draft";
    if (requestedStatus !== "draft") {
      throw new Error("Submission workflow can only be managed through SubmissionService.");
    }

    if (explicitWorkflowFields.some((fieldName) => fieldName !== "status" && data[fieldName] != null)) {
      throw new Error("Submission workflow can only be managed through SubmissionService.");
    }

    return data;
  }

  const currentStatus = String(originalDoc?.status || "draft");
  if (currentStatus !== "draft" && currentStatus !== "changes_requested") {
    throw new Error(
      `Cannot edit submission in '${currentStatus}' status. Content can only be edited in 'draft' or 'changes_requested' status.`
    );
  }

  if (typeof data.status === "string" && data.status !== currentStatus) {
    throw new Error("Submission workflow can only be managed through SubmissionService.");
  }

  if (explicitWorkflowFields.some((fieldName) => data[fieldName] !== originalDoc?.[fieldName])) {
    throw new Error("Submission workflow can only be managed through SubmissionService.");
  }

  return data;
}

export const Submissions: CollectionConfig = {
  slug: "submissions",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "status", "authorAlias", "createdAt"],
  },
  access: {
    // Keep the internal collection private. Public review reads go through the
    // SubmissionService API, which applies the intended response shape/status
    // filtering and never returns reviewer credentials.
    read: ({ req }) => Boolean(req.user),
    // All writes must go through SubmissionService. Its trusted local API
    // calls use Payload's default overrideAccess behavior; REST/admin writes
    // cannot bypass the service state machine.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [enforceSubmissionWorkflowStateMachine],
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
      admin: {
        readOnly: true,
        description: "Slug 由系統自動產生，不可人工修改",
      },
      // Immutable: slug is set at creation time and must not change
      access: {
        create: () => true,
        update: () => false,
      },
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
        readOnly: true,
        description: "Status is managed by the workflow. Use API actions to transition.",
      },
      // Status transitions must go through SubmissionService — lock Payload admin UI
      access: {
        create: () => true,
        update: () => false,
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
        readOnly: true,
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
      access: {
        update: () => false,
      },
    },
    {
      name: "approvedAt",
      type: "date",
      label: "採納時間",
      admin: {
        position: "sidebar",
        readOnly: true,
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
      access: {
        update: () => false,
      },
    },
    {
      name: "publishedAt",
      type: "date",
      label: "正式發布時間",
      admin: {
        position: "sidebar",
        readOnly: true,
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
      access: {
        update: () => false,
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
        readOnly: true,
      },
      access: {
        update: () => false,
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
        description: "Numeric legacy ID for backward-compat URL /reviews/:numericId",
      },
      access: {
        update: () => false,
      },
    },
  ],
  timestamps: true,
};
