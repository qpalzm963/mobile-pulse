import { readJson } from "../../../lib/request";
import { SubmissionService } from "../../../lib/submissions";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const list = await SubmissionService.listSubmissions({
      status: statusParam ? (statusParam.split(",") as any) : undefined,
    });

    return Response.json(list, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to list submissions:", error);
    return new Response(JSON.stringify({ error: "Failed to list submissions" }), {
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const {
    title,
    summary,
    contentMarkdown,
    coverImageId,
    authorAlias,
    tags,
    status,
  } = body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return new Response(JSON.stringify({ error: "文章標題不可為空" }), { status: 400 });
  }

  if (typeof contentMarkdown !== "string" || !contentMarkdown.trim()) {
    return new Response(JSON.stringify({ error: "Markdown 正文內容不可為空" }), { status: 400 });
  }

  try {
    const submitImmediately = status !== "draft";
    const sub = await SubmissionService.createDraft({
      title,
      summary: typeof summary === "string" ? summary : undefined,
      contentMarkdown,
      authorAlias: typeof authorAlias === "string" ? authorAlias : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      coverImageId: typeof coverImageId === "string" ? coverImageId : null,
      submitImmediately,
    });

    return Response.json(
      {
        success: true,
        submission: sub,
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create submission";
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}
