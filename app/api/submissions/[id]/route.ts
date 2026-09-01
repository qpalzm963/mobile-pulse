import { readJson } from "../../../../lib/request";
import {
  InvalidStatusTransitionError,
  SubmissionService,
  type SubmissionStatus,
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

  const {
    action,
    status,
    title,
    summary,
    contentMarkdown,
    coverImageId,
    tags,
    authorAlias,
  } = body as Record<string, unknown>;

  try {
    // 1. If content fields are provided, update draft content
    const hasContentUpdates =
      title !== undefined ||
      summary !== undefined ||
      contentMarkdown !== undefined ||
      coverImageId !== undefined ||
      tags !== undefined ||
      authorAlias !== undefined;

    if (hasContentUpdates) {
      await SubmissionService.updateDraft(id, {
        title: typeof title === "string" ? title : undefined,
        summary: typeof summary === "string" ? summary : undefined,
        contentMarkdown: typeof contentMarkdown === "string" ? contentMarkdown : undefined,
        coverImageId: typeof coverImageId === "string" ? coverImageId : null,
        tags: Array.isArray(tags) ? tags : undefined,
        authorAlias: typeof authorAlias === "string" ? authorAlias : undefined,
      });
    }

    // 2. Handle state transitions (either via explicit action or requested status)
    let transitionTarget: SubmissionStatus | null = null;

    if (action === "submit" || action === "submit_for_review") {
      transitionTarget = "reviewing";
    } else if (action === "request_changes") {
      transitionTarget = "changes_requested";
    } else if (action === "approve") {
      transitionTarget = "approved";
    } else if (action === "reject") {
      transitionTarget = "rejected";
    } else if (action === "publish") {
      transitionTarget = "published";
    } else if (typeof status === "string") {
      transitionTarget = status as SubmissionStatus;
    }

    if (transitionTarget) {
      if (transitionTarget === "reviewing") {
        await SubmissionService.submitForReview(id);
      } else if (transitionTarget === "changes_requested") {
        await SubmissionService.requestChanges(id);
      } else if (transitionTarget === "approved") {
        await SubmissionService.approveSubmission(id);
      } else if (transitionTarget === "rejected") {
        await SubmissionService.rejectSubmission(id);
      } else if (transitionTarget === "published") {
        await SubmissionService.publishSubmission(id);
      } else if (transitionTarget !== "draft") {
        return new Response(
          JSON.stringify({ error: `Unsupported target status: ${transitionTarget}` }),
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
