# 內容節奏與極簡統計：設計規格

版本：v2（已納入工程 review 修正）
狀態：待實作

## 目的

讓 MOBILE PULSE 以固定節奏、品質門檻產出不同類型的文章，並在不要求讀者登入的情況下，保存匿名文章瀏覽與有用／沒用回饋，供站長在簡單管理頁查看。

## 讀者與站長

- 主要讀者是需要可直接採用資訊的 App 工程師；技術主管與產品經理也能理解其影響與取捨。
- 讀者公開瀏覽文章，不建立帳號、不要求登入。
- 站長以部署環境的管理密碼登入 `/admin` 查看統計。

## 內容類型與發布規則

### AI 大小事

- 頻率：每週一進行一次產文。
- 主題：近期熱門、具影響力或有趣的 AI 事件。
- 發布品質門檻：至少三則有明確來源且值得分享的事件才發布。
- 每則內容包含：事件摘要、為何值得在意、對開發／產品可能的影響、來源。

### GitHub 雙週雷達

- 頻率：每兩週一次。
- 主題：近期竄升、熱門或討論度高的 GitHub Skill 與專案。
- 發布品質門檻：至少三個具備明確熱度或討論脈絡的項目才發布。
- 每個項目包含：解決的問題、變熱原因、適用情境、最短上手方式、來源。

### Flutter 專欄

- 頻率：每兩週檢查一次。
- 主題：Flutter 更新、套件、實作技巧、架構與跨平台取捨。
- 發布品質門檻：內容需足以構成有實作價值的主題；若只有零碎訊息，累積到下次檢查，必要時改為月刊。

### 實戰拆解

- 頻率：每月一篇。
- 主題：單一 App 開發問題的完整拆解，例如啟動速度、離線同步、AI 功能上線。
- 發布品質門檻：必須包含可複製的實作範例。只有結論、心得或流程描述而無可執行範例，累積到下個月，不勉強出刊。
- 每篇內容包含：選擇（面對哪些方案、為何這樣選）、做法、踩坑、可複製範例、來源。

此類文章壽命長，是累積搜尋流量的主要來源，因此門檻是深度而非數量：其他三類以「至少三則」把關，這一類以「有沒有可複製的東西」把關。寧可缺一個月，不可出一篇沒有範例的。

首頁不顯示任何下一次掃描或發布日期；排程由站長自行設定執行。

## 前置作業

統計功能依賴 Cloudflare D1，而目前專案尚未開通。實作必須從這裡開始，順序不可調換。

1. `.openai/hosting.json` 的 `d1` 由 `null` 改為 `"DB"`。此欄位驅動 `vite.config.ts` 的 `localBindingConfig.d1_databases`；維持 `null` 會讓 `env.DB` 為 undefined，`db/index.ts` 的 `getDb()` 直接 throw。
2. 於 `db/schema.ts` 定義下方兩張表，執行 `npm run db:generate` 產出第一版 migration（`drizzle/meta/_journal.json` 目前為空）。
3. 在 README 明確記錄 migration 於本機與正式環境各自的套用指令。
4. `ADMIN_PASSWORD` 與 `ADMIN_SESSION_SECRET` 在本機開發時走 `.dev.vars`（已實測確認可進入 `env`）。注意 `.gitignore` 的 `.env*` **不會**匹配 `.dev.vars`，必須另外加一行，否則密文會進版控。

## 資料流

```
讀者瀏覽器                        Worker / D1
──────────                        ───────────
localStorage
 visitor_id ──┐
 (UUID，首次)  │
              ├─► POST /api/articles/[slug]/view
              │     ├─ slug 不在 ARTICLES → 400
              │     └─ INSERT ... ON CONFLICT DO NOTHING
              │
              ├─► GET  /api/articles/[slug]/feedback → 只回自己的選擇
              └─► POST /api/articles/[slug]/feedback
                    ├─ useful / not_useful → UPSERT
                    └─ clear               → DELETE

站長 ──► POST /api/admin/login  ── HMAC 簽章 cookie（Path=/）─┐
     ──► GET  /api/admin/analytics ◄──────────────────────────┘
```

## 統計資料模型

統計後端只保存必要資料，文章內文本體維持在現有靜態網站檔案。

### `article_views`

| 欄位 | 說明 |
| --- | --- |
| `id` | 內部流水號 |
| `article_slug` | 文章識別 |
| `visitor_id` | 瀏覽器隨機產生的匿名 ID |
| `view_day` | UTC 日期字串（`YYYY-MM-DD`） |
| `created_at` | 記錄時間 |

