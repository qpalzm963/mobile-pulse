import type { CollectionConfig } from "payload";
import path from "path";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: "媒體圖片",
    plural: "🖼️ 媒體庫",
  },
  admin: {
    group: "內容出版",
    useAsTitle: "alt",
    defaultColumns: ["filename", "alt", "mimeType", "filesize", "createdAt"],
  },
  access: {
    read: () => true,
  },
  upload: {
    staticDir: process.env.MEDIA_DIR
      ? process.env.MEDIA_DIR.startsWith("/")
        ? process.env.MEDIA_DIR
        : path.resolve(dirname, "../..", process.env.MEDIA_DIR)
      : path.resolve(dirname, "../../media"),
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      label: "替代文字 (Alt Text，無障礙與 SEO 說明)",
    },
    {
      name: "caption",
      type: "text",
      label: "圖片說明 (Caption)",
    },
  ],
};
