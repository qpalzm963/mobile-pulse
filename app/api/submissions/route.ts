import { sql } from "drizzle-orm";
import { getPayload } from "payload";
import config from "@payload-config";
import { getDb } from "../../../db";
import { submissionAnnotations, submissionRatings, submissions } from "../../../db/schema";
import { readJson } from "../../../lib/request";
import {
  ARTICLE_CONTENT_LIMITS,
  extractSummaryFromMarkdown,
  validateArticleInput,
} from "../../../lib/content-markdown";

export async function GET() {
  const db = getDb();
  try {
    const list = await db
      .select({
        id: submissions.id,
        slug: submissions.slug,
        title: submissions.title,
        summary: submissions.summary,
        authorAlias: submissions.authorAlias,
        coverImageId: submissions.coverImageId,
        tags: submissions.tags,
        status: submissions.status,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
      })
      .from(submissions)
      .orderBy(sql`${submissions.createdAt} desc`);

    // Fetch aggregate rating stats & annotation counts
    const ratingsSummary = await db
      .select({
        submissionId: submissionRatings.submissionId,
        count: sql<number>`count(*)`,
        avgDepth: sql<number>`round(avg(${submissionRatings.scoreDepth}), 1)`,
        avgClarity: sql<number>`round(avg(${submissionRatings.scoreClarity}), 1)`,
        avgPracticality: sql<number>`round(avg(${submissionRatings.scorePracticality}), 1)`,
        overallAvg: sql<number>`round((avg(${submissionRatings.scoreDepth}) + avg(${submissionRatings.scoreClarity}) + avg(${submissionRatings.scorePracticality})) / 3.0, 1)`,
      })
      .from(submissionRatings)
      .groupBy(submissionRatings.submissionId);

    const annotationsSummary = await db
      .select({
        submissionId: submissionAnnotations.submissionId,
        count: sql<number>`count(*)`,
        openCount: sql<number>`sum(case when ${submissionAnnotations.status} = 'open' then 1 else 0 end)`,
      })
      .from(submissionAnnotations)
      .groupBy(submissionAnnotations.submissionId);

    const ratingsMap = new Map(ratingsSummary.map((r) => [r.submissionId, r]));
    const annotationsMap = new Map(annotationsSummary.map((a) => [a.submissionId, a]));

    const result = list.map((sub) => {
      const rating = ratingsMap.get(sub.id);
      const annotation = annotationsMap.get(sub.id);
      return {
        ...sub,
        tags: JSON.parse(sub.tags || "[]"),
        ratingStats: {
          count: rating?.count ?? 0,
          avgDepth: rating?.avgDepth ?? 0,
          avgClarity: rating?.avgClarity ?? 0,
          avgPracticality: rating?.avgPracticality ?? 0,
          overallAvg: rating?.overallAvg ?? 0,
        },
        annotationStats: {
          total: annotation?.count ?? 0,
          open: annotation?.openCount ?? 0,
        },
      };
    });

    return Response.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to list submissions:", error);
    return new Response(null, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { title, summary, contentMarkdown, coverImageId, authorAlias, tags, status } = body as Record<string, unknown>;

  // Strict Validation: New submissions must provide contentMarkdown (arbitrary HTML via legacy 'content' is blocked)
  const validation = validateArticleInput({ title, summary, contentMarkdown });
  if (!validation.isValid) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400 });
  }

  const cleanTitle = (title as string).trim();
  const rawContent = (contentMarkdown as string).trim();

  // Determine Summary with fallback
  let finalSummary = typeof summary === "string" ? summary.trim() : "";
  if (!finalSummary) {
    finalSummary = extractSummaryFromMarkdown(rawContent, ARTICLE_CONTENT_LIMITS.MAX_SUMMARY_LENGTH);
  }
  if (!finalSummary) {
    finalSummary = cleanTitle;
  }

  // Validate coverImageId exists in Media collection if provided
  let validatedCoverImageId: string | null = null;
  if (typeof coverImageId === "string" && coverImageId.trim()) {
    try {
      const payload = await getPayload({ config });
      const mediaDoc = await payload.findByID({
        collection: "media",
        id: Number(coverImageId.trim()) || coverImageId.trim(),
      });
      if (!mediaDoc) {
        return new Response(
          JSON.stringify({ error: `Referenced coverImageId "${coverImageId}" does not exist in Media collection` }),
          { status: 400 }
        );
      }
      validatedCoverImageId = String(mediaDoc.id);
    } catch {
      return new Response(
        JSON.stringify({ error: `Referenced coverImageId "${coverImageId}" does not exist in Media collection` }),
        { status: 400 }
      );
    }
  }

  const rawSlug = cleanTitle
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = rawSlug || `submission-${Date.now()}`;
  const finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const db = getDb();
  try {
    const inserted = await db
      .insert(submissions)
      .values({
        slug: finalSlug,
        title: cleanTitle,
        summary: finalSummary,
        content: rawContent,
        coverImageId: validatedCoverImageId,
        authorAlias: typeof authorAlias === "string" && authorAlias.trim() ? authorAlias.trim() : "匿名組員",
        tags: Array.isArray(tags) ? JSON.stringify(tags) : "[]",
        status: status === "draft" ? "draft" : "reviewing",
      })
      .returning();

    const sub = inserted[0];
    return Response.json(
      {
        success: true,
        submission: {
          ...sub,
          contentMarkdown: sub.content,
          content: sub.content, // Deprecated alias
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create submission:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}
