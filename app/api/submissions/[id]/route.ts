import { readJson } from "../../../../lib/request";
import {
  InvalidStatusTransitionError,
  SubmissionService,
} from "../../../../lib/submissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const url = new URL(request.url);
  const reviewerToken =
    request.headers.get("x-reviewer-token") || url.searchParams.get("reviewerToken");

  try {
    const sub = await SubmissionService.getSubmission(id, reviewerToken);
    if (!sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 });
    }

    return Response.json(sub, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to get submission details:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
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

  const bodyObj = body as Record<string, unknown>;

  // Reject direct status mutation
  if ("status" in bodyObj) {
    return new Response(
      JSON.stringify({
        error:
          "Direct status mutation is forbidden. Use workflow actions ('submit', 'request_changes', 'approve', 'reject') or the publish endpoint.",
      }),
      { status: 400 }
    );
  }

  const {
    action,
    title,
    summary,
    contentMarkdown,
    tags,
    authorAlias,
  } = bodyObj;

  try {
    // 1. If content fields are provided, update draft content
    const hasCoverImage = "coverImageId" in bodyObj;
    const coverImageIdVal = hasCoverImage
      ? typeof bodyObj.coverImageId === "string" && bodyObj.coverImageId.trim().length > 0
        ? bodyObj.coverImageId.trim()
        : null
      : undefined;

    const hasContentUpdates =
      title !== undefined ||
      summary !== undefined ||
      contentMarkdown !== undefined ||
      hasCoverImage ||
      tags !== undefined ||
      authorAlias !== undefined;

    if (hasContentUpdates) {
      await SubmissionService.updateDraft(id, {
        title: typeof title === "string" ? title : undefined,
        summary: typeof summary === "string" ? summary : undefined,
        contentMarkdown: typeof contentMarkdown === "string" ? contentMarkdown : undefined,
        coverImageId: coverImageIdVal,
        tags: Array.isArray(tags) ? tags : undefined,
        authorAlias: typeof authorAlias === "string" ? authorAlias : undefined,
      });
    }

    // 2. Handle state transition actions
    if (typeof action === "string" && action.trim().length > 0) {
      const act = action.trim();
      if (act === "submit" || act === "submit_for_review") {
        await SubmissionService.submitForReview(id);
      } else if (act === "request_changes") {
        await SubmissionService.requestChanges(id);
      } else if (act === "approve") {
        await SubmissionService.approveSubmission(id);
      } else if (act === "reject") {
        await SubmissionService.rejectSubmission(id);
      } else {
        return new Response(
          JSON.stringify({ error: `Unsupported workflow action: ${act}` }),
          { status: 400 }
        );
      }
    }

    const updated = await SubmissionService.getSubmission(id);
    return Response.json({
      success: true,
      submission: updated,
    });
  } catch (error) {
    if (error instanceof InvalidStatusTransitionError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Failed to update submission";
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}
