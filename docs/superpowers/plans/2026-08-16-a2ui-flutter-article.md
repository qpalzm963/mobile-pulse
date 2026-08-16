# A2UI Flutter 技術文章 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 MOBILE PULSE 新增一篇讓不熟 A2UI 的 Flutter 工程師也能理解的技術文章，並以可閱讀的資料流與控制邊界模組說明 A2UI renderer。

**Architecture:** 新文章維持現有 App Router 的一篇一頁 TSX 模式，重用 `ArticleHero`、`QuickRead`、`ArticleToc` 與 `Feedback`。兩個純呈現元件將 A2UI trace 與 Flutter renderer／agent 的控制邊界自成明確責任，並由 `.article-body` scoped CSS 支援桌面與窄螢幕排版。

**Tech Stack:** React 19、TypeScript、Vinext、CSS、Node test、Vitest。

---

## File structure

- Create: `components/A2uiTrace.tsx` — 顯示 Agent、JSONL/SSE、Flutter renderer、User action/API 四步資料流。
- Create: `components/ControlBoundary.tsx` — 顯示 Flutter renderer 必須保證與 agent 不應決定的兩組安全邊界。
- Create: `app/articles/a2ui-flutter-renderer/page.tsx` — A2UI Flutter 文章、官方來源與回饋入口。
- Modify: `app/globals.css` — 為兩個文章敘事元件加入 scope CSS 與窄螢幕規則。
- Modify: `data/articles.ts` — 將新文章置頂加入首頁與統計 slug 白名單。
- Modify: `tests/content.test.mjs` — 驗證新文章入口、Flutter 敘事模組與官方來源。

### Task 1: Add the article content contract test

**Files:**

- Modify: `tests/content.test.mjs`

- [ ] **Step 1: Write the failing test**

Append this test after the existing article test:

```js
test("the A2UI Flutter article is published with its teaching modules and official sources", async () => {
  const articles = await readFile(new URL("data/articles.ts", root), "utf8");
  const article = await readFile(
    new URL("app/articles/a2ui-flutter-renderer/page.tsx", root),
    "utf8"
  );

  assert.match(articles, /slug: "a2ui-flutter-renderer"/);
  assert.match(article, /<A2uiTrace/);
  assert.match(article, /<ControlBoundary/);
  assert.match(article, /Flutter GenUI SDK/);
  assert.match(article, /<Feedback slug="a2ui-flutter-renderer"/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: FAIL because `app/articles/a2ui-flutter-renderer/page.tsx` does not exist.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/content.test.mjs
git commit -m "test: 新增 A2UI Flutter 文章內容契約"
```

### Task 2: Build the A2UI trace and control-boundary modules

**Files:**

- Create: `components/A2uiTrace.tsx`
- Create: `components/ControlBoundary.tsx`

- [ ] **Step 1: Add the four-stage trace component**

Create `components/A2uiTrace.tsx` with this content:

