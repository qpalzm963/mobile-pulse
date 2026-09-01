# MOBILE PULSE

繁體中文的 App 開發技術與工具週報文章站。

## 文章投稿與同儕審評

透過前台投稿中心（`/submit`）或編輯工作台提交文章草稿，並進入同儕審評大廳（`/reviews`）進行審查與回饋。

流程規範：

1. **草稿提交**：於 `/submit` 輸入標題、摘要、分類標籤與正文內容，存為草稿或直接送交審評。
2. **同儕審評**：於 `/reviews` 大廳檢視送審文章，提供評分、標註與改善建議。
3. **正式發布**：審核通過後由編輯部排程上線，文末包含匿名讀者回饋機制（`<Feedback />`）。

## 執行與自架

站台跑在 Node 上，不依賴任何雲端平台。

### Docker 部署（推薦）

```bash
# 1. 複製設定檔並填入密碼
cp .env.example .env

# 2. 一鍵建置並於背景啟動
docker compose up -d --build

# 3. 查看運行日誌
docker compose logs -f
```

- 資料庫檔案會自動持久化掛載於主機的 `./data` 目錄下。
- 新增文章後，只需 `git pull && docker compose up -d --build` 即可無縫更新。

### 本機原生執行

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
