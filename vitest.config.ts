import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// 讀取 drizzle-kit 產出的 migration，於每個測試檔啟動時套用到記憶體 D1。
// 測試跑的是與正式環境同一份 SQL，唯一約束與 CHECK 都真的存在。
const migrations = await readD1Migrations("./drizzle");

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-08-01",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: migrations,
          // 正式環境由部署平台的私密設定提供；測試給固定值。
          ADMIN_PASSWORD: "test-admin-password",
          ADMIN_SESSION_SECRET: "test-session-secret",
        },
      },
    }),
  ],
  test: {
    // 既有的 tests/*.test.mjs 由 node --test 跑（見 package.json 的 test 指令），
    // 這裡只收 TypeScript 測試。
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