```tsx
type TraceStep = {
  number: string;
  role: string;
  title: string;
  detail: string;
  handoff: string;
};

const STEPS: TraceStep[] = [
  {
    number: "01",
    role: "AGENT",
    title: "判斷文字不夠用",
    detail: "使用者要預約，日期與人數不能只靠一句聊天文字安全地猜。agent 決定請 client 顯示一個表單。",
    handoff: "輸出：宣告式 UI 描述",
  },
  {
    number: "02",
    role: "STREAM",
    title: "送出元件與資料",
    detail: "surfaceUpdate 與 dataModelUpdate 以 JSONL/SSE 逐筆送達；這些訊息是資料，不是 Dart 程式碼。",
    handoff: "輸出：component IDs、binding 與初始值",
  },
  {
    number: "03",
    role: "FLUTTER RENDERER",
    title: "映射為已批准的 widget",
    detail: "renderer 只從 app 的 catalog 取出已實作的 Card、TextField、DatePicker 與 Button；未知元件一律 fallback。",
    handoff: "輸出：使用者看得到、可操作的 Flutter UI",
  },
  {
    number: "04",
    role: "USER ACTION",
    title: "操作回到既有後端流程",
    detail: "使用者送出後，client 回傳 userAction；真正的預約仍由既有 API、登入狀態與授權檢查執行。",
    handoff: "輸出：受控事件，不是直接副作用",
  },
];

export function A2uiTrace() {
  return (
    <section className="a2ui-trace" aria-labelledby="a2ui-trace-title">
      <p className="eyebrow">一次表單的資料流</p>
      <h3 id="a2ui-trace-title">Agent → stream → Flutter renderer → action</h3>
      <ol>
        {STEPS.map((step) => (
          <li key={step.number}>
            <span className="a2ui-trace-number">{step.number}</span>
            <div>
              <p className="a2ui-trace-role">{step.role}</p>
              <h4>{step.title}</h4>
              <p>{step.detail}</p>
              <span className="a2ui-trace-handoff">{step.handoff}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: Add the control-boundary component**

Create `components/ControlBoundary.tsx` with this content:

```tsx
const RENDERER_GUARANTEES = [
  "只渲染 catalog 已註冊的 Flutter widget 與 props。",
  "收到未知 component、失效 binding 或不相容 catalog 時顯示受控 fallback。",
  "將 userAction 以既有 callback／API 流程回送並記錄事件。",
];

const AGENT_LIMITS = [
  "不能產生或執行任意 Dart 程式碼。",
  "不能直接讀取 token、裝置能力或 app 私有狀態。",
  "不能跳過確認與授權，直接付款、刪除資料或修改權限。",
];

