import { afterAll, describe, expect, it, vi } from "vitest";
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
import { Submissions, enforceSubmissionWorkflowStateMachine } from "../payload/collections/Submissions";
import { SubmissionReviews } from "../payload/collections/SubmissionReviews";
import { SubmissionAnnotations } from "../payload/collections/SubmissionAnnotations";
import { GET as getSubmissionApi, PATCH as patchSubmissionApi } from "../app/api/submissions/[id]/route";
import { POST as postRatingApi } from "../app/api/submissions/[id]/ratings/route";
import { POST as postAnnotationApi } from "../app/api/submissions/[id]/annotations/route";
import { POST as uploadMedia } from "../app/api/media/route";

// `payload` is an ESM namespace whose exports cannot be spied on directly in
// Vitest. Keep the real implementation by default and make only the local
// Payload provider swappable for the compensation test below.
const payloadMock = vi.hoisted(() => ({
  override: null as Record<string, unknown> | null,
}));

vi.mock("payload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("payload")>();
  return {
    ...actual,
    getPayload: (options: Parameters<typeof actual.getPayload>[0]) =>
      payloadMock.override ?? actual.getPayload(options),
  };
});

const REVIEWER_1 = "11111111-2222-4333-8444-555555555555";
const REVIEWER_2 = "99999999-2222-4333-8444-555555555555";

