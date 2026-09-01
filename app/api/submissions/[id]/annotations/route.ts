import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { submissionAnnotations, submissions } from "../../../../../db/schema";
import { readJson } from "../../../../../lib/request";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const subId = Number(id);
  if (isNaN(subId) || subId <= 0) {
    return new Response(JSON.stringify({ error: "Invalid submission id" }), { status: 400 });
  }

  const db = getDb();
  try {
    const list = await db
      .select()
      .from(submissionAnnotations)
      .where(eq(submissionAnnotations.submissionId, subId))
      .orderBy(submissionAnnotations.createdAt);

    return Response.json(list, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to list annotations:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}

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

  const { reviewerToken, selectedText, textOffsetStart, textOffsetEnd, comment } = body as Record<string, any>;

  if (!reviewerToken || typeof reviewerToken !== "string" || reviewerToken.length < 8) {
    return new Response(JSON.stringify({ error: "Invalid reviewer token" }), { status: 400 });
  }

  if (!selectedText || typeof selectedText !== "string" || !comment || typeof comment !== "string") {
    return new Response(JSON.stringify({ error: "selectedText and comment are required" }), { status: 400 });
  }

  const db = getDb();
  try {
    const sub = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.id, subId)).limit(1);
    if (sub.length === 0) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 });
    }

    const inserted = await db
      .insert(submissionAnnotations)
      .values({
        submissionId: subId,
        reviewerToken: reviewerToken.trim(),
        selectedText: selectedText.trim(),
        textOffsetStart: Number(textOffsetStart) || 0,
        textOffsetEnd: Number(textOffsetEnd) || 0,
        comment: comment.trim(),
        status: "open",
      })
      .returning();

    return Response.json({ success: true, annotation: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to add annotation:", error);
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

  const { annotationId, status } = body as { annotationId?: number; status?: string };
  if (!annotationId || !status || !["open", "resolved"].includes(status)) {
    return new Response(JSON.stringify({ error: "annotationId and valid status required" }), { status: 400 });
  }

  const db = getDb();
  try {
    const updated = await db
      .update(submissionAnnotations)
      .set({ status: status as "open" | "resolved" })
      .where(
        and(
          eq(submissionAnnotations.id, annotationId),
          eq(submissionAnnotations.submissionId, subId)
        )
      )
      .returning();

    return Response.json({ success: true, annotation: updated[0] });
  } catch (error) {
    console.error("Failed to update annotation:", error);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
}
