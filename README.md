# MOBILE PULSE

繁體中文的 App 開發技術與工具週報文章站。

## 新增文章（交給 Codex）

請直接對 Codex 說：

> 使用 last30days 與 newsletter-generation，產出本週 App 開發的新技術與工具圖文週報，繁體中文，附來源與配圖；再新增至 MOBILE PULSE 網站。

新增時請：

1. 建立 `app/articles/<slug>/page.tsx`，沿用現有文章的導覽、來源與 `Feedback` 區塊。
2. 將封面與圖表加入 `public/`。
3. 在 `data/articles.ts` 加入 `slug`、`title`、`summary`、`publishedAt`、`tags`、`coverImage`、`href`；若為最新一期，將 `featured` 設為 `true`。
4. 執行 `npm test` 與 `npm run build`。

## 資料庫（匿名統計）

統計資料存在 Cloudflare D1，schema 定義於 `db/schema.ts`，migration 由 drizzle-kit 產出至 `drizzle/`。

改動 schema 後：

```bash
npm run db:generate
```

套用到本機開發資料庫（可重複執行，wrangler 會跳過已套用的版本）：

```bash
npm run db:migrate:local
```

本機套用完成後**需重啟 `npm run dev`** 才會生效，dev server 啟動時就決定了 binding。

正式環境的 migration 由部署平台在 deploy 時套用，本專案不提供 `--remote` 指令。

`db/local-d1.wrangler.jsonc` 只給 wrangler CLI 用。它刻意不叫 `wrangler.jsonc`、也不放在根目錄：`@cloudflare/vite-plugin` 會自動探索根目錄的 wrangler 設定並與 `vite.config.ts` 的 inline 設定合併，那會讓同一組 binding 有兩個真相來源。裡面的 binding、database_name、database_id 三個值必須與 `vite.config.ts` 的 `localBindingConfig` 一致。

## 回饋功能

文章頁的「♥ 有用／↓ 沒用」會保存在讀者目前使用的瀏覽器；沒有登入、資料庫或全站總計數。若要收集所有讀者的彙總反饋，下一版可接上資料庫與匿名計數 API。