describe("Submission & Review Workflow Unified in Payload CMS (Issue #7)", () => {
  afterAll(async () => {
    // Cleanup any test created submissions
    try {
      const payload = await getPayload({ config });
      const payloadApi = payload as any;
      for (const prefix of ["test-", "migration-"]) {
        const testSubs = await payloadApi.find({
          collection: "submissions",
          where: {
            slug: { contains: prefix },
          },
          limit: 0,
        });
        for (const doc of testSubs.docs) {
          await payloadApi.delete({ collection: "submissions", id: doc.id });
        }

        const testArticles = await payloadApi.find({
          collection: "articles",
          where: {
            slug: { contains: prefix },
          },
          limit: 0,
        });
        for (const doc of testArticles.docs) {
          await payloadApi.delete({ collection: "articles", id: doc.id });
        }
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
    const updated = await SubmissionService.updateDraft(draft.slug, {
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
    const reviewing = await SubmissionService.submitForReview(sub.slug);
    expect(reviewing.status).toBe("reviewing");
    expect(reviewing.submittedAt).toBeDefined();

    // 2. reviewing -> changes_requested
    const changesReq = await SubmissionService.requestChanges(sub.slug);
    expect(changesReq.status).toBe("changes_requested");

    // 3. changes_requested -> update content -> reviewing
    await SubmissionService.updateDraft(sub.slug, {
      contentMarkdown: "# State Machine Revised\n\nAddressed reviewer comments and refined content.",
    });
    const reReviewing = await SubmissionService.submitForReview(sub.slug);
    expect(reReviewing.status).toBe("reviewing");
    expect(reReviewing.contentMarkdown).toContain("Revised");

    // 4. reviewing -> approved
    const approved = await SubmissionService.approveSubmission(sub.slug);
    expect(approved.status).toBe("approved");
    expect(approved.approvedAt).toBeDefined();

    // 5. approved -> published
    const pubResult = await SubmissionService.publishSubmission(sub.slug, {
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

    await SubmissionService.approveSubmission(sub.slug);

    // First Publish
    const firstPublish = await SubmissionService.publishSubmission(sub.slug);
    expect(firstPublish.alreadyPublished).toBe(false);
    const firstArticleId = firstPublish.article.id;

    // Second Publish
    const secondPublish = await SubmissionService.publishSubmission(sub.slug);
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
    await expect(SubmissionService.publishSubmission(draftSub.slug)).rejects.toThrow();

    // B. Reviewing cannot directly publish without approval
    const revSub = await SubmissionService.createDraft({
      title: "Illegal Transition Test 2",
      contentMarkdown: "# Reviewing Direct Publish\n\nReviewing submission should not be directly publishable.",
      submitImmediately: true,
    });
    await expect(SubmissionService.publishSubmission(revSub.slug)).rejects.toThrow();

    // C. Rejected submission cannot be published
    await SubmissionService.rejectSubmission(revSub.slug);
    await expect(SubmissionService.publishSubmission(revSub.slug)).rejects.toThrow();
  });

  it("5. Review Ratings support multi-dimensional scoring and upsert per reviewer", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Review Rating Test Article",
      contentMarkdown: "# Rating Article\n\nTesting multi-dimensional scores and rating aggregates.",
      submitImmediately: true,
    });

    // Reviewer 1 rates (4, 5, 4)
    const rate1 = await SubmissionService.addOrUpdateReview(sub.slug, {
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
    const rate2 = await SubmissionService.addOrUpdateReview(sub.slug, {
      reviewerToken: REVIEWER_2,
      scoreDepth: 2,
      scoreClarity: 3,
      scorePracticality: 2,
    });

    expect(rate2.ratingStats.count).toBe(2);
    expect(rate2.ratingStats.avgDepth).toBe(3); // (4 + 2)/2 = 3.0
    expect(rate2.ratingStats.avgClarity).toBe(4); // (5 + 3)/2 = 4.0

    // Reviewer 1 updates their rating to (5, 5, 5) -> Count stays 2
    const rate1Update = await SubmissionService.addOrUpdateReview(sub.slug, {
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
    const ann = await SubmissionService.addAnnotation(sub.slug, {
      reviewerToken: REVIEWER_1,
      selectedText: "Select this text",
      textOffsetStart: 10,
      textOffsetEnd: 26,
      comment: "Please add more implementation details.",
    });

    expect(ann.id).toBeDefined();
    expect(ann.status).toBe("open");

    // Fetch submission with annotations
    const detail = await SubmissionService.getSubmission(sub.slug);
    expect(detail?.annotations.length).toBe(1);
    expect(detail?.annotationStats.open).toBe(1);

    // Resolve annotation
    const resolved = await SubmissionService.updateAnnotationStatus(ann.id, "resolved");
    expect(resolved.status).toBe("resolved");

    const detailResolved = await SubmissionService.getSubmission(sub.slug);
    expect(detailResolved?.annotationStats.open).toBe(0);
    expect(detailResolved?.annotationStats.total).toBe(1);
  });

  it("7. Legacy ID query compatibility works for /reviews/[id]", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Legacy ID Compatibility Test",
      contentMarkdown: "# Legacy ID Article\n\nTesting backward compatibility lookup.",
      legacyId: 9999,
    });
    expect(sub.legacyId).toBe(9999);

    // Query by legacyId
    const byLegacy = await SubmissionService.getSubmission(9999);
    expect(byLegacy).not.toBeNull();
    expect(byLegacy?.title).toBe("Legacy ID Compatibility Test");

    // Query by string legacyId
    const byLegacyStr = await SubmissionService.getSubmission("9999");
    expect(byLegacyStr).not.toBeNull();
    expect(byLegacyStr?.title).toBe("Legacy ID Compatibility Test");

    // New submissions are addressed by slug. A numeric Payload ID must not
    // fall through to an internal-ID lookup and collide with legacy URLs.
    const newSub = await SubmissionService.createDraft({
      title: "New Slug Route Compatibility Test",
      contentMarkdown: "# Slug Route\n\nNew submissions must use their slug as the canonical route.",
    });
    expect(newSub.slug).toMatch(/^[a-z0-9-]+$/);
    expect(await SubmissionService.getSubmission(newSub.slug)).not.toBeNull();

    // Payload's SQLite adapter uses numeric IDs. Keep this assertion explicit:
    // it protects the namespace rule if a future lookup helper reintroduces an
    // ID fallback. The legacy lookup above remains the only numeric route.
    expect(typeof newSub.id).toBe("number");
    const byPayloadId = await SubmissionService.getSubmission(newSub.id);
    expect(byPayloadId).toBeNull();

    const legacyApiResponse = await getSubmissionApi(
      new Request("https://example.com/api/submissions/9999"),
      { params: Promise.resolve({ id: "9999" }) }
    );
    expect(legacyApiResponse.status).toBe(200);

    const slugApiResponse = await getSubmissionApi(
      new Request(`https://example.com/api/submissions/${newSub.slug}`),
      { params: Promise.resolve({ id: newSub.slug }) }
    );
    expect(slugApiResponse.status).toBe(200);

    const numericPayloadApiResponse = await getSubmissionApi(
      new Request(`https://example.com/api/submissions/${newSub.id}`),
      { params: Promise.resolve({ id: String(newSub.id) }) }
    );
    expect(numericPayloadApiResponse.status).toBe(404);
  });

  it("8. updateDraft is strictly forbidden in reviewing, approved, published, or rejected status", async () => {
    const sub = await SubmissionService.createDraft({
      title: "Draft Status Restriction Test",
      contentMarkdown: "# Initial Content\n\nTesting that updateDraft enforces draft or changes_requested.",
      submitImmediately: true, // initial status: reviewing
    });

    // In reviewing status, updateDraft should throw error
    await expect(
      SubmissionService.updateDraft(sub.slug, { title: "Attempted Title Update" })
    ).rejects.toThrow("Cannot edit submission in 'reviewing' status");

    // Approve the submission
    await SubmissionService.approveSubmission(sub.slug);

    // In approved status, updateDraft should throw error (prevents '審 A 發 B')
    await expect(
      SubmissionService.updateDraft(sub.slug, { contentMarkdown: "Maliciously modified content" })
    ).rejects.toThrow("Cannot edit submission in 'approved' status");
  });

  it("9. PATCH /api/submissions/[id] rejects direct status mutation", async () => {
    const sub = await SubmissionService.createDraft({
      title: "API Status Guard Test",
      contentMarkdown: "# API Status Guard\n\nTesting that client cannot pass direct status to PATCH.",
      submitImmediately: true,
    });

    const patchRes = await patchSubmissionApi(
      new Request(`https://example.com/api/submissions/${sub.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: sub.slug }) }
    );

    expect(patchRes.status).toBe(400);
    const patchData = await patchRes.json();
    expect(patchData.error).toContain("Direct status mutation is forbidden");
  });

  it("10. PATCH /api/submissions/[id] modifying only title preserves existing coverImageId", async () => {
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const formData = new FormData();
    const file = new File([pngBuffer], "cover_test.png", { type: "image/png" });
    formData.append("file", file);
    formData.append("alt", "Test Cover Image");

    const mediaRes = await uploadMedia(
      new Request("https://example.com/api/media", {
        method: "POST",
        body: formData,
      })
    );
    expect(mediaRes.status).toBe(201);
    const mediaData = await mediaRes.json();
    const mediaId = String(mediaData.media.id);

    const sub = await SubmissionService.createDraft({
      title: "Cover Image Preservation Test",
      contentMarkdown: "# Cover Image Test\n\nTesting that updating title alone does not wipe coverImage.",
      coverImageId: mediaId,
    });

    expect(sub.coverImageId).toBe(mediaId);

    // PATCH only title
    const patchRes = await patchSubmissionApi(
      new Request(`https://example.com/api/submissions/${sub.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "New Preserved Title" }),
      }),
      { params: Promise.resolve({ id: sub.slug }) }
    );

    expect(patchRes.status).toBe(200);
    const updatedSub = await SubmissionService.getSubmission(sub.slug);
    expect(updatedSub?.title).toBe("New Preserved Title");
    expect(updatedSub?.coverImageId).toBe(mediaId);
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

    // Same reviewer and selected text, but a distinct offset/comment. The
    // migration key must retain both annotations instead of collapsing them.
    await db.insert(drizzleAnnotations).values({
      submissionId: testLegacyId,
      reviewerToken: REVIEWER_1,
      selectedText: "Original content",
      textOffsetStart: 21,
      textOffsetEnd: 37,
      comment: "Second annotation comment",
      status: "resolved",
      createdAt: testCreatedAt,
    }).onConflictDoNothing();

    // 2. Run migration first time
    const result1 = await migrateDrizzleSubmissionsToPayload();
    expect(result1.submissionsCount).toBeGreaterThanOrEqual(1);

    // Verify in Payload
    const migrated1 = await SubmissionService.getSubmission(testLegacyId, REVIEWER_1);
    expect(migrated1).not.toBeNull();
    expect(migrated1?.title).toBe("Drizzle Migration Test Submission");
    expect(migrated1?.createdAt).toBe(testCreatedAt);
    expect(migrated1?.updatedAt).toBe(testCreatedAt);
    expect(migrated1?.ratingStats.count).toBe(1);
    expect(migrated1?.myRating?.createdAt).toBe(testCreatedAt);
    expect(migrated1?.myRating?.updatedAt).toBe(testCreatedAt);
    expect(migrated1?.annotations.length).toBe(2);
    expect(migrated1?.annotations[0].comment).toBe("Drizzle annotation comment");
    expect(migrated1?.annotations[1].comment).toBe("Second annotation comment");
    expect(migrated1?.annotations[1].status).toBe("resolved");

    // 3. Run migration second time (Idempotency test)
    const result2 = await migrateDrizzleSubmissionsToPayload();
    expect(result2.submissionsCount).toBe(result1.submissionsCount);

    const migrated2 = await SubmissionService.getSubmission(testLegacyId, REVIEWER_1);
    expect(migrated2).not.toBeNull();
    expect(migrated2?.title).toBe("Drizzle Migration Test Submission");
    expect(migrated2?.createdAt).toBe(testCreatedAt);
    expect(migrated2?.updatedAt).toBe(testCreatedAt);
    expect(migrated2?.ratingStats.count).toBe(1); // No duplicated review
    expect(migrated2?.myRating?.createdAt).toBe(testCreatedAt);
    expect(migrated2?.myRating?.updatedAt).toBe(testCreatedAt);
    expect(migrated2?.annotations.length).toBe(2); // No duplicated/lost annotation
  });

  it("12. Payload direct writes cannot bypass the submission workflow state machine", async () => {
    const submissionFields = Submissions.fields as any[];
    const protectedWorkflowFields = [
      "status",
      "submittedAt",
      "approvedAt",
      "publishedAt",
      "publishedArticle",
      "legacyId",
    ];

    for (const fieldName of protectedWorkflowFields) {
      const field = submissionFields.find((candidate) => candidate.name === fieldName);
      expect(field, `${fieldName} must be present in the collection`).toBeDefined();
      expect(
        field.access?.update?.({ req: { user: { id: "admin" } } }),
        `${fieldName} must be immutable through direct Payload writes`
      ).toBe(false);
    }

    expect(() =>
      enforceSubmissionWorkflowStateMachine({
        operation: "update",
        req: { user: { id: "admin" } },
        data: { title: "Edited in CMS" },
        originalDoc: { status: "published" },
      } as any)
    ).toThrow("Cannot edit submission in 'published' status");

    expect(() =>
      enforceSubmissionWorkflowStateMachine({
        operation: "create",
        req: { user: { id: "admin" } },
        data: {
          title: "CMS Direct Publish",
          summary: "Blocked direct publish",
          contentMarkdown: "# Blocked",
          status: "published",
        },
        originalDoc: null,
      } as any)
    ).toThrow("Submission workflow can only be managed through SubmissionService.");
  });

  it("12b. Review collections are internal and reviewer tokens are never directly readable", async () => {
    for (const collection of [SubmissionReviews, SubmissionAnnotations]) {
      expect(collection.access?.read?.({ req: { user: null } } as any)).toBe(false);
      expect(collection.access?.read?.({ req: { user: { id: "admin", role: "admin" } } } as any)).toBe(false);
      expect(collection.access?.create?.({ req: { user: { id: "admin" } } } as any)).toBe(false);
      expect(collection.access?.update?.({ req: { user: { id: "admin" } } } as any)).toBe(false);
      expect(collection.access?.delete?.({ req: { user: { id: "admin" } } } as any)).toBe(false);

      const tokenField = (collection.fields as any[]).find(
        (candidate) => candidate.name === "reviewerToken"
      );
      expect(tokenField).toBeDefined();
      expect(tokenField.access?.read?.({ req: { user: null } })).toBe(false);
      expect(tokenField.access?.read?.({ req: { user: { id: "admin" } } })).toBe(false);
    }

    expect(Submissions.access?.create?.({ req: { user: { id: "admin" } } } as any)).toBe(false);
    expect(Submissions.access?.update?.({ req: { user: { id: "admin" } } } as any)).toBe(false);
    expect(Submissions.access?.delete?.({ req: { user: { id: "admin" } } } as any)).toBe(false);
  });

  it("13. Public submission APIs do not expose reviewerToken", async () => {
    const sub = await SubmissionService.createDraft({
      title: "test-public-token-exposure",
      contentMarkdown: "# Token Exposure\n\nTesting public API sanitization.",
      submitImmediately: true,
    });

    const ratingRes = await postRatingApi(
      new Request(`https://example.com/api/submissions/${sub.slug}/ratings`, {
        method: "POST",
        body: JSON.stringify({
          reviewerToken: REVIEWER_1,
          priorKnowledge: "new_knowledge",
          scoreDepth: 4,
          scoreClarity: 4,
          scorePracticality: 4,
          generalFeedback: "Looks good",
        }),
      }),
      { params: Promise.resolve({ id: sub.slug }) }
    );
    expect(ratingRes.status).toBe(200);
    const ratingData = await ratingRes.json();
    expect(ratingData.myRating).toBeDefined();
    expect(ratingData.myRating).not.toHaveProperty("reviewerToken");

    const annotationRes = await postAnnotationApi(
      new Request(`https://example.com/api/submissions/${sub.slug}/annotations`, {
        method: "POST",
        body: JSON.stringify({
          reviewerToken: REVIEWER_1,
          selectedText: "Token Exposure",
          textOffsetStart: 0,
          textOffsetEnd: 14,
          comment: "Hide this token",
        }),
      }),
      { params: Promise.resolve({ id: sub.slug }) }
    );
    expect(annotationRes.status).toBe(201);
    const annotationData = await annotationRes.json();
    expect(annotationData.annotation).toBeDefined();
    expect(annotationData.annotation).not.toHaveProperty("reviewerToken");

    const getRes = await getSubmissionApi(
      new Request(`https://example.com/api/submissions/${sub.slug}`, {
        headers: {
          "x-reviewer-token": REVIEWER_1,
        },
      }),
      { params: Promise.resolve({ id: sub.slug }) }
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.myRating).toBeDefined();
    expect(getData.myRating).not.toHaveProperty("reviewerToken");
    expect(getData.annotations).toHaveLength(1);
    expect(getData.annotations[0]).not.toHaveProperty("reviewerToken");
  });

  it("14. publishSubmission rolls back updated articles when submission persistence fails", async () => {
    const slug = `test-publish-rollback-${Date.now()}`;
    const originalArticle = {
      id: "article-rollback-1",
      slug,
      title: "Original Article Title",
      summary: "Original article summary",
      contentMarkdown: "# Original Article\n\nOriginal body.",
      author: "Original Author",
      readTime: "4 MIN READ",
      eyebrow: "Original Eyebrow",
      publishedAt: "2026-01-01T00:00:00.000Z",
      status: "draft",
      tags: ["old-tag"],
      coverImage: "old-cover",
    };
    let currentArticle: Record<string, unknown> = { ...originalArticle };
    const updateCalls: Array<{ collection: string; data: Record<string, unknown> }> = [];

    const fakePayload = {
      find: vi.fn(async ({ collection, where }: { collection: string; where?: Record<string, any> }) => {
        if (collection === "submissions" && where?.slug?.equals === slug) {
          return {
            docs: [
              {
                id: "submission-rollback-1",
                slug,
                title: "Rollback Submission",
                summary: "Rollback submission summary",
                contentMarkdown: "# Rollback Submission\n\nBody.",
                authorAlias: "Rollback Author",
                status: "approved",
                tags: [],
                coverImage: null,
                submittedAt: null,
                approvedAt: "2026-08-01T00:00:00.000Z",
                publishedAt: null,
                publishedArticle: null,
                createdAt: "2026-08-01T00:00:00.000Z",
                updatedAt: "2026-08-01T00:00:00.000Z",
              },
            ],
          };
        }

        if (collection === "articles" && where?.slug?.equals === slug) {
          return { docs: [{ ...currentArticle }] };
        }

        return { docs: [] };
      }),
      update: vi.fn(async ({ collection, id, data }: { collection: string; id: string | number; data: Record<string, unknown> }) => {
        updateCalls.push({ collection, data });
        if (collection === "articles") {
          currentArticle = { ...currentArticle, ...data, id };
          return { ...currentArticle, id };
        }

        if (collection === "submissions") {
          throw new Error("Simulated submission update failure");
        }

        throw new Error(`Unexpected update collection: ${collection}`);
      }),
      create: vi.fn(async () => {
        throw new Error("Unexpected create call");
      }),
      delete: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === "articles") {
          currentArticle = { ...originalArticle };
          return {};
        }

        throw new Error(`Unexpected delete collection: ${collection}`);
      }),
    };

    payloadMock.override = fakePayload;
    try {
      await expect(SubmissionService.publishSubmission(slug)).rejects.toThrow(
        "Simulated submission update failure"
      );
      expect(currentArticle).toMatchObject(originalArticle);
      expect(updateCalls.map((call) => call.collection)).toEqual([
        "articles",
        "submissions",
        "articles",
      ]);
    } finally {
      payloadMock.override = null;
    }
  });

  it("15. Published legacy Drizzle submissions reconcile to a published Payload Article", async () => {
    const db = getDb();
    const payload = await getPayload({ config });
    const legacyId = 88991;
    const slug = `test-published-migration-${Date.now()}`;
    const createdAt = "2026-08-01T10:00:00.000Z";

    const seededArticle = await payload.create({
      collection: "articles",
      data: {
        title: "Outdated Article Title",
        slug,
        summary: "Outdated summary before migration",
        contentMarkdown: "# Outdated Article\n\nOld article body.",
        author: "Old Author",
        readTime: "3 MIN READ",
        status: "draft",
        publishedAt: "2026-07-01T00:00:00.000Z",
        tags: [],
      },
    } as any);

    await db.insert(drizzleSubmissions).values({
      id: legacyId,
      slug,
      title: "Migrated Published Submission",
      summary: "Published summary from Drizzle",
      content: "# Published Body\n\nThis should become the article body.",
      authorAlias: "Legacy Author",
      status: "published",
      tags: JSON.stringify(["ios"]),
      createdAt,
      updatedAt: createdAt,
    }).onConflictDoNothing();

    const result = await migrateDrizzleSubmissionsToPayload();
    expect(result.submissionsCount).toBeGreaterThanOrEqual(1);

    const migrated = await SubmissionService.getSubmission(legacyId);
    expect(migrated).not.toBeNull();
    expect(migrated?.status).toBe("published");
    expect(migrated?.legacyId).toBe(legacyId);
    expect(migrated?.publishedArticleId).toBe(String(seededArticle.id));
    expect(migrated?.publishedAt).toBe(createdAt);

    const article = await getPublishedArticleBySlug(slug);
    expect(article).not.toBeNull();
    expect(article?.title).toBe("Migrated Published Submission");
    expect(article?.summary).toBe("Published summary from Drizzle");
    expect(article?.contentMarkdown).toContain("Published Body");
    // Public article mapping formats dates for display; the raw ISO value is
    // asserted below against the Payload document itself.
    expect(article?.publishedAt).toBe("2026.08.01");

    // `getPublishedArticleBySlug` intentionally exposes only the public
    // article shape. Verify the persisted workflow fields directly through
    // Payload as well, so migration cannot leave a draft article behind.
    const reconciledArticles = await (payload as any).find({
      collection: "articles",
      where: { slug: { equals: slug } },
      limit: 1,
    });
    expect(reconciledArticles.docs[0]?.status).toBe("published");
    expect(reconciledArticles.docs[0]?.publishedAt).toBe(createdAt);
  });

  it("16. SubmissionReviews enforces DB-level uniqueness via reviewKey and rejects duplicates", async () => {
    const payload = await getPayload({ config });
    const sub = await SubmissionService.createDraft({
      title: "test-review-uniqueness",
      contentMarkdown: "# Review Uniqueness\n\nTesting DB-level review uniqueness constraints.",
      submitImmediately: true,
    });

    const fields = SubmissionReviews.fields as any[];
    const reviewKeyField = fields.find((f) => f.name === "reviewKey");
    expect(reviewKeyField).toBeDefined();
    expect(reviewKeyField.unique).toBe(true);

    // Create first review doc directly via Payload
    const firstReview = await (payload as any).create({
      collection: "submission-reviews",
      data: {
        submission: sub.id,
        reviewerToken: REVIEWER_1,
        priorKnowledge: "new_knowledge",
        scoreDepth: 4,
        scoreClarity: 4,
        scorePracticality: 4,
      },
    });
    expect(firstReview.id).toBeDefined();
    expect(firstReview.reviewKey).toBe(`${sub.id}:${REVIEWER_1}`);

    // Direct create of second review with identical (submission, reviewerToken) must fail with unique constraint error
    await expect(
      (payload as any).create({
        collection: "submission-reviews",
        data: {
          submission: sub.id,
          reviewerToken: REVIEWER_1,
          priorKnowledge: "already_expert",
          scoreDepth: 5,
          scoreClarity: 5,
          scorePracticality: 5,
        },
      })
    ).rejects.toThrow();
  });

  it("17. SubmissionService.addOrUpdateReview handles concurrent calls without creating duplicate ratings", async () => {
    const sub = await SubmissionService.createDraft({
      title: "test-concurrent-review-upsert",
      contentMarkdown: "# Concurrent Review\n\nTesting concurrent review submission handling.",
      submitImmediately: true,
    });

    // Fire two review updates concurrently from the same reviewer
    const [res1, res2] = await Promise.all([
      SubmissionService.addOrUpdateReview(sub.slug, {
        reviewerToken: REVIEWER_1,
        priorKnowledge: "familiar_surface",
        scoreDepth: 4,
        scoreClarity: 4,
        scorePracticality: 4,
        generalFeedback: "Review A",
      }),
      SubmissionService.addOrUpdateReview(sub.slug, {
        reviewerToken: REVIEWER_1,
        priorKnowledge: "already_expert",
        scoreDepth: 5,
        scoreClarity: 5,
        scorePracticality: 5,
        generalFeedback: "Review B",
      }),
    ]);

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();

    // Verify submission ratingStats: count must be strictly 1
    const detail = await SubmissionService.getSubmission(sub.slug, REVIEWER_1);
    expect(detail).not.toBeNull();
    expect(detail?.ratingStats.count).toBe(1);

    // Verify raw collection: strictly 1 review document exists for this submission
    const payload = await getPayload({ config });
    const allReviews = await (payload as any).find({
      collection: "submission-reviews",
      where: {
        submission: { equals: sub.id },
      },
      limit: 10,
    });
    expect(allReviews.docs.length).toBe(1);
    expect(allReviews.docs[0].reviewKey).toBe(`${sub.id}:${REVIEWER_1}`);
  });
});
