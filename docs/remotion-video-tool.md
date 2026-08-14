# 主題自動生成短影片工具指南 (Remotion + Web Search)

此工具能讓您只需輸入「主題名稱」（例如：`iOS 18 SwiftData 實戰` 或 `React 19 Server Actions`），自動進行**網路即時資料檢索**、擷取關鍵重點與範例，生成動態影片腳本與 JSON 設定，並透過 **Remotion** 錄製/渲染出質感滿分的短影片！

---

## 🛠 功能亮點

1. **網路即時檢索 (Web Search Integration)**：
   - 輸入主題後，系統會自動在網絡上搜尋相關技術文獻、 release note 與程式範例，合成結構化的影片腳本。
2. **現代暗黑玻璃擬態風格 (Modern Dark Glassmorphic Theme)**：
   - 包含流暢片頭 (Intro)、條列重點卡片 (Key Points)、MacOS 風格程式碼視窗 (Code Card) 與結尾 Call-To-Action (Outro)。
   - 根據主題類型（iOS/Swift、React/Web、Android/Kotlin）自動套用調和配色方案。
3. **多尺寸支援 (9:16 & 16:9)**：
   - 預設提供 `ShortVideoVertical` (1080x1920 豎屏 Shorts/Reels/TikTok) 與 `ShortVideoHorizontal` (1920x1080 橫屏)。

---

## 🚀 快速使用三步驟

### 步驟 1：輸入主題並自動搜尋生成腳本

在終端機中執行：

```bash
npm run video:create -- --topic "您的主題名稱"
```

*範例：*
```bash
npm run video:create -- --topic "SwiftUI AsyncImage 最佳實踐"
```

系統會查 Hacker News 與 DuckDuckGo，並把生成結果**覆寫**進 `data/video-config.json`。

> 若搜尋取到的標題不足 3 條，指令會印出 `⚠️ 搜尋只取到 N 條可用標題`，缺的重點會用通用文案補滿。
> 那幾句不是查到的內容，發布前務必自己改寫。中文主題較容易觸發這個狀況，可改用英文關鍵字重跑。

---

### 步驟 2：開啟 Remotion Studio 實時編輯與預覽

執行以下指令開啟 Remotion 視覺化瀏覽器面板：

```bash
npm run video:preview
```

在 Remotion Studio 中，您可以：
- 逐幀撥放與檢查動畫效果。
- 切換 9:16 (Vertical) 或 16:9 (Horizontal) 檢視。
- 直接修改 `data/video-config.json` 的文字與時間，畫面會**即時熱重載 (Hot Reload)**！

---

### 步驟 3：渲染輸出高畫質 MP4 影片

- **輸出 9:16 直向短影片 (Reels / Shorts / TikTok)**：
  ```bash
  npm run video:render
  ```
  *輸出位置：`out/video-vertical.mp4`*

- **輸出 16:9 橫向影片 (YouTube / 簡報)**：
  ```bash
  npm run video:render:horizontal
  ```
  *輸出位置：`out/video-horizontal.mp4`*

---

## 🎨 影片 JSON 設定結構說明 (`data/video-config.json`)

您可以在生成的 `data/video-config.json` 中手動微調主題顏色與內文：

```json
{
  "topic": "SwiftUI AsyncImage 最佳實踐",
  "fps": 30,
  "theme": {
    "primaryColor": "#3B82F6",
    "secondaryColor": "#8B5CF6",
    "backgroundColor": "#090D16",
    "textColor": "#F8FAFC",
    "cardBg": "rgba(15, 23, 42, 0.75)"
  },
  "scenes": [
    {
      "id": "scene-1",
      "type": "intro",
      "title": "SwiftUI AsyncImage",
      "subtitle": "還在苦惱列表圖片載入卡頓？",
      "durationInSeconds": 3.5,
      "badge": "最新技術速遞"
    },
    {
      "id": "scene-2",
      "type": "keypoint",
      "title": "💡 3 大亮點與重點摘要",
      "highlights": [
        "自訂 Cache 策略",
        "Phase 狀態掌控",
        "Downsampling 降採樣"
      ],
      "durationInSeconds": 5.5,
      "badge": "Core Highlights"
    }
  ]
}
```

---

## ⚠️ 幾個需要知道的約束

**`data/video-config.json` 是唯一來源，而且有進版控。**
`remotion/Root.tsx` 直接靜態 import 它，沒有預設值可以退。刪掉這個檔案 = 預覽與渲染直接編譯失敗。
影片內容本身就是每期的產出，跟著 commit 走是刻意的。

**影片沒有捲軸，塞不下就是被裁掉。**
`CodeCard` 會依「最長一行的字元數」與「總行數」自動把程式碼字級縮到塞得下（22px 起跳，最小 11px），
9:16 與 16:9 各自計算。但字級有下限，**程式碼片段仍請控制在 25 行以內、單行 80 字元以內**，
否則會縮到看不清楚。

**場景重點固定取 3 條。**
`keypoint` 場景的版面是為 3 張卡設計的，生成器只會寫入前 3 條；手動加到第 4 條會超出畫面。
