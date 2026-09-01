import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { submissionAnnotations, submissionRatings, submissions } from "../../../../db/schema";
import { readJson } from "../../../../lib/request";
import { validateArticleInput } from "../../../../lib/content-markdown";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const subId = Number(id);
  if (isNaN(subId) || subId <= 0) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const url = new URL(request.url);
  const reviewerToken = request.headers.get("x-reviewer-token") || url.searchParams.get("reviewerToken");

  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, subId))
      .limit(1);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 });
    }

    const sub = rows[0];

    // Ratings aggregate
    const ratingSummary = await db
      .select({
        count: sql<number>`count(*)`,
        avgDepth: sql<number>`round(avg(${submissionRatings.scoreDepth}), 1)`,
        avgClarity: sql<number>`round(avg(${submissionRatings.scoreClarity}), 1)`,
        avgPracticality: sql<number>`round(avg(${submissionRatings.scorePracticality}), 1)`,
        overallAvg: sql<number>`round((avg(${submissionRatings.scoreDepth}) + avg(${submissionRatings.scoreClarity}) + avg(${submissionRatings.scorePracticality})) / 3.0, 1)`,
      })
      .from(submissionRatings)
      .where(eq(submissionRatings.submissionId, subId));

    // Current user's rating if reviewerToken provided
    let myRating = null;
    if (reviewerToken) {
      const myRatingRows = await db
        .select()
        .from(submissionRatings)
        .where(
          and(
            eq(submissionRatings.submissionId, subId),
            eq(submissionRatings.reviewerToken, reviewerToken)
          )
        )
        .limit(1);
      myRating = myRatingRows[0] ?? null;
    }

    // All annotations
    const annotations = await db
      .select()
      .from(submissionAnnotations)
      .where(eq(submissionAnnotations.submissionId, subId))
      .orderBy(submissionAnnotations.createdAt);

    return Response.json(
      {
        ...sub,
        contentMarkdown: sub.content,
        content: sub.content, // Deprecated alias
        tags: JSON.parse(sub.tags || "[]"),
        ratingStats: ratingSummary[0] || {
          count: 0,
          avgDepth: 0,
          avgClarity: 0,
          avgPracticality: 0,
          overallAvg: 0,
        },
        myRating,
        annotations,
      },
      {
        headers: { "cache-control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Failed to get submission details:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const subId = Number(id);
  if (isNaN(subId) || subId <= 0) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { status, title, summary, contentMarkdown, coverImageId, tags, authorAlias } = body as Record<string, unknown>;

  // Unified validation for PATCH
  const validation = validateArticleInput({ title, summary, contentMarkdown }, { isPatch: true });
  if (!validation.isValid) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400 });
  }

  const updateData: {
    updatedAt: ReturnType<typeof sql>;
    status?: "draft" | "reviewing" | "approved" | "published" | "rejected";
    title?: string;
    summary?: string;
    content?: string;
    coverImageId?: string | null;
    authorAlias?: string;
    tags?: string;
  } = {
    updatedAt: sql`CURRENT_TIMESTAMP`,
  };

  if (typeof status === "string" && ["draft", "reviewing", "approved", "published", "rejected"].includes(status)) {
    updateData.status = status as "draft" | "reviewing" | "approved" | "published" | "rejected";
  }
  if (typeof title === "string" && title.trim()) updateData.title = title.trim();
  if (typeof summary === "string" && summary.trim()) updateData.summary = summary.trim();
  if (typeof contentMarkdown === "string" && contentMarkdown.trim()) updateData.content = contentMarkdown.trim();
  if (typeof coverImageId === "string") updateData.coverImageId = coverImageId.trim() || null;
  if (typeof authorAlias === "string" && authorAlias.trim()) updateData.authorAlias = authorAlias.trim();
  if (Array.isArray(tags)) updateData.tags = JSON.stringify(tags);

  const db = getDb();
  try {
    const updated = await db
      .update(submissions)
      .set(updateData)
      .where(eq(submissions.id, subId))
      .returning();

    const sub = updated[0];
    return Response.json({
      success: true,
      submission: {
        ...sub,
        contentMarkdown: sub.content,
        content: sub.content, // Deprecated alias
      },
    });
  } catch (error) {
    console.error("Failed to update submission:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}
