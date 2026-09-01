import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the homepage data is powered by Payload CMS service", async () => {
  const page = await readFile(new URL("app/(app)/page.tsx", root), "utf8");
  assert.match(page, /ArticleDirectory/);
  assert.match(page, /getHomePageData/);
});

test("hardcoded article routes are removed in favor of dynamic [slug] route", async () => {
  const dynamicPage = await readFile(
    new URL("app/(app)/articles/[slug]/page.tsx", root),
    "utf8"
  );
  assert.match(dynamicPage, /getPublishedArticleBySlug/);
  assert.match(dynamicPage, /notFound/);
  assert.match(dynamicPage, /<Feedback slug=\{article\.slug\}/);

  // Ensure hardcoded public article routes no longer override [slug]
  const hardcodedSlugs = [
    "ai-agent-security-sandbox-audit",
    "app-dev-weekly-2026-08-13",
    "bruno-api-client-git-first",
    "google-a2ui-agents-speak-ui",
  ];

  for (const slug of hardcodedSlugs) {
    const hardcodedPath = new URL(`app/(app)/articles/${slug}/page.tsx`, root);
    assert.equal(
      existsSync(hardcodedPath),
      false,
      `Hardcoded route for ${slug} must not exist, should use [slug]`
    );
  }
});

test("feedback goes through the server endpoints, not local browser storage", async () => {
  const component = await readFile(new URL("components/Feedback.tsx", root), "utf8");
  assert.doesNotMatch(component, /mobile-pulse-feedback/);
  assert.match(component, /\/api\/articles\/\$\{slug\}\/feedback/);
  assert.match(component, /\/api\/articles\/\$\{slug\}\/view/);
  assert.match(component, /aria-pressed/);
});
