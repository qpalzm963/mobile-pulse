import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 既有的 tests/*.test.mjs 由 node --test 跑（見 package.json 的 test 指令），
    // 這裡只收 TypeScript 測試。
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    environment: "node",
    // better-sqlite3 是原生模組，用 forks 而非 threads 比較穩，
    // 而且每個測試檔各自一個行程 = 各自一份記憶體資料庫。
    pool: "forks",
  },
});
