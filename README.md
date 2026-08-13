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

## 回饋功能

文章頁的「♥ 有用／↓ 沒用」會保存在讀者目前使用的瀏覽器；沒有登入、資料庫或全站總計數。若要收集所有讀者的彙總反饋，下一版可接上資料庫與匿名計數 API。
