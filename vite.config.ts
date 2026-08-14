import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

// Node 自架設定。vinext 的 node 平台不需要任何額外 plugin
// （樣板見 vinext 的 init：plugins: [vinext()]）。
// better-sqlite3 是原生模組，必須留給 Node 自己載入，不能被打包。
export default defineConfig({
  plugins: [vinext(), sites()],
  ssr: { external: ["better-sqlite3"] },
});
