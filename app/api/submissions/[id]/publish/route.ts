import { readJson } from "../../../../../lib/request";
import { SubmissionService } from "../../../../../lib/submissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const body = (await readJson(request)) || {};
  const { readTime, eyebrow } = (typeof body === "object" ? body : {}) as Record<
    string,
    string
  >;

  try {
    const result = await SubmissionService.publishSubmission(id, {
      readTime,
      eyebrow,
    });

    return Response.json({
      success: true,
      submission: result.submission,
      article: result.article,
      alreadyPublished: result.alreadyPublished,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to publish submission";
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}
