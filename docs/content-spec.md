# MOBILE PULSE 文章發文格式規範 (Content Specification)

MOBILE PULSE 採用 **Markdown + 自訂 Shortcodes** 作為全站文章內容的 Single Source of Truth，以支援未來 Media Upload、AI / MCP 自動投稿、版本管理與審評標註。

---

## 1. 結構與 Metadata 分離

文章投稿與儲存介面遵循 `ArticleInput` 規格：

```typescript
export interface ArticleInput {
  title: string;          // 文章標題 (必填，2~200 字)
  summary?: string;        // 核心摘要 (選填，未填時自動從第一段 Markdown 擷取，上限 300 字)
  tags?: string[];        // 分類標籤陣列 (例如: ["ios", "engineering"])
  contentMarkdown: string;// 正文 Markdown + Shortcodes (必填，10~100,000 字)
  authorAlias?: string;   // 作者署名 / 匿名代號 (選填，預設 "匿名組員")
  status?: "draft" | "reviewing" | "approved" | "published" | "rejected";
}
```

---

## 2. 標準 Markdown 元素

MOBILE PULSE 支援常見 GitHub Flavored Markdown 元素：

| 語法 | 說明 | 範例 |
| :--- | :--- | :--- |
| `## 標題` | 二級大章節標題 | `## 一、 範式轉變` |
| `### 標題` | 三級子章節標題 | `### 1.1 隔離邊界` |
| `> 引用` | 重點引言區塊 | `> 嚴格並發是多核架構的基石。` |
| `**粗體**` | 強調文字 | `**Sendable**` |
| `*斜體*` | 輔助強調 | `*Isolation Domains*` |
| `` `code` `` | 行內程式碼 | `` `actor` `` |
| `[連結](url)` | 外部超連結 | `[Swift.org](https://swift.org)` |
| `![圖片](url)` | 基礎圖片 Markdown | `![架構圖](/images/arch.png)` |
| `- 清單` | 無序清單項目 | `- 盤點全域變數` |
| `1. 清單` | 有序步驟清單 | `1. 升級 Swift 6` |
| `---` | 分隔線 | 分割重要章節 |
| `| 表頭 |` | 標準資料表格 (支援靠左/置中/靠右) | `| 標題 1 | 標題 2 |` |
| ` ```lang ` | 語法高亮程式碼區塊 | 支援 swift, dart, ts, json, bash 等 |

---

## 3. MOBILE PULSE 自訂 Shortcode 語法

Shortcode 提供技術文章所需之特殊卡片與互動模組。可採用單行形式 `:::tag ... :::` 或多行區塊形式 `:::tag ... :::`。

### 3.1 終端機區塊 (`:::terminal`)
模擬 Mac / Linux 終端機樣式，用於展示編譯指令或 CLI 輸出。

```markdown
:::terminal title="swift build"
$ swift build -Xswiftc -strict-concurrency=complete
error: passing argument of non-sendable type 'UserProfile'
:::
```

### 3.2 技術選型 / 架構對比 (`:::compare`)
以雙欄結構對比舊做法 (Before ✕) 與新實務 (After ✓)。每一行以 `|` 分隔左欄與右欄內容。

```markdown
:::compare before="傳統做法 (Pre-Swift 6)" after="現代實務 (Swift 6)"
- 手動維護全域鎖，容易死鎖 | + 使用 Actor 與 Mutex，編譯期保證 Sendable
- 執行期防禦難以排查 | + 靜態推導邊界，阻斷未受保護存取
:::
```

### 3.3 演進時間軸 / 步驟說明 (`:::timeline`)
以縱向圓點時間軸展示升級順序或操作步驟。每一行使用 `- 標題 :: 說明文字`。

```markdown
:::timeline
- 步驟 1：升級依賴 :: 確保所有三方套件皆相容最新 SDK。
- 步驟 2：開啟 Strict Concurrency :: 盤點跨執行緒傳遞之型別。
- 步驟 3：重構共享狀態 :: 引入 Actor 與 Sendable 標註。
:::
```

### 3.4 關鍵指標卡片 (`:::metric`)
展示關鍵技術指標（如效能提昇、崩潰率下降等）。

```markdown
:::metric value="99.9%" label="單元測試覆蓋率" trend="up"
:::
```
* 參數：
  - `value`: 指標數字或字串（必填）
  - `label`: 指標說明文字（選填）
  - `trend`: `"up"` (綠色上升箭頭) 或 `"down"` (紅色下降箭頭)

### 3.5 提示 Callout (`:::callout`)
提供醒目的情境提示。

```markdown
:::callout type="tip"
建議在 CI/CD 流程中開啟 Strict Concurrency 檢查，避免未標註 Sendable 的程式碼併入主線。
:::
```
* 參數：
  - `type`: `"info"` (預設藍) \| `"warn"` (黃) \| `"danger"` (紅) \| `"tip"` (綠/主題藍)

### 3.6 圖片插圖 (`:::image`)
標準化圖片容器，以 Media ID 為正式主鍵規範（對齊 Issue #2 Media Collection 與圖片上傳流程），並支援說明文字（Caption）與無障礙替代文字（Alt）。

```markdown
:::image id="media_123" alt="架構示意圖" caption="圖 1：Swift 6 靜態記憶體隔離模型" size="normal" :::
```
* 參數：
  - `id`: Media 資源 ID（正式規範必填，由 Media Collection 產出，如 `media_123`）
  - `alt`: 圖片替代文字（無障礙說明與 SEO）
  - `caption`: 圖片下方說明文字（選填）
  - `size`: 尺寸預設檔（選填，支援 `small` (420px) \| `normal` (680px, 預設) \| `wide` (900px) \| `full` (100%)）
  - `width`: 自訂寬度限制（選填，如 `800px`）
  - `src`: 圖片 URL（僅作為 legacy 舊格式或內部相容 fallback，新文章請一律使用 `id`）

* 上傳規範：
  - 支援格式：PNG, JPEG, WebP（第一版 MVP 鎖定無主動腳本風險之點陣格式）
  - 驗證機制：伺服器驗證真實檔案二進位 Signature (Magic Bytes)
  - 單檔大小上限：10MB
  - 儲存位置：伺服器持久化儲存目錄 `/media`，對應 API 端點 `/api/media/:id`

### 3.7 動態互動元件 (`:::interactive`)
掛載系統註冊的 React 動態互動式架構圖或教學模組。

```markdown
:::interactive name="AgentSandboxInteractive"
:::
```

---

## 4. 摘要自動擷取規則

若作者未手動填寫 `summary`，系統將自動套用以下邏輯：
1. 忽略大標題（`#`）、代碼區塊（```` ``` ````）與自訂 Shortcode（`:::`）。
2. 抓取文章第一段實質文字內容。
3. 清除行內 Markdown 標記（如粗體、斜體、連結、圖片）。
4. 取前 140 字元作為預設摘要，超出部分以 `...` 結尾。
