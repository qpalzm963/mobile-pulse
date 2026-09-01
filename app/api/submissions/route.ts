import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { submissionAnnotations, submissionRatings, submissions } from "../../../db/schema";
import { readJson } from "../../../lib/request";

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

  const { title, summary, content, authorAlias, tags, status } = body as Record<string, any>;

  if (!title || typeof title !== "string" || !summary || typeof summary !== "string" || !content || typeof content !== "string") {
    return new Response(JSON.stringify({ error: "Missing required fields: title, summary, content" }), { status: 400 });
  }

  const rawSlug = title
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
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        authorAlias: typeof authorAlias === "string" && authorAlias.trim() ? authorAlias.trim() : "匿名組員",
        tags: Array.isArray(tags) ? JSON.stringify(tags) : "[]",
        status: status === "draft" ? "draft" : "reviewing",
      })
      .returning();

    return Response.json({ success: true, submission: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create submission:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}
