import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  labels: {
    singular: "管理員",
    plural: "👥 編輯部管理員",
  },
  admin: {
    group: "系統設定",
    useAsTitle: "email",
    defaultColumns: ["email", "name", "role", "createdAt"],
  },
  auth: true,
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      name: "role",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      defaultValue: "admin",
      required: true,
    },
  ],
};
