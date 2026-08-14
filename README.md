# MOBILE PULSE

繁體中文的 App 開發技術與工具週報文章站。

## 新增文章（交給 Codex）

請直接對 Codex 說：

> 使用 last30days 與 newsletter-generation，產出一篇可發布的繁體中文 HTML 圖文文章，再新增至 MOBILE PULSE 網站。先依文章類型選擇 `docs/article-quality-standard.md` 的 HTML 敘事模組；禁止 Mermaid 與純文字長文。所有事實附原始來源，文章必須先通過該文件的發布最低門檻。

新增時請：

1. 先選擇文章類型的 HTML 模組並完成品質檢核；建立 `app/articles/<slug>/page.tsx`，沿用現有文章的導覽、來源與 `Feedback` 區塊。
2. 將封面與圖表加入 `public/`。
3. 在 `data/articles.ts` 加入 `slug`、`title`、`summary`、`publishedAt`、`tags`、`coverImage`、`href`；若為最新一期，將 `featured` 設為 `true`。
4. 執行 `npm test` 與 `npm run build`。

## 執行與自架

站台跑在 Node 上，不依賴任何雲端平台。

```bash
npm run dev            # 開發（含 HMR）
npm run build          # 產出 dist/standalone/
node dist/standalone/server.js
```

`PORT` 預設 3000、`HOST` 預設 `0.0.0.0`。注意 vinext 用 `HOST` 而不是 Next.js standalone 的 `HOSTNAME`。

長期執行建議用 `launchd`（macOS）或 `pm2` 之類的程序管理器顧著。

## 資料庫（匿名統計）

SQLite 單檔，預設 `.data/mobile-pulse.sqlite`（已 gitignore），位置可用 `DATABASE_FILE` 覆寫。schema 定義於 `db/schema.ts`，migration 由 drizzle-kit 產出至 `drizzle/`。

改動 schema 後：

```bash
npm run db:generate
```

套用 migration（可重複執行，drizzle 會跳過已套用的版本）：

```bash
npm run db:migrate
```

備份就是複製那個檔案。WAL 模式下請連同 `-wal`、`-shm` 一起複製，或先讓服務停下來。

## 管理頁 `/admin`

以部署環境的管理密碼登入，查看每篇文章的瀏覽、有用、沒用、有用率與最近回饋時間（以台北時間顯示）。頁面標記 `noindex`。

需要兩個私密設定：

| 名稱 | 用途 |
| --- | --- |
| `ADMIN_PASSWORD` | 管理密碼 |
| `ADMIN_SESSION_SECRET` | 工作階段 cookie 的 HMAC 簽章金鑰 |

把 `.env.example` 複製成 `.env` 並填值（`.env*` 已在 `.gitignore`）。任一項缺失時管理頁與分析 API 一律拒絕存取（fail closed），且不透露缺的是哪一個。

### cookie 的 Secure 屬性

session cookie 只在請求本身是 https 時才加 `Secure`。這是自架必要的行為：內網通常是純 http（例如 `http://mac-mini.local:3000`），瀏覽器不會把帶 `Secure` 的 cookie 送到非安全來源，結果會是「登入回 204、管理頁卻一直 401」。

放在反向代理後面時（代理對外 https、對內以 http 轉發），用 `COOKIE_SECURE=1` 明確指定。`HttpOnly`、`SameSite=Strict`、`Path=/` 在任何情況下都不會被放掉。

### 沒有做節流

`/api/admin/login` 與 `/api/articles/*` 沒有速率限制。目前的部署前提是**只在內網或本機存取**，因此不做。

若日後要對外開放，這是必須補上的第一件事：登入端點等同開放密碼暴力破解，瀏覽與回饋端點可被灌入大量資料列。

## 回饋功能

文章頁的「♥ 有用／↓ 沒用」會匿名保存到本機 SQLite，讀者不需要登入。瀏覽器的 localStorage 只保存一個隨機產生的 `visitor_id`，不記錄姓名、Email、IP 或裝置指紋。

- 同一位讀者對同一篇文章只有一筆回饋，可改選、可再點一次取消。
- 公開 API 只回傳讀者自己的選擇，**不回傳全站票數**；彙總數字只在 `/admin` 出現。
- 瀏覽記錄的 ping 內建於 `components/Feedback.tsx`，新增文章時不需要額外加任何東西。
- 讀者的瀏覽器若封鎖 localStorage（例如無痕模式），不會記錄瀏覽，回饋也只存在於當前畫面。這是刻意的：改用臨時 ID 會讓每次重新整理都被算成新訪客。
