import { readJson } from "../../../../../lib/request";
import { SubmissionService } from "../../../../../lib/submissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  try {
    const sub = await SubmissionService.getSubmission(id);
    if (!sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 });
    }

    return Response.json(sub.annotations, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to list annotations:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}

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
    selectedText,
    textOffsetStart,
    textOffsetEnd,
    comment,
  } = body as Record<string, unknown>;

  if (!reviewerToken || typeof reviewerToken !== "string" || reviewerToken.length < 8) {
    return new Response(JSON.stringify({ error: "Invalid reviewer token" }), { status: 400 });
  }

  if (
    !selectedText ||
    typeof selectedText !== "string" ||
    !comment ||
    typeof comment !== "string"
  ) {
    return new Response(
      JSON.stringify({ error: "selectedText and comment are required" }),
      { status: 400 }
    );
  }

  try {
    const annotation = await SubmissionService.addAnnotation(id, {
      reviewerToken,
      selectedText,
      textOffsetStart: Number(textOffsetStart) || 0,
      textOffsetEnd: Number(textOffsetEnd) || 0,
      comment,
    });

    return Response.json({ success: true, annotation }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to add annotation";
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { annotationId, status } = body as {
    annotationId?: string | number;
    status?: string;
  };
  if (!annotationId || !status || !["open", "resolved"].includes(status)) {
    return new Response(
      JSON.stringify({ error: "annotationId and valid status required" }),
      { status: 400 }
    );
  }

  try {
    const annotation = await SubmissionService.updateAnnotationStatus(
      annotationId,
      status as "open" | "resolved"
    );

    return Response.json({ success: true, annotation });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update annotation";
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}