- 必須建立 `UNIQUE INDEX (article_slug, visitor_id, view_day)`。唯一性由資料庫保證，不可只以應用層的「先查再寫」實作，否則同一次重整的併發請求會寫入兩筆。
- 寫入一律使用 `INSERT ... ON CONFLICT DO NOTHING`。

### `article_feedback`

| 欄位 | 說明 |
| --- | --- |
| `article_slug` | 文章識別 |
| `visitor_id` | 瀏覽器匿名 ID |
| `reaction` | `useful` 或 `not_useful` |
| `updated_at` | 最後選擇時間 |

- 主鍵為 `(article_slug, visitor_id)`，同一讀者對同一篇文章最多一筆。
- 改選使用 `ON CONFLICT DO UPDATE`；取消（`clear`）使用 `DELETE`。

### 時區

`view_day` 一律以 UTC 產生並儲存，確保去重邏輯不受時區換算影響。管理頁顯示「最近回饋時間」時再轉換為 Asia/Taipei，不在資料庫層做時區處理。

## 管理登入

- 管理密碼不寫進程式碼或資料庫，由部署環境的私密 `ADMIN_PASSWORD` 提供；session 簽章使用另一個私密 `ADMIN_SESSION_SECRET`。
- 登入成功後設定簽章、短效的 HTTP-only cookie。
- Cookie 屬性：`Path=/`、`HttpOnly`、`Secure`、`SameSite=Strict`。
  Cookie **不可**設為 `Path=/admin`：分析端點位於 `/api/admin/analytics`，該路徑不在 `/admin` 之下，cookie 不會被送出，登入會成功但管理頁必定 401。
- 簽章使用 Workers 內建 WebCrypto 的 HMAC-SHA256，不自行實作雜湊。
- 密碼比對與簽章驗證都比對 HMAC 摘要，不直接以字串相等比較原始值，避免時間差資訊洩漏。

## API 與頁面

| 端點 | 行為 |
| --- | --- |
| `POST /api/articles/[slug]/view` | 建立或忽略當日重複瀏覽；不回傳讀者資料 |
| `POST /api/articles/[slug]/feedback` | 接受 `useful`、`not_useful`、`clear`，更新該匿名讀者的回饋；其他值回 400 |
| `GET /api/articles/[slug]/feedback` | 只回傳該讀者目前的選擇，**不回傳全站總數** |
| `GET /admin` | 未登入時顯示密碼頁；登入後顯示文章統計表 |
| `POST /api/admin/login` | 驗證密碼並設定 cookie |
| `POST /api/admin/logout` | 清除 cookie |
| `GET /api/admin/analytics` | 僅限已登入站長，回傳每篇文章的瀏覽、有用、沒用、有用率、最近回饋時間 |

### 共同規則

- 所有 `/api/articles/*` 端點必須以 `data/articles.ts` 的 `ARTICLES` 驗證 `slug`，不在清單中即回 400。未驗證會讓任意字串都能建立資料列，造成資料表無上限成長。
- `visitor_id` 在 POST 走 JSON body、在 GET 走 `X-Visitor-Id` 標頭，一律不放進 query string：query string 會讓這個匿名識別碼進入伺服器記錄與 referrer。
- 公開 API 不回傳彙總票數。總數只在通過管理登入的 `GET /api/admin/analytics` 出現。理由：站長無法審核或回應公開的負面票數，而規格本身已承認匿名 ID 擋不住惡意灌票。

## 用戶端行為

### `visitor_id`

- 首次瀏覽時以 `crypto.randomUUID()` 產生，存於 localStorage。
- **localStorage 不可用時（無痕模式、瀏覽器封鎖儲存），不得產生臨時 UUID**，必須略過 view ping，回饋改為僅存在於當前畫面的狀態。
  若在此情況下每次載入都生成新 UUID，每次重整都會被計為新訪客，直接違反「重整不增加」的驗收標準，且不會有任何錯誤訊息。
- 現有 `components/Feedback.tsx` 已有 storage 失敗即靜默降級的處理，新程式沿用同一模式。

### View ping 的掛載位置

view ping 實作於既有的 `<Feedback slug>` 元件內部，不新增需要逐篇文章手動加入的元件。文章頁為手寫 TSX，任何「每篇要記得加」的步驟都會被遺漏。README 的新增文章流程因此維持四步不變。

ping 必須為 fire-and-forget：失敗不阻擋渲染、不拋出、不顯示錯誤。

### 舊有回饋資料

