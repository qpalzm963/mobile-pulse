# MOBILE PULSE

繁體中文的 App 開發技術與工具週報文章站。

## 新增文章（交給 Codex）

請直接對 Codex 說：

> 使用 last30days 與 newsletter-generation，產出一篇可發布的繁體中文 HTML 圖文文章，再新增至 MOBILE PULSE 網站。先依文章類型選擇 `docs/article-quality-standard.md` 的 HTML 敘事模組；禁止 Mermaid 與純文字長文。所有事實附原始來源，文章必須先通過該文件的發布最低門檻。

新增時請：

1. 先依文章類型選好 HTML 敘事模組（見 `docs/article-quality-standard.md`），再寫文案 —— 不是反過來。
2. 建立 `app/articles/<slug>/page.tsx`，沿用現有文章的導覽與 `Feedback` 區塊。「AI 大小事」的四個模組已是現成元件：`ArticleHero`、`QuickRead`、`EventCard`、`ImpactMatrix`（`components/`，樣式在 `app/globals.css` 的「文章敘事模組」區塊）。
3. 需要圖表時放進 `public/`。事實的出處寫在對應的模組上（例如 `EventCard` 的 `sources`），不要只在文末列一份總來源清單。
4. 在 `data/articles.ts` 加入 `slug`、`title`、`summary`、`publishedAt`、`tags`、`href`。沒登記的文章不會出現在首頁，回饋 API 也會拒絕它的 slug。
5. 執行 `npm test` 與 `npm run build`。

## 短影片（Remotion）

由主題自動查資料、產出腳本，再渲染成 9:16／16:9 短影片。詳細用法見 [`docs/remotion-video-tool.md`](docs/remotion-video-tool.md)。

```bash
npm run video:create -- --topic "Swift Concurrency"   # 查資料並覆寫 data/video-config.json
npm run video:preview                                  # Remotion Studio
npm run video:render                                   # 輸出 out/video-vertical.mp4
```

`data/video-config.json` 有進版控，而且是唯一來源 —— `remotion/Root.tsx` 靜態 import 它，沒有預設值可以退，刪掉就編不過。

內容由 `writing-short-video-script` skill 產生（`.claude/skills/`），`npm run video:create` 只是它的 headless 包裝，內部以 `claude -p` 呼叫，需要 `claude` CLI 在 PATH 上。互動式使用直接叫那個 skill 即可。

**查不到足夠資料時，skill 會停下來說明缺什麼**，`data/video-config.json` 維持原樣，指令以 exit 1 結束。不會用通用文案把重點補滿。

skill 的產出會先經 `scripts/write-video-config.mjs` 驗過 schema（重點固定 3 條、程式碼 ≤25 行且單行 ≤80 字元）才寫檔；驗不過會逐條指出是哪一欄。配色不經模型，由該腳本依主題關鍵字查表決定。

## 執行與自架

站台跑在 Node 上，不依賴任何雲端平台。

```bash
npm run dev            # 開發（含 HMR）
npm run build          # 產出 dist/standalone/
node dist/standalone/server.js
```

`PORT` 預設 3000、`HOST` 預設 `0.0.0.0`。注意 vinext 用 `HOST` 而不是 Next.js standalone 的 `HOSTNAME`。

長期執行建議用 `launchd`（macOS）或 `pm2` 之類的程序管理器顧著。

> **以服務常駐時，`DATABASE_FILE` 一定要設絕對路徑。**
> 預設值 `.data/mobile-pulse.sqlite` 是相對於工作目錄的，而 `launchd` 預設把 cwd 設成 `/`。
> 路徑不對時程式會在第一次存取資料庫就丟出錯誤，訊息裡有它實際解析到的絕對路徑 —— 那是出事時第一個要看的東西。

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
