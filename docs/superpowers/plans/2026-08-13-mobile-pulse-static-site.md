# MOBILE PULSE Static Article Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive static website that publishes App-development weekly articles with tag filtering and browser-local useful/not-useful feedback.

**Architecture:** `data/articles.js` owns all homepage card metadata and the featured article. `assets/site.js` renders filters and handles feedback state through a small, defensive localStorage adapter. Each article remains a shareable static HTML page which imports the common styles and feedback module.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Node.js built-in test runner.

---

## File structure

- `index.html` — homepage shell and article list mount point.
- `articles/app-dev-weekly-2026-08-13.html` — initial published weekly article.
- `data/articles.js` — article metadata exported as `ARTICLES`.
- `assets/site.css` — colour tokens, responsive editorial layout, cards and feedback UI.
- `assets/site.js` — tag filtering and DOM rendering.
- `assets/feedback.js` — feedback state API and button mounting.
- `assets/weekly-cover.png` — existing generated cover copied into the site.
- `assets/ai-workflow.svg`, `assets/framework-matrix.svg` — existing in-article visuals copied into the site.
- `tests/feedback.test.mjs` — storage and one-reaction-per-article tests.
- `tests/articles.test.mjs` — metadata shape and required tags tests.
- `package.json` — test command only, with no runtime dependencies.

### Task 1: Set up the static project and content contract

**Files:**
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/package.json`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/data/articles.js`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/tests/articles.test.mjs`

- [ ] **Step 1: Write the metadata contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTICLES, TAGS } from '../data/articles.js';

test('every article has the required homepage metadata', () => {
  assert.ok(ARTICLES.length > 0);
  for (const article of ARTICLES) {
    assert.ok(article.slug && article.title && article.summary && article.publishedAt);
    assert.ok(article.coverImage && article.href);
    assert.ok(article.tags.length > 0);
  }
});

test('all article tags are supported by the site filter', () => {
  const supported = new Set(TAGS.map(({ id }) => id));
  for (const article of ARTICLES) article.tags.forEach((tag) => assert.ok(supported.has(tag)));
});
```

- [ ] **Step 2: Run the test before implementation**

Run: `cd /Users/vince.huang/develop/tools/mobile-pulse && npm test`

Expected: FAIL because `package.json` and `data/articles.js` do not yet exist.

- [ ] **Step 3: Add the package command and the first article metadata**

```json
{"private":true,"type":"module","scripts":{"test":"node --test tests/*.test.mjs"}}
```

```js
export const TAGS = [
  { id: 'all', label: '全部' }, { id: 'ai', label: 'AI 開發' },
  { id: 'android', label: 'Android' }, { id: 'ios', label: 'iOS' },
  { id: 'cross-platform', label: '跨平台' }, { id: 'engineering', label: '工程實務' },
];
export const ARTICLES = [{
  slug: 'app-dev-weekly-2026-08-13', title: '本週 App 開發新技術與工具週報',
  summary: 'Android、Apple、Flutter 與 AI 開發工具的本週重點。',
  publishedAt: '2026.08.13', tags: ['ai', 'android', 'ios', 'cross-platform'],
  coverImage: 'assets/weekly-cover.png', href: 'articles/app-dev-weekly-2026-08-13.html', featured: true,
}];
```

- [ ] **Step 4: Run the metadata test**

Run: `cd /Users/vince.huang/develop/tools/mobile-pulse && npm test`

Expected: PASS with 2 passing tests.

### Task 2: Implement feedback state before feedback UI

**Files:**
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/assets/feedback.js`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/tests/feedback.test.mjs`

- [ ] **Step 1: Write failing feedback state tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackStore } from '../assets/feedback.js';

test('a selection replaces the prior choice for the same article', () => {
  const store = createFeedbackStore(new Map());
  assert.equal(store.set('week-1', 'useful'), 'useful');
  assert.equal(store.set('week-1', 'not-useful'), 'not-useful');
  assert.equal(store.get('week-1'), 'not-useful');
});

test('selecting the same reaction clears it', () => {
  const store = createFeedbackStore(new Map());
  store.set('week-1', 'useful');
  assert.equal(store.set('week-1', 'useful'), null);
});
```

- [ ] **Step 2: Run the feedback test before implementation**

Run: `cd /Users/vince.huang/develop/tools/mobile-pulse && node --test tests/feedback.test.mjs`

Expected: FAIL because `createFeedbackStore` is not exported.

- [ ] **Step 3: Implement a storage adapter and DOM mount function**

```js
export function createFeedbackStore(storage = window.localStorage) {
  const key = 'mobile-pulse-feedback';
  const read = () => {
    try { return JSON.parse(storage.getItem?.(key) || '{}'); } catch { return {}; }
  };
  return {
    get(slug) { return read()[slug] || null; },
    set(slug, reaction) {
      const all = read(); const next = all[slug] === reaction ? null : reaction;
      if (next) all[slug] = next; else delete all[slug];
      try { storage.setItem?.(key, JSON.stringify(all)); } catch {}
      return next;
    },
  };
}
```

- [ ] **Step 4: Run all state tests**

Run: `cd /Users/vince.huang/develop/tools/mobile-pulse && npm test`

Expected: PASS with 4 passing tests.

### Task 3: Build the homepage and responsive visual system

**Files:**
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/index.html`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/assets/site.css`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/assets/site.js`

- [ ] **Step 1: Create semantic homepage landmarks**

