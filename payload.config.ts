import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { en } from "@payloadcms/translations/languages/en";
import { zhTw } from "@payloadcms/translations/languages/zhTw";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { Articles } from "./payload/collections/Articles";
import { Media } from "./payload/collections/Media";
import { Tags } from "./payload/collections/Tags";
import { Users } from "./payload/collections/Users";

import { existsSync, mkdirSync } from "fs";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const rawDbFile = process.env.PAYLOAD_DATABASE_FILE
  ? process.env.PAYLOAD_DATABASE_FILE.startsWith("/")
    ? process.env.PAYLOAD_DATABASE_FILE
    : path.resolve(dirname, process.env.PAYLOAD_DATABASE_FILE)
  : path.resolve(dirname, ".data/cms.sqlite");

if (rawDbFile !== ":memory:") {
  const dbDir = path.dirname(rawDbFile);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

const dbPath = rawDbFile === ":memory:" ? ":memory:" : `file:${rawDbFile}`;

export default buildConfig({
  i18n: {
    supportedLanguages: { "zh-TW": zhTw, en },
    fallbackLanguage: "zh-TW",
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: {
        Logo: "@/components/admin/Logo#AdminLogo",
        Icon: "@/components/admin/Icon#AdminIcon",
      },
      beforeDashboard: [
        "@/components/admin/DashboardOverview#DashboardOverview",
      ],
    },
  },
  collections: [Articles, Tags, Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "local-dev-payload-secret-mobile-pulse-987654321",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: sqliteAdapter({
    client: {
      url: dbPath,
    },
  }),
});
