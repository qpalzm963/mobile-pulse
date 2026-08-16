# A2UI Flutter 新手教學重寫設計

## 目標

重寫既有 A2UI 技術文章，使已具 Flutter 經驗、但不熟 A2UI 的讀者，能在前兩個段落建立正確心智模型，再接觸 protocol 名詞。

重寫後的核心結論不變：A2UI 讓 agent 傳遞受限的宣告式 UI 描述；Flutter app 的 renderer、widget allowlist、callback、既有 API 與授權流程仍掌握最終控制權。

## 讀者路徑

文章不再以 `surfaceUpdate`、`dataModelUpdate`、`catalog` 與 `renderer` 開場，而改為以下順序：

1. 先用一句白話定義 A2UI：agent 說想要什麼 UI，Flutter app 決定如何使用自己的 widget 呈現。
2. 以 Flutter 對照表翻譯四個概念：UI 描述 JSON、widget factory、允許的 widget 清單、callback event。
3. 以「模型直接回傳 Dart」與「模型回傳 JSON、app 選 widget」的短對比，說明為何需要此邊界。
4. 用預約表單講完整流程：對話補資料、顯示日期與人數欄位、使用者點送出、既有 API 執行預約。
5. 僅在流程已理解後，於括號引入正式協定名稱：`surfaceUpdate`、`dataModelUpdate`、`beginRendering`、`userAction`。
6. 收斂到 Flutter renderer 的 fallback、action allowlist 與低風險 prototype 建議。

## 頁面調整

保留現有文章路由、首頁資料、來源、回饋與 `A2uiTrace`／`ControlBoundary` 元件；不新增後端、資料庫或互動功能。

新增一個純呈現元件 `FlutterConceptMap`，以四列對照表呈現 A2UI 概念與 Flutter 直覺：

- A2UI UI 描述 JSON：遠端傳來的 UI 設定，不是 Dart 原始碼。
- Renderer：根據設定建立 widget tree 的受限制 factory。
- Catalog：可被 factory 使用的已批准 widget 與 props 清單。
- User action：如 `onPressed` 的 callback 所產生、送回 agent 或既有 application flow 的事件。

將 `FlutterConceptMap` 放在第一個章節，`A2uiTrace` 改用較白話的標題與文字，並在每步末尾才出現 protocol 名稱。`ControlBoundary` 的條目改為具體 Flutter 行為，例如未知 widget 不渲染、未列入 catalog 的 widget 不出現、`onPressed` 不直接繞過付款或授權。

## 可驗證性

內容測試新增或更新下列檢查：

- 新頁面使用 `FlutterConceptMap`、`A2uiTrace`、`ControlBoundary`。
- 首段或 QuickRead 含「不是 Dart 原始碼」的白話說明。
- 官方 A2UI、Flutter GenUI 與 A2UI v0.9 source links 保留。

執行 `npm test -- --run`、`npx tsc --noEmit`、新文章及新增元件的 ESLint，並以本機路由確認桌面與窄螢幕的閱讀順序。

## 非目標

- 不簡化或刪除 A2UI 的安全邊界。
- 不假裝 A2UI 是 Flutter runtime、AI SDK 或自動產生 Dart 的工具。
- 不在此專案實作 A2UI renderer 或 Flutter GenUI 整合。
