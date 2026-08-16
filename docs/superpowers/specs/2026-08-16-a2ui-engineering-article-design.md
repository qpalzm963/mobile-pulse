# A2UI 工程拆解文章設計

## 目標

新增一篇面向前端與 App 工程師的 MOBILE PULSE 技術文章，說明 A2UI 如何讓 agent 產生受限的宣告式 UI，而不直接取得前端程式碼與元件執行權。

讀者看完應能回答三件事：

1. A2UI 在 agent、transport、renderer 與既有 API 之間分別負責什麼。
2. 為什麼 catalog 與 renderer 是安全、設計系統與版本治理的邊界。
3. 哪一種低風險流程適合作為第一個 A2UI prototype。

## 文章定位

- 暫定標題：`一個表單怎麼從 agent 走進你的 App`
- 系列標籤：`AI 開發`、`工程實務`
- 預計閱讀時間：7 分鐘
- 語氣：工程導向、具體、不將 A2UI 描述為能任意產生或執行 UI 程式碼的框架。
- 事實來源：A2UI 官方 GitHub 專案、A2UI protocol specification 與 A2UI v0.9 A2A extension specification。
- 狀態描述：A2UI 仍為 public preview，文章須明確標註協定與 renderer 可能演進。

## 敘事結構

文章使用「使用者要完成預約」的動態表單情境做單一主線。

1. 首屏先講結論：A2UI 讓 agent 描述 UI，但 client 仍掌握可渲染元件、資料綁定、事件及副作用。
2. 以四步 trace 呈現資料流：agent 判斷文字不足、串流 UI 描述、renderer 對照 catalog 產生原生元件、使用者操作以 `userAction` 回送。
3. 解釋扁平 component list 與 `beginRendering` 的目的：讓 stream 可漸進處理，並避免初始畫面顯示不完整元件。
4. 以雙欄防線卡，區分 renderer 必須保證的行為與 agent 不應能決定的能力。
5. 收斂到導入建議：先用低風險、局部 surface 的表單或摘要卡試點，不以付款、刪除、權限異動等高風險副作用作為第一版。
6. 以三步行動清單結尾：最小 catalog、surface 狀態管理、fallback 與事件紀錄。

## 頁面與元件

新增文章路由 `app/articles/a2ui-agent-ui/page.tsx`，使用既有的 `ArticleHero`、`QuickRead`、`Feedback` 與 `ArticleToc`。

新增一個僅服務這篇文章的敘事元件：

- `A2uiTrace`：以四個順序步驟顯示 Agent → JSONL/SSE → Renderer → User action/API。每一步有角色、輸入／輸出與一行責任說明；窄螢幕改為直向閱讀。
- `ControlBoundary`：雙欄列出「Renderer 必須保證」與「Agent 不應決定」，以語意化 section 與 list 實作，不依賴 icon 或 Mermaid。

元件樣式均以 `.article-body` 作為前綴，以避免既有文章元素規則覆蓋。所有動態資料僅由靜態 props 提供；文章頁不新增 client state 或 API 呼叫。

## 資料流與失敗處理

文章描述的 A2UI 資料流不會在本專案實作 protocol client，只以讀者可理解的 trace 視覺化呈現：

`surfaceUpdate`／`dataModelUpdate` 先進入 client buffer，`beginRendering` 指定 root 後 renderer 才開始渲染；使用者互動經 `userAction` 送回 agent。

失敗邊界必須在文中明確描述：

- 未知 component 或不支援的 catalog：renderer 顯示受控 fallback 並記錄事件。
- 無效 binding：不猜測資料，保留元件安全預設值並記錄錯誤。
- 高風險 action：不得直接由 agent stream 觸發，仍須經既有 API、授權與確認流程。

## 首頁與測試

更新 `data/articles.ts`，將新文章排在現有文章前方，並提供正確 slug、發布日期、標籤、標題與摘要。

更新內容測試以驗證：

- 新 slug 可由首頁文章資料找到。
- 新頁面包含文章必要的敘事元件與可查證官方來源。
- 現有文章、分析與回饋 API 行為不受影響。

以 `npm test -- --run` 驗證既有 Node 與 Vitest 測試。若新增元件有視覺行為，再以本機瀏覽器確認桌面與手機寬度的閱讀順序。

## 非目標

- 不在本專案實作 A2UI renderer、JSONL parser、SSE transport 或 A2A agent。
- 不修改既有文章、資料庫 schema、分析與回饋 API。
- 不以 Mermaid、抽象裝飾圖或未連結來源的趨勢主張填充版面。
