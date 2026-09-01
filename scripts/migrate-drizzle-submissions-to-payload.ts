import { getPayload } from "payload";
import config from "../payload.config";
import { getDb } from "../db";
import { submissions, submissionRatings, submissionAnnotations } from "../db/schema";

type PayloadCollection = "submissions" | "submission-reviews" | "submission-annotations";

/**
 * Payload's collection update operation always refreshes `updatedAt`. A data
 * migration must retain source timestamps, so restore them through the
 * adapter's low-level update after the validated collection write completes.
 */
async function restorePayloadTimestamps(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: PayloadCollection,
  id: string | number,
  timestamps: { createdAt?: string | null; updatedAt?: string | null }
) {
  const data: Record<string, string> = {};
  if (timestamps.createdAt) data.createdAt = timestamps.createdAt;
  if (timestamps.updatedAt) data.updatedAt = timestamps.updatedAt;
  if (Object.keys(data).length === 0) return;

  await payload.db.updateOne({ collection, id, data });
}

export async function migrateDrizzleSubmissionsToPayload(): Promise<{
  submissionsCount: number;
  ratingsCount: number;
  annotationsCount: number;
}> {
  console.log("🚀 Starting Drizzle -> Payload Submission Migration...");

  let db;
  try {
    db = getDb();
  } catch (err) {
    console.log("ℹ️ Drizzle database not found or empty, skipping Drizzle migration.");
    return { submissionsCount: 0, ratingsCount: 0, annotationsCount: 0 };
  }

  const payload = await getPayload({ config });

  // 1. Read existing Drizzle submissions
  let drizzleSubmissions: any[] = [];
  try {
    drizzleSubmissions = await db.select().from(submissions);
  } catch (e) {
    console.log("ℹ️ Drizzle submissions table does not exist or empty.");
  }

  console.log(`📦 Found ${drizzleSubmissions.length} submissions in Drizzle.`);

  const submissionIdMap = new Map<number, string | number>();

  for (const sub of drizzleSubmissions) {
    let rawTags: string[] = [];
    try {
      rawTags = JSON.parse(sub.tags || "[]");
    } catch {
      rawTags = [];
    }

    const tagIds: (string | number)[] = [];

    for (const t of rawTags) {
      if (!t || t === "all") continue;
      const clean = String(t).trim();
      const found = await payload.find({
        collection: "tags",
        where: {
          or: [{ tagId: { equals: clean } }, { name: { equals: clean } }],
        },
        limit: 1,
      });
      if (found.docs.length > 0) {
        tagIds.push(found.docs[0].id);
      } else {
        const created = await payload.create({
          collection: "tags",
          data: {
            tagId: clean.toLowerCase().replace(/[^\w-]/g, ""),
            name: clean,
          },
        });
        tagIds.push(created.id);
      }
    }

    let coverImageRel: string | number | null = null;
    if (sub.coverImageId) {
      try {
        const media = await payload.findByID({
          collection: "media",
          id: Number(sub.coverImageId) || sub.coverImageId,
        });
        if (media) coverImageRel = media.id;
      } catch {
        // media not found
      }
    }

    // Match by legacyId first, then slug. Keep these as separate queries so a
    // Payload document with the same numeric ID/slug cannot win an ambiguous
    // `or` query over the legacy document we are migrating.
    const existingByLegacyId = await payload.find({
      collection: "submissions",
      where: { legacyId: { equals: sub.id } },
      limit: 1,
    });
    const existing = existingByLegacyId.docs.length > 0
      ? existingByLegacyId
      : await payload.find({
          collection: "submissions",
          where: { slug: { equals: sub.slug } },
          limit: 1,
        });

    const submittedAtTime = sub.submittedAt || (sub.status !== "draft" ? sub.createdAt : null);
    const publishedAtTime =
      sub.status === "published"
        ? sub.publishedAt || sub.updatedAt || sub.submittedAt || sub.createdAt || new Date().toISOString()
        : sub.publishedAt || null;

    // Blocker 4: for published submissions, upsert the corresponding Payload Article first.
    let publishedArticleId: string | number | null = null;
    let publishedArticleSnapshot: Record<string, unknown> | null = null;
    let publishedArticleWasCreated = false;
    if (sub.status === "published" && sub.slug) {
      const articleData = {
        title: sub.title,
        slug: sub.slug,
        summary: sub.summary,
        contentMarkdown: sub.content,
        author: sub.authorAlias || "MOBILE PULSE 編輯部",
        readTime: "5 MIN READ",
        eyebrow: null,
        publishedAt: publishedAtTime,
        status: "published" as const,
        tags: tagIds as any,
        coverImage: coverImageRel as any,
      };

      const articleResult = await payload.find({
        collection: "articles",
        where: { slug: { equals: sub.slug } },
        depth: 0,
        limit: 1,
      });

      if (articleResult.docs.length > 0) {
        const existingArticle = articleResult.docs[0] as Record<string, unknown>;
        publishedArticleId = existingArticle.id as string | number;
        publishedArticleSnapshot = { ...existingArticle };

        const updatedArticle = await payload.update({
          collection: "articles",
          id: publishedArticleId as any,
          data: articleData,
        });
        publishedArticleId = updatedArticle.id as string | number;
        console.log(`  🔗 Updated publishedArticle for submission "${sub.title}" → article ID ${publishedArticleId}`);
      } else {
        const createdArticle = await payload.create({
          collection: "articles",
          data: articleData,
        });
        publishedArticleId = createdArticle.id as string | number;
        publishedArticleWasCreated = true;
        console.log(`  🔗 Created publishedArticle for submission "${sub.title}" → article ID ${publishedArticleId}`);
      }
    } else if (sub.status === "published") {
      console.log(`  ⚠️ Published submission "${sub.title}" (legacyId: ${sub.id}) is missing a slug; skipping article reconciliation.`);
    }

    const rollbackPublishedArticle = async () => {
      if (publishedArticleId === null) return;

      if (publishedArticleWasCreated) {
        await payload.delete({ collection: "articles", id: publishedArticleId as any });
        return;
      }

      if (!publishedArticleSnapshot) return;

      const restoreData: Record<string, unknown> = {
        title: publishedArticleSnapshot.title,
        slug: publishedArticleSnapshot.slug,
        summary: publishedArticleSnapshot.summary,
        contentMarkdown: publishedArticleSnapshot.contentMarkdown,
        author: publishedArticleSnapshot.author,
        readTime: publishedArticleSnapshot.readTime,
        eyebrow: publishedArticleSnapshot.eyebrow,
        publishedAt: publishedArticleSnapshot.publishedAt,
        status: publishedArticleSnapshot.status,
        tags: publishedArticleSnapshot.tags,
        coverImage: publishedArticleSnapshot.coverImage,
      };
      if (Object.prototype.hasOwnProperty.call(publishedArticleSnapshot, "interactiveComponent")) {
        restoreData.interactiveComponent = publishedArticleSnapshot.interactiveComponent;
      }

      await payload.update({
        collection: "articles",
        id: publishedArticleId as any,
        data: restoreData as any,
      });
    };

    if (existing.docs.length > 0) {
      const docId = existing.docs[0].id;
      submissionIdMap.set(sub.id, docId);
      try {
        const updated = await payload.update({
          collection: "submissions",
          id: docId,
          data: {
            title: sub.title,
            slug: sub.slug,
            summary: sub.summary,
            contentMarkdown: sub.content,
            authorAlias: sub.authorAlias || "匿名組員",
            status: sub.status || "reviewing",
            tags: tagIds as any,
            coverImage: coverImageRel as any,
            submittedAt: submittedAtTime,
            legacyId: sub.id,
            ...(publishedArticleId !== null ? { publishedArticle: publishedArticleId as any } : {}),
            ...(sub.status === "published" && publishedAtTime
              ? { publishedAt: publishedAtTime }
              : sub.publishedAt
                ? { publishedAt: sub.publishedAt }
                : {}),
            ...(sub.approvedAt ? { approvedAt: sub.approvedAt } : {}),
            ...(sub.createdAt ? { createdAt: sub.createdAt } : {}),
            ...(sub.updatedAt ? { updatedAt: sub.updatedAt } : {}),
          },
        });
        await restorePayloadTimestamps(payload, "submissions", updated.id, {
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        });
      } catch (updateErr) {
        if (sub.status === "published" && publishedArticleId !== null) {
          try {
            await rollbackPublishedArticle();
          } catch (rollbackErr) {
            console.error("  ⚠️ Failed to roll back article after submission update error:", rollbackErr);
          }
        }
        throw updateErr;
      }
      console.log(`  ✓ Updated existing Payload submission: ${sub.title} (legacyId: ${sub.id})`);
    } else {
      try {
        const created = await payload.create({
          collection: "submissions",
          data: {
            title: sub.title,
            slug: sub.slug,
            summary: sub.summary,
            contentMarkdown: sub.content,
            authorAlias: sub.authorAlias || "匿名組員",
            status: sub.status || "reviewing",
            tags: tagIds as any,
            coverImage: coverImageRel as any,
            submittedAt: submittedAtTime,
            legacyId: sub.id,
            ...(publishedArticleId !== null ? { publishedArticle: publishedArticleId as any } : {}),
            ...(sub.status === "published" && publishedAtTime
              ? { publishedAt: publishedAtTime }
              : sub.publishedAt
                ? { publishedAt: sub.publishedAt }
                : {}),
            ...(sub.approvedAt ? { approvedAt: sub.approvedAt } : {}),
            ...(sub.createdAt ? { createdAt: sub.createdAt } : {}),
            ...(sub.updatedAt ? { updatedAt: sub.updatedAt } : {}),
          },
        });
        await restorePayloadTimestamps(payload, "submissions", created.id, {
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        });
        submissionIdMap.set(sub.id, created.id);
        console.log(`  + Created Payload submission: ${sub.title} (legacyId: ${sub.id})`);
      } catch (createErr) {
        if (sub.status === "published" && publishedArticleId !== null) {
          try {
            await rollbackPublishedArticle();
          } catch (rollbackErr) {
            console.error("  ⚠️ Failed to roll back article after submission create error:", rollbackErr);
          }
        }
        throw createErr;
      }
    }
  }

  // 2. Read existing Drizzle ratings
  let drizzleRatings: any[] = [];
  try {
    drizzleRatings = await db.select().from(submissionRatings);
  } catch (e) {
    console.log("ℹ️ Drizzle submission_ratings table does not exist or empty.");
  }

  console.log(`⭐ Found ${drizzleRatings.length} ratings in Drizzle.`);

  for (const rating of drizzleRatings) {
    const payloadSubId = submissionIdMap.get(rating.submissionId);
    if (!payloadSubId) continue;

    const existingReview = await payload.find({
      collection: "submission-reviews",
      where: {
        and: [
          { submission: { equals: payloadSubId } },
          { reviewerToken: { equals: rating.reviewerToken } },
        ],
      },
      limit: 1,
    });

    if (existingReview.docs.length > 0) {
      const updatedReview = await payload.update({
        collection: "submission-reviews",
        id: existingReview.docs[0].id,
        data: {
          priorKnowledge: rating.priorKnowledge || "new_knowledge",
          scoreDepth: rating.scoreDepth,
          scoreClarity: rating.scoreClarity,
          scorePracticality: rating.scorePracticality,
          generalFeedback: rating.generalFeedback,
          ...(rating.createdAt ? { createdAt: rating.createdAt } : {}),
          ...(rating.updatedAt ? { updatedAt: rating.updatedAt } : {}),
        },
      });
      await restorePayloadTimestamps(payload, "submission-reviews", updatedReview.id, {
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
      });
      console.log(`  ✓ Updated rating for submission ${payloadSubId} from ${rating.reviewerToken}`);
    } else {
      const createdReview = await payload.create({
        collection: "submission-reviews",
        data: {
          submission: payloadSubId as any,
          reviewerToken: rating.reviewerToken,
          priorKnowledge: rating.priorKnowledge || "new_knowledge",
          scoreDepth: rating.scoreDepth,
          scoreClarity: rating.scoreClarity,
          scorePracticality: rating.scorePracticality,
          generalFeedback: rating.generalFeedback,
          ...(rating.createdAt ? { createdAt: rating.createdAt } : {}),
          ...(rating.updatedAt ? { updatedAt: rating.updatedAt } : {}),
        },
      });
      await restorePayloadTimestamps(payload, "submission-reviews", createdReview.id, {
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
      });
      console.log(`  + Created rating for submission ${payloadSubId} from ${rating.reviewerToken}`);
    }
  }

  // 3. Read existing Drizzle annotations
  let drizzleAnnotations: any[] = [];
  try {
    drizzleAnnotations = await db.select().from(submissionAnnotations);
  } catch (e) {
    console.log("ℹ️ Drizzle submission_annotations table does not exist or empty.");
  }

  console.log(`💬 Found ${drizzleAnnotations.length} annotations in Drizzle.`);

  for (const ann of drizzleAnnotations) {
    const payloadSubId = submissionIdMap.get(ann.submissionId);
    if (!payloadSubId) continue;

    // Accurate deduplication matching submission, reviewerToken, selectedText, offsets, and comment
    const existingAnn = await payload.find({
      collection: "submission-annotations",
      where: {
        and: [
          { submission: { equals: payloadSubId } },
          { reviewerToken: { equals: ann.reviewerToken } },
          { selectedText: { equals: ann.selectedText } },
          { textOffsetStart: { equals: ann.textOffsetStart } },
          { textOffsetEnd: { equals: ann.textOffsetEnd } },
          { comment: { equals: ann.comment } },
        ],
      },
      limit: 1,
    });

    if (existingAnn.docs.length > 0) {
      const updatedAnnotation = await payload.update({
        collection: "submission-annotations",
        id: existingAnn.docs[0].id,
        data: {
          status: ann.status || "open",
          ...(ann.createdAt ? { createdAt: ann.createdAt } : {}),
        },
      });
      await restorePayloadTimestamps(payload, "submission-annotations", updatedAnnotation.id, {
        createdAt: ann.createdAt,
      });
      console.log(`  ✓ Updated annotation for submission ${payloadSubId}`);
    } else {
      const createdAnnotation = await payload.create({
        collection: "submission-annotations",
        data: {
          submission: payloadSubId as any,
          reviewerToken: ann.reviewerToken,
          selectedText: ann.selectedText,
          textOffsetStart: ann.textOffsetStart,
          textOffsetEnd: ann.textOffsetEnd,
          comment: ann.comment,
          status: ann.status || "open",
          ...(ann.createdAt ? { createdAt: ann.createdAt } : {}),
        },
      });
      await restorePayloadTimestamps(payload, "submission-annotations", createdAnnotation.id, {
        createdAt: ann.createdAt,
      });
      console.log(`  + Created annotation for submission ${payloadSubId}`);
    }
  }

  console.log("✨ Drizzle -> Payload Migration completed successfully!");
  return {
    submissionsCount: drizzleSubmissions.length,
    ratingsCount: drizzleRatings.length,
    annotationsCount: drizzleAnnotations.length,
  };
}

// If run directly from CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith("migrate-drizzle-submissions-to-payload.ts") ||
    process.argv[1].endsWith("migrate-drizzle-submissions-to-payload.js"))
) {
  migrateDrizzleSubmissionsToPayload()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Migration failed:", err);
      process.exit(1);
    });
}
