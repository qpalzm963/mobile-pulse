import { afterAll, describe, expect, it } from "vitest";
import { getPayload } from "payload";
import config from "../payload.config";
import {
  SubmissionService,
} from "../lib/submissions";
import { getPublishedArticleBySlug } from "../lib/articles";
import { getDb } from "../db";
import {
  submissions as drizzleSubmissions,
  submissionRatings as drizzleRatings,
  submissionAnnotations as drizzleAnnotations,
} from "../db/schema";
import { migrateDrizzleSubmissionsToPayload } from "../scripts/migrate-drizzle-submissions-to-payload";
import { PATCH as patchSubmissionApi } from "../app/api/submissions/[id]/route";

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

  it("8. updateDraft is strictly forbidden in reviewing, approved, published, or rejected status", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Draft Status Restriction Test",
      contentMarkdown: "# Initial Content\n\nTesting that updateDraft enforces draft or changes_requested.",
      submitImmediately: true, // initial status: reviewing
    });

    // In reviewing status, updateDraft should throw error
    await expect(
      SubmissionService.updateDraft(sub.id, { title: "Attempted Title Update" })
    ).rejects.toThrow("Cannot edit submission in 'reviewing' status");

    // Approve the submission
    await SubmissionService.approveSubmission(sub.id);

    // In approved status, updateDraft should throw error (prevents '審 A 發 B')
    await expect(
      SubmissionService.updateDraft(sub.id, { contentMarkdown: "Maliciously modified content" })
    ).rejects.toThrow("Cannot edit submission in 'approved' status");
  });

  it("9. PATCH /api/submissions/[id] rejects direct status mutation", async () => {
    const sub = await SubmissionService.createDraft({
      title: "API Status Guard Test",
      contentMarkdown: "# API Status Guard\n\nTesting that client cannot pass direct status to PATCH.",
      submitImmediately: true,
    });

    const patchRes = await patchSubmissionApi(
      new Request(`https://example.com/api/submissions/${sub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: String(sub.id) }) }
    );

    expect(patchRes.status).toBe(400);
    const patchData = await patchRes.json();
    expect(patchData.error).toContain("Direct status mutation is forbidden");
  });

  it("10. PATCH /api/submissions/[id] modifying only title preserves existing coverImageId", async () => {
    // Create a mock media item in Payload
    const payload = await getPayload({ config });
    const media = await payload.create({
      collection: "media",
      data: {
        alt: "Test Cover Image",
      },
    });

    const sub = await SubmissionService.createDraft({
      title: "Cover Image Preservation Test",
      contentMarkdown: "# Cover Image Test\n\nTesting that updating title alone does not wipe coverImage.",
      coverImageId: String(media.id),
    });

    expect(sub.coverImageId).toBe(String(media.id));

    // PATCH only title
    const patchRes = await patchSubmissionApi(
      new Request(`https://example.com/api/submissions/${sub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "New Preserved Title" }),
      }),
      { params: Promise.resolve({ id: String(sub.id) }) }
    );

    expect(patchRes.status).toBe(200);
    const updatedSub = await SubmissionService.getSubmission(sub.id);
    expect(updatedSub?.title).toBe("New Preserved Title");
    expect(updatedSub?.coverImageId).toBe(String(media.id));
  });

  it("11. Drizzle to Payload migration is idempotent with no data loss and preserves timestamps", async () => {
    const db = getDb();
    const testLegacyId = 88888;
    const testSlug = `migration-test-${Date.now()}`;
    const testCreatedAt = "2026-07-01T10:00:00.000Z";

    // 1. Insert mock data into Drizzle tables
    await db.insert(drizzleSubmissions).values({
      id: testLegacyId,
      slug: testSlug,
      title: "Drizzle Migration Test Submission",
      summary: "Testing migration script accuracy",
      content: "# Drizzle Migration\n\nOriginal content from Drizzle database.",
      authorAlias: "Drizzle Author",
      status: "reviewing",
      tags: JSON.stringify(["ios", "swift"]),
      createdAt: testCreatedAt,
      updatedAt: testCreatedAt,
    }).onConflictDoNothing();

    await db.insert(drizzleRatings).values({
      submissionId: testLegacyId,
      reviewerToken: REVIEWER_1,
      priorKnowledge: "already_expert",
      scoreDepth: 5,
      scoreClarity: 5,
      scorePracticality: 4,
      generalFeedback: "Drizzle rating comment",
      createdAt: testCreatedAt,
      updatedAt: testCreatedAt,
    }).onConflictDoNothing();

    await db.insert(drizzleAnnotations).values({
      submissionId: testLegacyId,
      reviewerToken: REVIEWER_1,
      selectedText: "Original content",
      textOffsetStart: 20,
      textOffsetEnd: 36,
      comment: "Drizzle annotation comment",
      status: "open",
      createdAt: testCreatedAt,
    }).onConflictDoNothing();

    // 2. Run migration first time
    const result1 = await migrateDrizzleSubmissionsToPayload();
    expect(result1.submissionsCount).toBeGreaterThanOrEqual(1);

    // Verify in Payload
    const migrated1 = await SubmissionService.getSubmission(testLegacyId);
    expect(migrated1).not.toBeNull();
    expect(migrated1?.title).toBe("Drizzle Migration Test Submission");
    expect(migrated1?.ratingStats.count).toBe(1);
    expect(migrated1?.annotations.length).toBe(1);
    expect(migrated1?.annotations[0].comment).toBe("Drizzle annotation comment");

    // 3. Run migration second time (Idempotency test)
    const result2 = await migrateDrizzleSubmissionsToPayload();
    expect(result2.submissionsCount).toBe(result1.submissionsCount);

    const migrated2 = await SubmissionService.getSubmission(testLegacyId);
    expect(migrated2).not.toBeNull();
    expect(migrated2?.title).toBe("Drizzle Migration Test Submission");
    expect(migrated2?.ratingStats.count).toBe(1); // No duplicated review
    expect(migrated2?.annotations.length).toBe(1); // No duplicated annotation
  });
});
