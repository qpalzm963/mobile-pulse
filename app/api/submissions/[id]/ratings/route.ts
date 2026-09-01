import { readJson } from "../../../../../lib/request";
import { SubmissionService } from "../../../../../lib/submissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const {
    reviewerToken,
    priorKnowledge,
    scoreDepth,
    scoreClarity,
    scorePracticality,
    generalFeedback,
  } = body as Record<string, unknown>;

  if (!reviewerToken || typeof reviewerToken !== "string" || reviewerToken.length < 8) {
    return new Response(JSON.stringify({ error: "Invalid reviewer token" }), { status: 400 });
  }

  const depth = Number(scoreDepth);
  const clarity = Number(scoreClarity);
  const practicality = Number(scorePracticality);

  if (![depth, clarity, practicality].every((s) => Number.isInteger(s) && s >= 1 && s <= 5)) {
    return new Response(
      JSON.stringify({ error: "Scores must be integers between 1 and 5" }),
      { status: 400 }
    );
  }

  try {
    const result = await SubmissionService.addOrUpdateReview(id, {
      reviewerToken,
      priorKnowledge: (priorKnowledge as any) || "new_knowledge",
      scoreDepth: depth,
      scoreClarity: clarity,
      scorePracticality: practicality,
      generalFeedback: typeof generalFeedback === "string" ? generalFeedback : null,
    });

    return Response.json({
      success: true,
      myRating: result.review,
      ratingStats: result.ratingStats,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save rating";
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}
