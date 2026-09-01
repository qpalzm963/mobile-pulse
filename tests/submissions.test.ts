import { describe, expect, it } from "vitest";
import { GET as listSubmissions, POST as createSubmission } from "../app/api/submissions/route";
import { GET as getSubmission, PATCH as updateSubmission } from "../app/api/submissions/[id]/route";
import { POST as submitRating } from "../app/api/submissions/[id]/ratings/route";
import { POST as addAnnotation, PATCH as updateAnnotation } from "../app/api/submissions/[id]/annotations/route";

const REVIEWER_A = "aaaaaaaa-1111-4222-8333-444444444444";
const REVIEWER_B = "bbbbbbbb-1111-4222-8333-444444444444";

describe("Submissions & Peer Review System", () => {
  it("投稿成功建立並能被清單查詢，且回傳 contentMarkdown 欄位", async () => {
    const postRes = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Swift 6 Concurrency 實戰指南",
          summary: "徹底搞懂 Data Isolation 與 Sendable 規則",
          contentMarkdown: "# 01 / 背景\n\n這是一篇關於 Swift 6 的文章。\n\n## 02 / Actor 模型\n深入拆解 Actor 執行序隔離。",
          authorAlias: "iOS 工程師 A",
          tags: ["ios", "engineering"],
          status: "reviewing",
        }),
      })
    );

    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.submission.id).toBeDefined();
    expect(postData.submission.contentMarkdown).toContain("Swift 6");
    expect(postData.submission.content).toBe(postData.submission.contentMarkdown); // Deprecated alias

    const listRes = await listSubmissions();
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.length).toBeGreaterThanOrEqual(1);
    const found = listData.find((s: { title: string; ratingStats: { count: number } }) => s.title === "Swift 6 Concurrency 實戰指南");
    expect(found).toBeDefined();
    expect(found?.ratingStats.count).toBe(0);

    // Verify GET detail returns contentMarkdown
    const getRes = await getSubmission(
      new Request(`https://example.com/api/submissions/${postData.submission.id}`),
      { params: Promise.resolve({ id: String(postData.submission.id) }) }
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.contentMarkdown).toBe(postData.submission.contentMarkdown);
  });

  it("支援以 contentMarkdown 欄位投稿，且未填寫 summary 時自動從文章第一段擷取摘要", async () => {
    const postRes = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Kotlin Multiplatform 2026 架構指南",
          contentMarkdown: `## 一、 現代 KMP 架構概述

這是 Kotlin Multiplatform 在 iOS 與 Android 共享業務邏輯的第一段核心說明。

:::terminal title="gradle"
./gradlew build
:::
`,
          tags: ["kmp", "android", "ios"],
        }),
      })
    );

    expect(postRes.status).toBe(201);
    const data = await postRes.json();
    expect(data.success).toBe(true);
    expect(data.submission.summary).toBe("這是 Kotlin Multiplatform 在 iOS 與 Android 共享業務邏輯的第一段核心說明。");
    expect(data.submission.authorAlias).toBe("匿名組員");
  });

  it("禁止新投稿繞過 contentMarkdown 注入 legacy HTML，並驗證各欄位邊界", async () => {
    // 1. Missing contentMarkdown (even if legacy content is passed)
    const res1 = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "測試文章",
          content: "<div>任意未過濾 HTML</div>",
        }),
      })
    );
    expect(res1.status).toBe(400);
    const data1 = await res1.json();
    expect(data1.error).toContain("contentMarkdown is required");

    // 2. Content too short (< 10 chars)
    const res2 = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "測試文章",
          contentMarkdown: "太短了",
        }),
      })
    );
    expect(res2.status).toBe(400);

    // 3. Title too short (< 2 chars)
    const res3 = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "a",
          contentMarkdown: "這是一篇內容長度足夠但標題過短的文章。",
        }),
      })
    );
    expect(res3.status).toBe(400);

    // 4. Summary too long (> 300 chars)
    const res4 = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "正常標題",
          summary: "x".repeat(301),
          contentMarkdown: "這是一篇內容長度足夠的文章內容。",
        }),
      })
    );
    expect(res4.status).toBe(400);
    const data4 = await res4.json();
    expect(data4.error).toContain("Summary cannot exceed 300 characters");
  });

  it("PATCH 支援更新 contentMarkdown 並進行共用 validator 長度驗證", async () => {
    const createRes = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "待更新的文章",
          contentMarkdown: "初始版本的文章內容長度超過十個字。",
        }),
      })
    );
    const { submission } = await createRes.json();
    const subId = String(submission.id);

    // Update with contentMarkdown
    const patchRes = await updateSubmission(
      new Request(`https://example.com/api/submissions/${subId}`, {
        method: "PATCH",
        body: JSON.stringify({
          contentMarkdown: "這是更新過後的 Markdown 文章正文內容。",
        }),
      }),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.submission.contentMarkdown).toBe("這是更新過後的 Markdown 文章正文內容。");

    // Attempt to update with too short content
    const badPatchRes = await updateSubmission(
      new Request(`https://example.com/api/submissions/${subId}`, {
        method: "PATCH",
        body: JSON.stringify({
          contentMarkdown: "過短",
        }),
      }),
      { params: Promise.resolve({ id: subId }) }
    );
    expect(badPatchRes.status).toBe(400);
  });

  it("匿名評分支援多維度打分，同評審者再次打分會走 Upsert 覆蓋而非重複計數", async () => {
    // 1. Create a submission
    const subRes = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Flutter 3.44 Impeller 深度剖析",
          summary: "深入探討 Vulkan 著色器管線",
          contentMarkdown: "Flutter 3.44 帶來的 Impeller 渲染引擎更新深入解說...",
        }),
      })
    );
    const { submission } = await subRes.json();
    const subIdStr = String(submission.id);

    // 2. Reviewer A rates (4, 5, 5)
    const rate1 = await submitRating(
      new Request(`https://example.com/api/submissions/${subIdStr}/ratings`, {
        method: "POST",
        body: JSON.stringify({
          reviewerToken: REVIEWER_A,
          scoreDepth: 4,
          scoreClarity: 5,
          scorePracticality: 5,
          generalFeedback: "架構很扎實，建議多附上 Benchmark！",
        }),
      }),
      { params: Promise.resolve({ id: subIdStr }) }
    );

    expect(rate1.status).toBe(200);
    const rate1Data = await rate1.json();
    expect(rate1Data.ratingStats.count).toBe(1);
    expect(rate1Data.ratingStats.avgDepth).toBe(4);
    expect(rate1Data.ratingStats.avgClarity).toBe(5);

    // 3. Reviewer A updates their rating (5, 5, 5) -> Upsert should keep count = 1
    const rate2 = await submitRating(
      new Request(`https://example.com/api/submissions/${subIdStr}/ratings`, {
        method: "POST",
        body: JSON.stringify({
          reviewerToken: REVIEWER_A,
          scoreDepth: 5,
          scoreClarity: 5,
          scorePracticality: 5,
          generalFeedback: "作者已補上 Benchmark，直接給滿分！",
        }),
      }),
      { params: Promise.resolve({ id: subIdStr }) }
    );

    const rate2Data = await rate2.json();
    expect(rate2Data.ratingStats.count).toBe(1);
    expect(rate2Data.ratingStats.avgDepth).toBe(5);

    // 4. Reviewer B rates (3, 3, 3) -> Count becomes 2
    const rateB = await submitRating(
      new Request(`https://example.com/api/submissions/${subIdStr}/ratings`, {
        method: "POST",
        body: JSON.stringify({
          reviewerToken: REVIEWER_B,
          scoreDepth: 3,
          scoreClarity: 3,
          scorePracticality: 3,
        }),
      }),
      { params: Promise.resolve({ id: subIdStr }) }
    );

    const rateBData = await rateB.json();
    expect(rateBData.ratingStats.count).toBe(2);
    expect(rateBData.ratingStats.avgDepth).toBe(4); // (5 + 3) / 2 = 4.0
  });

  it("行內劃線標註可新增、查詢並標記為已解決", async () => {
    // 1. Create a submission
    const subRes = await createSubmission(
      new Request("https://example.com/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Bruno vs Postman 選型實踐",
          summary: "離線優先與 Git-first 的 API 客戶端",
          contentMarkdown: "我們為什麼放棄了傳統雲端 API 工具...",
        }),
      })
    );
    const { submission } = await subRes.json();
    const subIdStr = String(submission.id);

    // 2. Add an in-line annotation
    const addRes = await addAnnotation(
      new Request(`https://example.com/api/submissions/${subIdStr}/annotations`, {
        method: "POST",
        body: JSON.stringify({
          reviewerToken: REVIEWER_A,
          selectedText: "傳統雲端 API 工具",
          textOffsetStart: 10,
          textOffsetEnd: 20,
          comment: "這裡可以明確點名 Postman 的雲端同步問題。",
        }),
      }),
      { params: Promise.resolve({ id: subIdStr }) }
    );

    expect(addRes.status).toBe(201);
    const addData = await addRes.json();
    expect(addData.annotation.selectedText).toBe("傳統雲端 API 工具");
    expect(addData.annotation.status).toBe("open");

    // 3. Query submission detail
    const detailRes = await getSubmission(
      new Request(`https://example.com/api/submissions/${subIdStr}`),
      { params: Promise.resolve({ id: subIdStr }) }
    );
    const detailData = await detailRes.json();
    expect(detailData.annotations.length).toBe(1);
    expect(detailData.annotations[0].comment).toContain("Postman");

    // 4. Resolve the annotation
    const resolveRes = await updateAnnotation(
      new Request(`https://example.com/api/submissions/${subIdStr}/annotations`, {
        method: "PATCH",
        body: JSON.stringify({
          annotationId: addData.annotation.id,
          status: "resolved",
        }),
      }),
      { params: Promise.resolve({ id: subIdStr }) }
    );

    expect(resolveRes.status).toBe(200);
    const resolveData = await resolveRes.json();
    expect(resolveData.annotation.status).toBe("resolved");
  });
});