export function ControlBoundary() {
  return (
    <section className="control-boundary" aria-label="A2UI 的控制邊界">
      <section className="control-boundary-renderer">
        <p className="eyebrow">Flutter renderer 必須保證</p>
        <ul>{RENDERER_GUARANTEES.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="control-boundary-agent">
        <p className="eyebrow">Agent 不應決定</p>
        <ul>{AGENT_LIMITS.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </section>
  );
}
```

- [ ] **Step 3: Run the focused content test**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: still FAIL because the article page is not created yet; no TypeScript execution path is introduced by these pure components.

- [ ] **Step 4: Commit the modules**

```bash
git add components/A2uiTrace.tsx components/ControlBoundary.tsx
git commit -m "feat: 新增 A2UI 文章敘事模組"
```

### Task 3: Write and register the Flutter-focused article

**Files:**

- Create: `app/articles/a2ui-flutter-renderer/page.tsx`
- Modify: `data/articles.ts`

- [ ] **Step 1: Create the article page**

Create the page with imports for `Link`, `ArticleHero`, `ArticleToc`, `A2uiTrace`, `ControlBoundary`, `Feedback`, and `QuickRead`. Use this metadata:

```tsx
<ArticleHero
  eyebrow="AI 開發 / Flutter 01"
  title="一個表單怎麼從 agent 走進你的 Flutter App"
  dek="A2UI 不是讓模型寫 widget；它讓 agent 描述介面，再由你的 Flutter renderer 決定哪些元件真的能出現。"
  publishedAt="2026.08.16"
  readingTime="7 MIN READ"
  tags={["AI 開發", "Flutter", "工程實務"]}
  signals={[
    { value: "4 步", label: "把 agent 的描述變成受控的 Flutter 互動" },
    { value: "1 份", label: "catalog 決定 agent 能要求哪些 widget" },
    { value: "0 段", label: "agent 直接執行的 Dart 程式碼" },
  ]}
/>
```

Write these sections in order: `A2UI 不是讓 agent 寫 widget`、`一次表單怎麼走進 Flutter App`（render `A2uiTrace`）、`Catalog 是你的 widget allowlist`、`Renderer 要守住哪些邊界`（render `ControlBoundary`）、`第一個 prototype 怎麼選`、`本週可採取的行動`。 Use three short `QuickRead` items that explain declarative data, local widget mapping, and low-risk rollout. End with a source list containing these exact links:

```tsx
<ul className="sources">
  <li><a href="https://github.com/a2ui-project/a2ui" target="_blank" rel="noreferrer">A2UI 官方專案 ↗</a></li>
  <li><a href="https://github.com/flutter/genui" target="_blank" rel="noreferrer">Flutter GenUI SDK ↗</a></li>
  <li><a href="https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9/docs/a2ui_extension_specification.md" target="_blank" rel="noreferrer">A2UI v0.9 extension specification ↗</a></li>
</ul>
<Feedback slug="a2ui-flutter-renderer" />
```

- [ ] **Step 2: Register the article in homepage data**

Add this as the first item in `ARTICLES` in `data/articles.ts`:

```ts
{
  slug: "a2ui-flutter-renderer",
  title: "一個表單怎麼從 agent 走進你的 Flutter App",
  summary: "A2UI 讓 agent 描述介面，但 Flutter renderer 仍掌握 widget、事件與安全邊界。",
  publishedAt: "2026.08.16",
  tags: ["ai", "cross-platform", "engineering"],
  href: "/articles/a2ui-flutter-renderer",
},
```

- [ ] **Step 3: Run the content test to verify it passes**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: PASS with 3 tests.

- [ ] **Step 4: Commit the article and registration**

```bash
git add app/articles/a2ui-flutter-renderer/page.tsx data/articles.ts tests/content.test.mjs
git commit -m "feat: 新增 A2UI Flutter 技術文章"
```

### Task 4: Style the new visual modules and verify the complete app

**Files:**

- Modify: `app/globals.css`

- [ ] **Step 1: Add scoped desktop styles**

Append these scoped rules before the existing mobile media query:

```css
.article-body .a2ui-trace{margin:24px 0 30px;border:1px solid var(--rule);border-radius:4px;background:var(--card);padding:20px 22px}
.article-body .a2ui-trace h3{font:600 18px/1.4 var(--sans);margin:6px 0 18px;color:var(--ink)}
.article-body .a2ui-trace ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.article-body .a2ui-trace li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;margin:0;padding:14px;border:1px solid var(--rule);border-radius:4px;background:var(--wash)}
.article-body .a2ui-trace-number,.article-body .a2ui-trace-role,.article-body .a2ui-trace-handoff{font:400 10px/1.5 var(--mono);letter-spacing:.08em;color:var(--accent)}
.article-body .a2ui-trace h4{font:600 14px/1.4 var(--sans);margin:3px 0 6px;color:var(--ink)}
.article-body .a2ui-trace li p{font:400 13px/1.75 var(--sans);margin:0 0 8px;color:var(--ink)}
.article-body .control-boundary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:24px 0 30px}
.article-body .control-boundary section{padding:18px;border:1px solid var(--rule);border-radius:4px;background:var(--card)}
.article-body .control-boundary-agent{border-color:var(--warn)!important;background:#fdf5f3!important}
.article-body .control-boundary ul{margin:10px 0 0;padding-left:18px}
.article-body .control-boundary li{font:400 13.5px/1.7 var(--sans);margin:0 0 8px;padding:0;color:var(--ink)}
```

- [ ] **Step 2: Add narrow-screen rules inside the existing media query**

Add these rules inside `@media (max-width: 760px)`:

```css
.article-body .a2ui-trace{padding:18px}
.article-body .a2ui-trace ol,.article-body .control-boundary{grid-template-columns:1fr}
.article-body .a2ui-trace li{padding:13px}
```

- [ ] **Step 3: Run the full automated verification**

Run:

```bash
npm test -- --run
npm run lint
```

Expected: all Node and Vitest tests pass; ESLint reports no errors.

- [ ] **Step 4: Verify article routes in the browser**

Run:

```bash
npm run dev
```

Open `/` and `/articles/a2ui-flutter-renderer`. Confirm the article is the first homepage row, the trace reads 01→04 on desktop and one column on a narrow viewport, the control boundary has both labelled columns, all three source links open externally, and feedback buttons remain keyboard reachable.

- [ ] **Step 5: Commit styles**

```bash
git add app/globals.css
git commit -m "style: 調整 A2UI 文章閱讀模組"
```
