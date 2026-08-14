import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the initial weekly article is linked from the homepage data", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const article = await readFile(new URL("app/articles/app-dev-weekly-2026-08-13/page.tsx", root), "utf8");
  assert.match(page, /ArticleDirectory/);
  assert.match(article, /<Feedback slug="app-dev-weekly-2026-08-13"/);
  assert.match(article, /Android Developers — Latest updates/);
});

test("feedback goes through the server endpoints, not local browser storage", async () => {
  const component = await readFile(new URL("components/Feedback.tsx", root), "utf8");
  // 回饋改為伺服器端匿名統計後，反應本身不再存在瀏覽器。localStorage 只用來
  // 保存 visitor_id（在 lib/visitor-id.ts），元件不得再直接讀寫回饋。
  assert.doesNotMatch(component, /mobile-pulse-feedback/);
  assert.match(component, /\/api\/articles\/\$\{slug\}\/feedback/);
  assert.match(component, /\/api\/articles\/\$\{slug\}\/view/);
  assert.match(component, /aria-pressed/);
});