既有讀者瀏覽器中的 `mobile-pulse-feedback` localStorage 資料**不遷移**。該資料沒有對應的 `visitor_id`，無法歸戶。舊 key 留置不處理，伺服器狀態為唯一真實來源。

## 濫用防護

- `/api/articles/*` 與 `/api/admin/login` 掛上 Cloudflare 邊緣 Rate Limiting 規則。
- 此作法不需應用程式碼，也不儲存任何 IP，與下方隱私限制不衝突。
- `/api/admin/login` 無節流等同開放密碼暴力破解；寫入端點無節流則直接對應 D1 寫入配額與成本。

## 隱私與限制

- 不記錄姓名、Email、IP、裝置指紋或第三方追蹤資訊。
- `visitor_id` 為首次瀏覽時建立的隨機 UUID，僅保存在同一瀏覽器。
- 匿名識別可降低重複計數，不能視為防止惡意灌票的安全機制。
- 首版不做圖表、匯出、分群、埋點事件或讀者帳號。

## 測試

測試框架採用 `vitest` 搭配 `@cloudflare/vitest-pool-workers`，以 Miniflare 的記憶體 D1 實際執行 SQL。現有 `tests/content.test.mjs` 的 regex 掃檔案方式無法驗證 upsert、去重、cookie 驗證等行為，保留但不擴充。

### 必要覆蓋

```
[+] POST /api/articles/[slug]/view
  ├── slug 不在白名單 → 400
  ├── 首次寫入 → 1 筆
  ├── 同日重複 → 仍 1 筆
  ├── 兩個併發請求 → 仍 1 筆
  └── 隔日再訪 → 2 筆

[+] POST /api/articles/[slug]/feedback
  ├── useful 首次 → INSERT
  ├── 改選 not_useful → UPDATE，仍 1 筆
  ├── clear → DELETE
  └── 非法 reaction → 400

[+] GET /api/articles/[slug]/feedback
  └── 只回自己的選擇，回應中不含總數

[+] /api/admin/*
  ├── 錯誤密碼 → 401 且不設 cookie
  ├── 正確密碼 → 設定 cookie，屬性含 Path=/ HttpOnly Secure SameSite=Strict
  ├── 未登入呼叫 analytics → 401
  ├── 竄改簽章 → 401
  ├── 過期 cookie → 401
  └── analytics 聚合正確，含零回饋文章

[+] visitor_id 取得邏輯（抽為純函式後單測）
  └── storage 不可用 → 回傳 null，不產生臨時 UUID

[+] components/Feedback.tsx
  └── 回歸：tests/content.test.mjs 目前斷言 `mobile-pulse-feedback`
      與 `reaction === next ? null : next`，改為伺服器回饋後必然失敗，
      須於同一次變更中更新。
```

回歸項目為必要，不可延後。

## 不在範圍

| 項目 | 理由 |
| --- | --- |
| 舊 localStorage 回饋遷移 | 無 `visitor_id` 可對應，資料無法歸戶 |
| 瀏覽資料保留策略與彙總表（rollup） | 現行量級下原始表可支撐數年，過早最佳化 |
| 防灌票的身分驗證機制 | 以邊緣節流降低而非杜絕，規格已承認此限制 |
| 管理頁圖表、匯出、分群、埋點 | 首版明確排除 |
| 公開顯示彙總票數 | 已改為僅管理端可見 |

## 實作順序

```
階段 A：D1 開通 + schema + migration        （阻塞後續全部）
   ↓
階段 B：讀者端 API + Feedback 改寫 + 測試   ┐ 互不相交，可並行
階段 C：管理端 auth + /admin 頁 + 測試      ┘
```

B 與 C 僅在 `db/schema.ts` 交會，而該檔於階段 A 即定版，並行不會衝突。

## 驗收標準

- 每篇文章首次瀏覽會增加一筆當日匿名瀏覽；重整不增加。
- localStorage 不可用時不寫入瀏覽紀錄，且頁面功能不受影響。
- 有用／沒用可寫入、改選與取消，並在重新整理後保留。
- 公開回饋 API 不回傳全站彙總票數。
- 未列於 `ARTICLES` 的 slug 無法建立任何資料列。
- 管理頁需密碼；未登入不得取得分析 API，且登入後分析 API 確實可取得（cookie 路徑正確）。
- 管理頁每篇顯示瀏覽、有用、沒用、有用率、最近回饋時間，時間以 Asia/Taipei 呈現。
- 密碼與 session secret 均只從部署私密設定讀取。
- 上述測試覆蓋全數通過，含 `Feedback.tsx` 的回歸測試更新。
- 現有首頁、標籤篩選、文章網址與新增文章流程維持可用。
