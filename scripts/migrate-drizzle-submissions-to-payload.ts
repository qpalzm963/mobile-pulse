import { getPayload } from "payload";
import config from "../payload.config";
import { getDb } from "../db";
import { submissions, submissionRatings, submissionAnnotations } from "../db/schema";

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

    // Match by legacyId first, then slug
    const existing = await payload.find({
      collection: "submissions",
      where: {
        or: [{ legacyId: { equals: sub.id } }, { slug: { equals: sub.slug } }],
      },
      limit: 1,
    });

    const submittedAtTime = sub.submittedAt || (sub.status !== "draft" ? sub.createdAt : null);

    if (existing.docs.length > 0) {
      const docId = existing.docs[0].id;
      submissionIdMap.set(sub.id, docId);
      await payload.update({
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
          ...(sub.createdAt ? { createdAt: sub.createdAt } : {}),
          ...(sub.updatedAt ? { updatedAt: sub.updatedAt } : {}),
        },
      });
      console.log(`  ✓ Updated existing Payload submission: ${sub.title} (legacyId: ${sub.id})`);
    } else {
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
          ...(sub.createdAt ? { createdAt: sub.createdAt } : {}),
          ...(sub.updatedAt ? { updatedAt: sub.updatedAt } : {}),
        },
      });
      submissionIdMap.set(sub.id, created.id);
      console.log(`  + Created Payload submission: ${sub.title} (legacyId: ${sub.id})`);
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
      await payload.update({
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
      console.log(`  ✓ Updated rating for submission ${payloadSubId} from ${rating.reviewerToken}`);
    } else {
      await payload.create({
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
      await payload.update({
        collection: "submission-annotations",
        id: existingAnn.docs[0].id,
        data: {
          status: ann.status || "open",
          ...(ann.createdAt ? { createdAt: ann.createdAt } : {}),
        },
      });
      console.log(`  ✓ Updated annotation for submission ${payloadSubId}`);
    } else {
      await payload.create({
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
