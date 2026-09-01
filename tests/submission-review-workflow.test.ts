import { afterAll, describe, expect, it } from "vitest";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  SubmissionService,
  InvalidStatusTransitionError,
} from "../lib/submissions";
import { getPublishedArticleBySlug } from "../lib/articles";
import { getDb } from "../db";
import { submissions as drizzleSubmissions } from "../db/schema";

const REVIEWER_1 = "11111111-2222-4333-8444-555555555555";
const REVIEWER_2 = "99999999-2222-4333-8444-555555555555";

describe("Submission & Review Workflow Unified in Payload CMS (Issue #7)", () => {
  afterAll(async () => {
    // Cleanup any test created submissions
    try {
      const payload = await getPayload({ config });
      const testSubs = await payload.find({
        collection: "submissions",
        where: {
          slug: { contains: "test-" },
        },
        limit: 0,
      });
      for (const doc of testSubs.docs) {
        await payload.delete({ collection: "submissions", id: doc.id });
      }
    } catch {
      // ignore
    }
  });

  it("1. createDraft and updateDraft manage submission content in Payload", async () => {
    const draft = await SubmissionService.createDraft({
      title: "Test Draft Title",
      summary: "Test Draft Summary",
      contentMarkdown: "# Heading 1\n\nThis is test draft content markdown with sufficient length.",
      authorAlias: "Test Author",
      tags: ["ios", "ai"],
    });

    expect(draft).toBeDefined();
    expect(draft.id).toBeDefined();
    expect(draft.status).toBe("draft");
    expect(draft.title).toBe("Test Draft Title");
    expect(draft.tags).toContain("ios");
    expect(draft.tags).toContain("ai");

    // Update draft
    const updated = await SubmissionService.updateDraft(draft.id, {
      title: "Updated Draft Title",
      contentMarkdown: "# Heading 1 Updated\n\nThis is updated draft content markdown.",
    });

    expect(updated.title).toBe("Updated Draft Title");
    expect(updated.contentMarkdown).toContain("Updated");
  });

  it("2. State Machine Transitions: draft -> reviewing -> changes_requested -> reviewing -> approved -> published", async () => {
    // Create draft
    const sub = await SubmissionService.createDraft({
      title: "State Machine Test Article",
      contentMarkdown: "# State Machine\n\nTesting complete state machine lifecycle transitions.",
      authorAlias: "Lifecycle Author",
      tags: ["engineering"],
    });
    expect(sub.status).toBe("draft");

    // 1. draft -> reviewing
    const reviewing = await SubmissionService.submitForReview(sub.id);
    expect(reviewing.status).toBe("reviewing");
    expect(reviewing.submittedAt).toBeDefined();

    // 2. reviewing -> changes_requested
    const changesReq = await SubmissionService.requestChanges(sub.id);
    expect(changesReq.status).toBe("changes_requested");

    // 3. changes_requested -> update content -> reviewing
    await SubmissionService.updateDraft(sub.id, {
      contentMarkdown: "# State Machine Revised\n\nAddressed reviewer comments and refined content.",
    });
    const reReviewing = await SubmissionService.submitForReview(sub.id);
    expect(reReviewing.status).toBe("reviewing");
    expect(reReviewing.contentMarkdown).toContain("Revised");

    // 4. reviewing -> approved
    const approved = await SubmissionService.approveSubmission(sub.id);
    expect(approved.status).toBe("approved");
    expect(approved.approvedAt).toBeDefined();

    // 5. approved -> published
    const pubResult = await SubmissionService.publishSubmission(sub.id, {
      eyebrow: "架構實務",
      readTime: "6 MIN READ",
    });
    expect(pubResult.alreadyPublished).toBe(false);
    expect(pubResult.submission.status).toBe("published");
    expect(pubResult.submission.publishedAt).toBeDefined();
    expect(pubResult.article).toBeDefined();
    expect(pubResult.article.slug).toBe(sub.slug);

    // Verify Payload Article Source of Truth now contains the published article!
    const publishedArticle = await getPublishedArticleBySlug(sub.slug);
    expect(publishedArticle).not.toBeNull();
    expect(publishedArticle?.title).toBe("State Machine Test Article");
    expect(publishedArticle?.contentMarkdown).toContain("Revised");
  });

  it("3. publishSubmission is idempotent and does not create duplicate articles when called multiple times", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Idempotency Test Article",
      contentMarkdown: "# Idempotency\n\nTesting that multiple publish invocations are strictly idempotent.",
      submitImmediately: true,
    });
    expect(sub.status).toBe("reviewing");

    await SubmissionService.approveSubmission(sub.id);

    // First Publish
    const firstPublish = await SubmissionService.publishSubmission(sub.id);
    expect(firstPublish.alreadyPublished).toBe(false);
    const firstArticleId = firstPublish.article.id;

    // Second Publish
    const secondPublish = await SubmissionService.publishSubmission(sub.id);
    expect(secondPublish.alreadyPublished).toBe(true);
    expect(secondPublish.article.id).toBe(firstArticleId);
    expect(secondPublish.submission.status).toBe("published");
  });

  it("4. Illegal state machine transitions are rejected with InvalidStatusTransitionError", async () => {
    // A. Draft cannot directly publish
    const draftSub = await SubmissionService.createDraft({
      title: "Illegal Transition Test 1",
      contentMarkdown: "# Draft Direct Publish\n\nThis draft should not be directly publishable.",
    });
    await expect(SubmissionService.publishSubmission(draftSub.id)).rejects.toThrow();

    // B. Reviewing cannot directly publish without approval
    const revSub = await SubmissionService.createDraft({
      title: "Illegal Transition Test 2",
      contentMarkdown: "# Reviewing Direct Publish\n\nReviewing submission should not be directly publishable.",
      submitImmediately: true,
    });
    await expect(SubmissionService.publishSubmission(revSub.id)).rejects.toThrow();

    // C. Rejected submission cannot be published
    await SubmissionService.rejectSubmission(revSub.id);
    await expect(SubmissionService.publishSubmission(revSub.id)).rejects.toThrow();
  });

  it("5. Review Ratings support multi-dimensional scoring and upsert per reviewer", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Review Rating Test Article",
      contentMarkdown: "# Rating Article\n\nTesting multi-dimensional scores and rating aggregates.",
      submitImmediately: true,
    });

    // Reviewer 1 rates (4, 5, 4)
    const rate1 = await SubmissionService.addOrUpdateReview(sub.id, {
      reviewerToken: REVIEWER_1,
      scoreDepth: 4,
      scoreClarity: 5,
      scorePracticality: 4,
      generalFeedback: "深入且實用！",
    });

    expect(rate1.ratingStats.count).toBe(1);
    expect(rate1.ratingStats.avgDepth).toBe(4);
    expect(rate1.ratingStats.avgClarity).toBe(5);
    expect(rate1.ratingStats.avgPracticality).toBe(4);

    // Reviewer 2 rates (2, 3, 2)
    const rate2 = await SubmissionService.addOrUpdateReview(sub.id, {
      reviewerToken: REVIEWER_2,
      scoreDepth: 2,
      scoreClarity: 3,
      scorePracticality: 2,
    });

    expect(rate2.ratingStats.count).toBe(2);
    expect(rate2.ratingStats.avgDepth).toBe(3); // (4 + 2)/2 = 3.0
    expect(rate2.ratingStats.avgClarity).toBe(4); // (5 + 3)/2 = 4.0

    // Reviewer 1 updates their rating to (5, 5, 5) -> Count stays 2
    const rate1Update = await SubmissionService.addOrUpdateReview(sub.id, {
      reviewerToken: REVIEWER_1,
      scoreDepth: 5,
      scoreClarity: 5,
      scorePracticality: 5,
    });

    expect(rate1Update.ratingStats.count).toBe(2);
    expect(rate1Update.ratingStats.avgDepth).toBe(3.5); // (5 + 2)/2 = 3.5
  });

  it("6. In-line Annotations can be added, listed, and resolved", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Annotation Test Article",
      contentMarkdown: "# Annotation Article\n\nLine 1: Select this text for testing.",
      submitImmediately: true,
    });

    // Add annotation
    const ann = await SubmissionService.addAnnotation(sub.id, {
      reviewerToken: REVIEWER_1,
      selectedText: "Select this text",
      textOffsetStart: 10,
      textOffsetEnd: 26,
      comment: "建議多補充細節說明。",
    });

    expect(ann.id).toBeDefined();
    expect(ann.status).toBe("open");

    // Fetch submission with annotations
    const detail = await SubmissionService.getSubmission(sub.id);
    expect(detail?.annotations.length).toBe(1);
    expect(detail?.annotationStats.open).toBe(1);

    // Resolve annotation
    const resolved = await SubmissionService.updateAnnotationStatus(ann.id, "resolved");
    expect(resolved.status).toBe("resolved");

    const detailResolved = await SubmissionService.getSubmission(sub.id);
    expect(detailResolved?.annotationStats.open).toBe(0);
    expect(detailResolved?.annotationStats.total).toBe(1);
  });

  it("7. Legacy ID query compatibility works for /reviews/[id]", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Legacy ID Compatibility Test",
      contentMarkdown: "# Legacy ID Article\n\nTesting backward compatibility lookup.",
      legacyId: 9999,
    });

    // Query by legacyId
    const byLegacy = await SubmissionService.getSubmission(9999);
    expect(byLegacy).not.toBeNull();
    expect(byLegacy?.title).toBe("Legacy ID Compatibility Test");

    // Query by string legacyId
    const byLegacyStr = await SubmissionService.getSubmission("9999");
    expect(byLegacyStr).not.toBeNull();
    expect(byLegacyStr?.title).toBe("Legacy ID Compatibility Test");
  });
});
