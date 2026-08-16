# A2UI Flutter 新手重寫 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將既有 A2UI 文章重寫成 Flutter 對照表優先的教學，讓不熟 A2UI 的 Flutter 工程師先理解角色分工，再接觸協定名詞。

**Architecture:** 新增 `FlutterConceptMap` 作為純呈現的四列對照表，置於文章第一章；文章與既有 `A2uiTrace`、`ControlBoundary` 將用白話敘事呈現預約表單流程。首頁資料、回饋與官方來源保持不變，測試只檢查新手教學模組與關鍵文案是否存在。

**Tech Stack:** React 19、TypeScript、Vinext、CSS、Node test、Vitest。

---

## File structure

- Create: `components/FlutterConceptMap.tsx` — A2UI 與 Flutter 心智模型的四列對照表。
- Modify: `components/A2uiTrace.tsx` — 將協定名詞移至每一步的次要說明，讓白話流程優先。
- Modify: `components/ControlBoundary.tsx` — 改為具體 Flutter renderer、catalog、`onPressed` 的邊界。
- Modify: `app/articles/a2ui-flutter-renderer/page.tsx` — 以 Flutter 對照表與「JSON，不是 Dart」的教學順序改寫。
- Modify: `app/globals.css` — 對照表的桌面／手機閱讀樣式。
- Modify: `tests/content.test.mjs` — 驗證新手教學元件與關鍵白話說明。

### Task 1: Add the failing teaching-content test

**Files:**

- Modify: `tests/content.test.mjs`

- [ ] **Step 1: Extend the A2UI article test**

In the existing `the A2UI Flutter article is published with its teaching modules and official sources` test, add these assertions after the existing module assertions:

```js
assert.match(article, /<FlutterConceptMap \/>/);
assert.match(article, /不是 Dart 原始碼/);
assert.match(article, /先用 Flutter 的方式理解 A2UI/);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: FAIL because `FlutterConceptMap` and the new teaching copy do not exist.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/content.test.mjs
git commit -m "test: 補上 A2UI Flutter 新手教學契約"
```

### Task 2: Add the Flutter concept map and simplify visual modules

**Files:**

- Create: `components/FlutterConceptMap.tsx`
- Modify: `components/A2uiTrace.tsx`
- Modify: `components/ControlBoundary.tsx`

- [ ] **Step 1: Create the four-row concept map**

Create `components/FlutterConceptMap.tsx`:

```tsx
const CONCEPTS = [
  {
    a2ui: "UI 描述 JSON",
    flutter: "遠端傳來的 UI 設定",
    detail: "它說要顯示日期欄位和按鈕，不是傳一段 Dart 原始碼。",
  },
  {
    a2ui: "Renderer",
    flutter: "受限制的 widget factory",
    detail: "它讀設定後，只能建立你已經寫好、允許使用的 widget tree。",
  },
  {
    a2ui: "Catalog",
    flutter: "widget allowlist",
    detail: "它列出 agent 可以要求的 widget、props 與 action 範圍。",
  },
  {
    a2ui: "User action",
    flutter: "像 onPressed 的回傳事件",
    detail: "使用者操作回到你的 callback 與既有 API 流程，不會直接執行副作用。",
  },
];

export function FlutterConceptMap() {
  return (
    <section className="flutter-concept-map" aria-labelledby="flutter-concept-map-title">
      <p className="eyebrow">先用 Flutter 的方式理解 A2UI</p>
      <h3 id="flutter-concept-map-title">它不是新 UI framework，而是一份 UI 契約</h3>
      <dl>
        {CONCEPTS.map((concept) => (
          <div key={concept.a2ui}>
            <dt>{concept.a2ui}</dt>
            <dd>
              <strong>{concept.flutter}</strong>
              <span>{concept.detail}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite trace labels in `components/A2uiTrace.tsx`**

Keep the existing four steps and accessibility structure. Replace the `detail`/`handoff` values so each step teaches the human flow first and puts protocol terminology last:

```tsx
{
  number: "01",
  role: "使用者與 agent",
  title: "聊天內容還不夠",
  detail: "使用者想訂位，但日期與人數不能安全地靠猜；agent 因此請 App 顯示一個表單。",
  handoff: "正式名稱：agent 產生 UI 描述",
},
{
  number: "02",
  role: "Flutter App 收資料",
  title: "收到的是設定，不是 Dart",
  detail: "App 收到欄位、初始值與按鈕的描述，先保存在自己的資料模型，還不急著畫畫面。",
  handoff: "正式名稱：surfaceUpdate、dataModelUpdate",
},
{
  number: "03",
  role: "Flutter renderer",
  title: "只選 App 允許的 widget",
  detail: "renderer 用你列好的 allowlist，把日期欄位、人數選擇器與按鈕組成 widget tree；陌生元件不會被硬畫。",
  handoff: "正式名稱：beginRendering 後從 root 開始 render",
},
{
  number: "04",
  role: "使用者操作",
  title: "送出仍走你的 callback 與 API",
  detail: "按下送出只會回傳一個事件；真正的預約、登入與權限檢查照舊由既有流程處理。",
  handoff: "正式名稱：userAction",
},
```

Change the section heading to `一個訂位表單怎麼在 Flutter App 出現`.

- [ ] **Step 3: Rewrite `components/ControlBoundary.tsx` list text**

Replace the guarantee list with:

```tsx
const RENDERER_GUARANTEES = [
  "catalog 沒列出的 widget 不渲染；未知元件顯示安全 fallback。",
  "資料不足或 binding 找不到時，不自行猜值或執行額外邏輯。",
  "onPressed 只回傳受允許的 action，並交給既有 callback／API 流程。",
];
```

Replace the limits list with:

```tsx
const AGENT_LIMITS = [
  "不能傳入或執行任意 Dart 原始碼。",
  "不能讀取 token、裝置能力或 app 私有狀態。",
  "不能用一個 action 跳過付款確認、server-side authorization 或刪除防護。",
];
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: still FAIL because the article page does not yet import and render `FlutterConceptMap`.

