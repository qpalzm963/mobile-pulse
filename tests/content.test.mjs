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

test("feedback uses exactly one local browser storage key", async () => {
  const component = await readFile(new URL("components/Feedback.tsx", root), "utf8");
  assert.match(component, /mobile-pulse-feedback/);
  assert.match(component, /reaction === next \? null : next/);
  assert.match(component, /aria-pressed/);
});
