import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { submissionRatings, submissions } from "../../../../../db/schema";
import { readJson } from "../../../../../lib/request";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const subId = Number(id);
  if (isNaN(subId) || subId <= 0) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { reviewerToken, scoreDepth, scoreClarity, scorePracticality, generalFeedback } = body as Record<string, unknown>;

  if (!reviewerToken || typeof reviewerToken !== "string" || reviewerToken.length < 8) {
    return new Response(JSON.stringify({ error: "Invalid reviewer token" }), { status: 400 });
  }

  const depth = Number(scoreDepth);
  const clarity = Number(scoreClarity);
  const practicality = Number(scorePracticality);

  if (![depth, clarity, practicality].every((s) => Number.isInteger(s) && s >= 1 && s <= 5)) {
    return new Response(JSON.stringify({ error: "Scores must be integers between 1 and 5" }), { status: 400 });
  }

  const db = getDb();
  try {
    // Check submission exists
    const sub = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.id, subId)).limit(1);
    if (sub.length === 0) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 });
    }

    const feedback = typeof generalFeedback === "string" ? generalFeedback.trim() : null;

    // Upsert rating
    const saved = await db
      .insert(submissionRatings)
      .values({
        submissionId: subId,
        reviewerToken: reviewerToken.trim(),
        scoreDepth: depth,
        scoreClarity: clarity,
        scorePracticality: practicality,
        generalFeedback: feedback,
      })
      .onConflictDoUpdate({
        target: [submissionRatings.submissionId, submissionRatings.reviewerToken],
        set: {
          scoreDepth: depth,
          scoreClarity: clarity,
          scorePracticality: practicality,
          generalFeedback: feedback,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    // Compute updated aggregates
    const summary = await db
      .select({
        count: sql<number>`count(*)`,
        avgDepth: sql<number>`round(avg(${submissionRatings.scoreDepth}), 1)`,
        avgClarity: sql<number>`round(avg(${submissionRatings.scoreClarity}), 1)`,
        avgPracticality: sql<number>`round(avg(${submissionRatings.scorePracticality}), 1)`,
        overallAvg: sql<number>`round((avg(${submissionRatings.scoreDepth}) + avg(${submissionRatings.scoreClarity}) + avg(${submissionRatings.scorePracticality})) / 3.0, 1)`,
      })
      .from(submissionRatings)
      .where(eq(submissionRatings.submissionId, subId));

    return Response.json({
      success: true,
      myRating: saved[0],
      ratingStats: summary[0],
    });
  } catch (error) {
    console.error("Failed to submit rating:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}
