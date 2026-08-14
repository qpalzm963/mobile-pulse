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

## 管理頁 `/admin`

以部署環境的管理密碼登入，查看每篇文章的瀏覽、有用、沒用、有用率與最近回饋時間（以台北時間顯示）。頁面標記 `noindex`。

需要兩個私密設定：

| 名稱 | 用途 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理密碼 |
| `ADMIN_SESSION_SECRET` | 工作階段 cookie 的 HMAC 簽章金鑰 |

本機開發把 `.dev.vars.example` 複製成 `.dev.vars` 並填值；正式環境改用部署平台的私密設定。任一項缺失時管理頁與分析 API 一律拒絕存取（fail closed）。

**`.dev.vars` 已加入 `.gitignore`** —— 注意原本的 `.env*` 規則並不會匹配它。

### 尚未完成：邊緣節流

`/api/admin/login` 與 `/api/articles/*` **還沒有掛上 Cloudflare Rate Limiting 規則**，需要在 Cloudflare 儀表板設定，程式碼這邊不需要改動。在設定之前：

- 登入端點等同開放密碼暴力破解。
- 瀏覽與回饋端點可被灌入大量資料列，消耗 D1 寫入配額。

這個作法不儲存任何 IP，與「不記錄 IP」的隱私限制不衝突。

## 回饋功能

文章頁的「♥ 有用／↓ 沒用」會匿名保存到 D1，讀者不需要登入。瀏覽器的 localStorage 只保存一個隨機產生的 `visitor_id`，不記錄姓名、Email、IP 或裝置指紋。

- 同一位讀者對同一篇文章只有一筆回饋，可改選、可再點一次取消。
- 公開 API 只回傳讀者自己的選擇，**不回傳全站票數**；彙總數字只在 `/admin` 出現。
- 瀏覽記錄的 ping 內建於 `components/Feedback.tsx`，新增文章時不需要額外加任何東西。
- 讀者的瀏覽器若封鎖 localStorage（例如無痕模式），不會記錄瀏覽，回饋也只存在於當前畫面。這是刻意的：改用臨時 ID 會讓每次重新整理都被算成新訪客。