```html
<header class="site-header"><a class="brand" href="index.html">MOBILE <span>PULSE</span></a></header>
<main>
  <section id="featured" aria-label="本期焦點"></section>
  <nav id="tag-filters" aria-label="文章分類"></nav>
  <section aria-labelledby="latest-title"><h2 id="latest-title">LATEST DISPATCHES</h2><div id="article-grid"></div></section>
</main>
<script type="module" src="assets/site.js"></script>
```

- [ ] **Step 2: Render cards and filter interaction in `site.js`**

```js
import { ARTICLES, TAGS } from '../data/articles.js';
let activeTag = 'all';
const matches = (article) => activeTag === 'all' || article.tags.includes(activeTag);
function render() {
  document.querySelector('#article-grid').innerHTML = ARTICLES.filter(matches).map((article) =>
    `<a class="article-card" href="${article.href}"><img src="${article.coverImage}" alt=""><p>${article.publishedAt}</p><h3>${article.title}</h3><span>${article.summary}</span></a>`
  ).join('') || '<p class="empty-state">這個分類目前還沒有文章。<button id="show-all">查看全部</button></p>';
  document.querySelector('#show-all')?.addEventListener('click', () => { activeTag = 'all'; render(); });
}
```

- [ ] **Step 3: Add the CSS tokens and mobile breakpoint**

```css
:root { --ink:#07131a; --panel:#0c2028; --line:#24414b; --mint:#7cf5cb; --text:#eff8f5; --muted:#9bb2b1; }
body { margin:0; background:var(--ink); color:var(--text); font-family:system-ui,sans-serif; }
#article-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem; }
img { max-width:100%; height:auto; }
@media (max-width:680px) { #article-grid { grid-template-columns:1fr; } }
```

- [ ] **Step 4: Serve and manually verify**

Run: `cd /Users/vince.huang/develop/tools/mobile-pulse && python3 -m http.server 4173`

Expected: homepage opens at `http://localhost:4173`, tag buttons change visible cards, and narrow viewport renders one column.

### Task 4: Publish the initial article and connect the feedback controls

**Files:**
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/articles/app-dev-weekly-2026-08-13.html`
- Modify: `/Users/vince.huang/develop/tools/mobile-pulse/assets/feedback.js`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/assets/weekly-cover.png`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/assets/ai-workflow.svg`
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/assets/framework-matrix.svg`

- [ ] **Step 1: Copy the existing verified article assets into the website assets folder**

Run: `cp /Users/vince.huang/Documents/Codex/2026-08-13/new-chat/outputs/app-dev-weekly-cover-2026-08-13.png /Users/vince.huang/develop/tools/mobile-pulse/assets/weekly-cover.png && cp /Users/vince.huang/Documents/Codex/2026-08-13/new-chat/outputs/app-dev-ai-workflow-2026-08-13.svg /Users/vince.huang/develop/tools/mobile-pulse/assets/ai-workflow.svg && cp /Users/vince.huang/Documents/Codex/2026-08-13/new-chat/outputs/app-dev-framework-matrix-2026-08-13.svg /Users/vince.huang/develop/tools/mobile-pulse/assets/framework-matrix.svg`

Expected: all three assets exist beneath `assets/`.

- [ ] **Step 2: Add the feedback mount API**

```js
export function mountFeedback(root, slug) {
  const store = createFeedbackStore();
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-reaction]');
    if (!button) return;
    const selected = store.set(slug, button.dataset.reaction);
    root.querySelectorAll('button[data-reaction]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.reaction === selected)));
  });
}
```

- [ ] **Step 3: Add article markup with sources and feedback section**

```html
<section class="feedback" data-feedback>
  <p>這篇週報對你有幫助嗎？</p>
  <button data-reaction="useful" aria-pressed="false">♥ 有用</button>
  <button data-reaction="not-useful" aria-pressed="false">↓ 沒用</button>
</section>
<script type="module">
  import { mountFeedback } from '../assets/feedback.js';
  mountFeedback(document.querySelector('[data-feedback]'), 'app-dev-weekly-2026-08-13');
</script>
```

- [ ] **Step 4: Verify article navigation and persistence**

Run: open `http://localhost:4173/articles/app-dev-weekly-2026-08-13.html`, click `♥ 有用`, refresh, then click `↓ 沒用`.

Expected: only the selected option has `aria-pressed="true"` after every action and the initial selection survives refresh.

### Task 5: Final quality check and contributor documentation

**Files:**
- Create: `/Users/vince.huang/develop/tools/mobile-pulse/README.md`

- [ ] **Step 1: Document the exact AI article-addition workflow**

```md
## 新增文章
1. 建立 `articles/<slug>.html`，沿用現有文章頁的 header、article 和 feedback 區塊。
2. 將圖片、SVG 放到 `assets/`。
3. 在 `data/articles.js` 新增 `slug`、`title`、`summary`、`publishedAt`、`tags`、`coverImage`、`href`。
4. 執行 `npm test`，並用 `python3 -m http.server 4173` 目視檢查。
```

- [ ] **Step 2: Run tests and inspect all local links**

Run: `cd /Users/vince.huang/develop/tools/mobile-pulse && npm test && rg -n 'href=|src=' index.html articles assets data`

Expected: all tests pass and no referenced local website asset is missing.

- [ ] **Step 3: Review responsive and empty states**

Run: inspect `http://localhost:4173` at 1440px, 768px, and 375px widths; select every category including one with no articles.

Expected: no horizontal scrollbar, controls remain readable, and the empty state provides a working `查看全部` action.