- [ ] **Step 5: Commit the module changes**

```bash
git add components/FlutterConceptMap.tsx components/A2uiTrace.tsx components/ControlBoundary.tsx
git commit -m "feat: 調整 A2UI Flutter 新手教學模組"
```

### Task 3: Rewrite the article in Flutter-first order

**Files:**

- Modify: `app/articles/a2ui-flutter-renderer/page.tsx`

- [ ] **Step 1: Add the new component import and QuickRead**

Add this import:

```tsx
import { FlutterConceptMap } from "../../../components/FlutterConceptMap";
```

Replace `QuickRead.items` with:

```tsx
items={[
  "A2UI 傳來的是「想顯示什麼」的 JSON，不是要你的 Flutter App 執行 Dart 原始碼。",
  "你可以把 renderer 想成受限制的 widget factory：只會從 app 允許的清單選 widget。",
  "使用者點按後仍走既有 onPressed、API、登入與授權流程；A2UI 不會取代它們。",
]}
```

- [ ] **Step 2: Replace article sections with Flutter-first teaching order**

Place this first heading and body immediately after the lead:

```tsx
<h2>01 / 先用 Flutter 的方式理解 A2UI</h2>
<p>
  先別把 A2UI 想成 AI 幫你生畫面。對 Flutter 工程師來說，它更像是後端傳來一份「這次需要哪些欄位與按鈕」的設定，而你 App 裡的 factory 依設定建立 widget tree。
</p>
<p>
  關鍵是 factory 不會隨便建立任何東西：它只用團隊允許的 widget，也只把事件接到你預先設好的 callback。A2UI 因此不是 Dart code generator，而是 agent 與 App 之間的一份 UI 契約。
</p>
<FlutterConceptMap />
```

Follow it with a short `02 / 為什麼不直接讓模型回 Dart` section that contrasts arbitrary code with JSON + local widget selection. Then keep the trace under `03 / 用訂位表單走一次流程`, followed by `04 / 哪些控制權必須留在 Flutter App`, rendering `ControlBoundary`. Retain the prototype and action sections as `05` and `06`, but replace their opening sentences with plain-language text and only show `catalog` in parentheses after the allowlist explanation. Keep the existing three official source links and `Feedback` unchanged.

- [ ] **Step 3: Run the focused content test**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: PASS with 3 tests.

- [ ] **Step 4: Commit the article rewrite**

```bash
git add app/articles/a2ui-flutter-renderer/page.tsx tests/content.test.mjs
git commit -m "feat: 重寫 A2UI Flutter 新手文章"
```

### Task 4: Style the concept map and verify the rewrite

**Files:**

- Modify: `app/globals.css`

- [ ] **Step 1: Add scoped concept-map styles before the mobile media query**

```css
.article-body .flutter-concept-map{margin:24px 0 30px;border:1px solid var(--rule);border-radius:4px;background:var(--card);padding:20px 22px}
.article-body .flutter-concept-map h3{font:600 18px/1.4 var(--sans);letter-spacing:-.01em;color:var(--ink);margin:6px 0 18px}
.article-body .flutter-concept-map dl{margin:0;border-top:1px solid var(--rule)}
.article-body .flutter-concept-map dl>div{display:grid;grid-template-columns:145px minmax(0,1fr);gap:16px;padding:13px 0;border-bottom:1px solid var(--rule)}
.article-body .flutter-concept-map dt{font:500 11px/1.5 var(--mono);letter-spacing:.06em;color:var(--accent)}
.article-body .flutter-concept-map dd{margin:0}
.article-body .flutter-concept-map dd strong{display:block;font:600 14px/1.45 var(--sans);color:var(--ink);margin-bottom:3px}
.article-body .flutter-concept-map dd span{display:block;font:400 13px/1.75 var(--sans);color:#2b2c30}
```

- [ ] **Step 2: Add the mobile rule inside the existing media query**

```css
.article-body .flutter-concept-map{padding:18px}
.article-body .flutter-concept-map dl>div{grid-template-columns:1fr;gap:4px}
```

- [ ] **Step 3: Run automated verification**

Run:

```bash
npm test -- --run
npx tsc --noEmit
npx eslint app/articles/a2ui-flutter-renderer/page.tsx components/A2uiTrace.tsx components/ControlBoundary.tsx components/FlutterConceptMap.tsx
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 4: Verify the local route**

Run:

```bash
npm run dev
```

Open `/articles/a2ui-flutter-renderer` and confirm the first chapter shows the concept map before protocol names, the trace’s four handoff labels include the formal names only after the plain explanation, and the map becomes one column on a narrow viewport.

- [ ] **Step 5: Commit styles and plan**

```bash
git add app/globals.css docs/superpowers/plans/2026-08-16-a2ui-flutter-first-rewrite.md
git commit -m "style: 強化 A2UI Flutter 新手閱讀體驗"
```
