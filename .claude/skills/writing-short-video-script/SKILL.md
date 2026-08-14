---
name: writing-short-video-script
description: Use when the user gives a tech topic and wants a mobile-pulse short video, a video script, or data/video-config.json regenerated — including when they run `npm run video:create`, ask to 做短影片 / 生影片腳本 / 更新影片內容, or want the Remotion preview to show a new topic.
---

# 寫 mobile-pulse 短影片腳本

## Overview

把一個技術主題變成 4 個場景的影片內容，餵給 `scripts/write-video-config.mjs`。
腳本負責驗證與配色，你負責內容：查到真的東西，寫成看得懂的重點與能跑的程式碼。

**配色不是你的工作。** `theme` / `fps` / `id` 由腳本依主題查表決定，payload 帶了會被擋下來。

## 流程

1. **確認主題**。使用者沒給就問，不要自己挑。
2. **查資料**。用 WebSearch 找來源，再用 WebFetch **讀進內文** —— 標題和摘要不夠，
   你要寫的重點與程式碼必須來自你實際讀過的段落。
3. **組出 payload**（見下方契約）。
4. **餵給腳本**：

   ```bash
   node scripts/write-video-config.mjs < /tmp/video-payload.json
   ```

5. **exit 1 就修**。stderr 會逐條指名哪一欄不合格。改完重跑，不要繞過腳本自己寫
   `data/video-config.json`。
6. **回報**：主題、四個場景各一行、以及重點與程式碼分別出自哪個來源網址。

## 內容契約

payload 是一個 JSON 物件，`scenes` 剛好 4 個、型別固定為
`intro → keypoint → code → outro`：

```json
{
  "topic": "SwiftUI Observable",
  "mainTitle": "SwiftUI 的新觀察機制\n少寫一半樣板碼",
  "subtitle": "MOBILE PULSE • 硬核技術拆解",
  "tags": ["SwiftUI", "iOS", "Observation"],
  "scenes": [
    {
      "type": "intro",
      "title": "@Observable 到底改了什麼",
      "subtitle": "從 ObservableObject 到 Observation 框架的實際差異",
      "durationInSeconds": 3.5,
      "badge": "硬核技術速遞"
    },
    {
      "type": "keypoint",
      "title": "💡 三個關鍵改變",
      "highlights": [
        "不再需要 @Published，屬性預設就被追蹤",
        "只有真正讀取到的屬性才會觸發重繪，減少無效更新",
        "支援非 class 之外的巢狀型別，狀態拆分更自由"
      ],
      "durationInSeconds": 6,
      "badge": "Technical Highlights"
    },
    {
      "type": "code",
      "title": "💻 實際寫起來的樣子",
      "subtitle": "宣告端與使用端都變短",
      "language": "swift",
      "codeSnippet": "@Observable\nfinal class Counter {\n  var count = 0\n}\n\nstruct CounterView: View {\n  @State private var model = Counter()\n\n  var body: some View {\n    Button(\"\\(model.count)\") { model.count += 1 }\n  }\n}",
      "durationInSeconds": 7,
      "badge": "Live Code Example"
    },
    {
      "type": "outro",
      "title": "MOBILE PULSE",
      "subtitle": "每週精煉最硬核的 App & AI 技術動態",
      "highlights": ["訂閱 MOBILE PULSE 週報", "獲得硬核技術解析"],
      "durationInSeconds": 3.5,
      "badge": "Stay Ahead"
    }
  ]
}
```

| 欄位 | 規則 | 為什麼 |
|------|------|--------|
| `scenes` | 剛好 4 個，型別順序固定 | 版面元件按 type 分派 |
| `keypoint.highlights` | **剛好 3 條** | 第 4 條會超出畫面 |
| `code.codeSnippet` | **≤ 25 行、單行 ≤ 80 字元** | 影片沒有捲軸，過長會縮到看不清楚 |
| `code.language` | 必填 | 語法高亮要用 |
| `durationInSeconds` | > 0 的數字 | 總長 = 各場景相加 |
| `theme` / `fps` / `id` | **不要給** | 腳本依主題查表決定 |

重點每條寫成一句完整的話（20–40 字），講「改了什麼、影響是什麼」，
不要只貼標題或版本號。

## 硬規則：查不到就說查不到

**查不到就回報查不到，不准編。** 這條沒有例外。

- 找不到足夠材料寫滿 3 條重點 → **停下來告訴使用者查到什麼、缺什麼**，
  請他縮小主題或給來源。不要用通用句子補滿。
- 找不到真實可跑的程式碼 → 停下來問。不要寫 `executeTask` / `processPipeline`
  這種示意用的假 API。
- `codeSnippet` 必須是該主題**真實存在的 API**，型別與參數要對得上你讀到的文件。

| 藉口 | 現實 |
|------|------|
| 「先放通用文案，之後再改」 | 沒有之後。影片會就這樣被渲染出去。 |
| 「這個 API 我很熟，不用查」 | 熟的是舊版。版本一改參數就變了，查。 |
| 「示意用的程式碼讀者看得懂」 | 假 API 貼進編輯器就爆掉，這是硬核頻道的信任問題。 |
| 「只差第 3 條，湊一下」 | 湊出來的那條就是整支影片唯一的錯誤來源。 |
| 「腳本沒擋就是可以」 | 腳本只擋得住行數和條數，擋不住你編的內容。 |

## Red Flags —— 看到就停

- 想寫「最新 API 與標準發布」「效能瓶頸解決」這類填空句
- 程式碼裡出現你沒在任何來源看過的函式名
- 只讀了搜尋結果的標題和一句摘要就開始寫
- 想直接編輯 `data/video-config.json` 繞過驗證腳本

**以上任一項出現，代表資料不夠 —— 回頭查，或告訴使用者查不到。**

## 常見錯誤

- **刪掉 `data/video-config.json`** → `remotion/Root.tsx` 靜態 import 它，
  刪掉會編譯失敗。永遠用腳本覆寫，不要 rm。
- **`mainTitle` 塞太長** → 用 `\n` 自己斷行，一行約 12–16 個中文字。
- **重點寫成標題** → 「Swift 6.1 發布」是標題；「Swift 6.1 把 strict concurrency
  預設打開，舊專案要補 @MainActor」才是重點。

## 驗收

寫完跑 `npm run video:preview` 目測；要快速確認單一場景，用
`npx remotion still remotion/index.ts ShortVideoVertical out/check.png --frame=N`
抓單幀，比全片渲染快非常多。
