import { getPayload } from "payload";
import config from "@payload-config";
import {
  ARTICLE_CONTENT_LIMITS,
  extractSummaryFromMarkdown,
  validateArticleInput,
} from "./content-markdown";

export type SubmissionStatus =
  | "draft"
  | "reviewing"
  | "changes_requested"
  | "approved"
  | "published"
  | "rejected";

export interface SubmissionCoverImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface SubmissionTagItem {
  id: string;
  name: string;
}

export interface SubmissionRatingStats {
  count: number;
  avgDepth: number;
  avgClarity: number;
  avgPracticality: number;
  overallAvg: number;
}

export interface SubmissionAnnotationItem {
  id: string | number;
  submissionId: string | number;
  selectedText: string;
  textOffsetStart: number;
  textOffsetEnd: number;
  comment: string;
  status: "open" | "resolved";
  createdAt: string;
}

export interface SubmissionReviewItem {
  id: string | number;
  submissionId: string | number;
  priorKnowledge: "new_knowledge" | "familiar_surface" | "already_expert";
  scoreDepth: number;
  scoreClarity: number;
  scorePracticality: number;
  generalFeedback?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmissionSummary {
  id: string | number;
  legacyId?: number | null;
  slug: string;
  title: string;
  summary: string;
  authorAlias: string;
  status: SubmissionStatus;
  tags: string[];
  tagItems: SubmissionTagItem[];
  coverImage?: SubmissionCoverImage | null;
  coverImageId?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  publishedArticleId?: string | null;
  createdAt: string;
  updatedAt: string;
  ratingStats: SubmissionRatingStats;
  annotationStats: {
    total: number;
    open: number;
  };
}

export interface SubmissionDetail extends SubmissionSummary {
  contentMarkdown: string;
  content: string; // Deprecated alias for backward compatibility
  myRating: SubmissionReviewItem | null;
  annotations: SubmissionAnnotationItem[];
}

export class InvalidStatusTransitionError extends Error {
  constructor(public currentStatus: SubmissionStatus, public targetStatus: SubmissionStatus) {
    super(`Invalid status transition from "${currentStatus}" to "${targetStatus}".`);
    this.name = "InvalidStatusTransitionError";
  }
}

/**
 * 嚴格狀態機流轉規則：
 * draft -> reviewing
 * changes_requested -> reviewing
 * reviewing -> changes_requested
 * reviewing -> approved
 * reviewing -> rejected
 * approved -> published
 */
export function isValidStatusTransition(
  from: SubmissionStatus,
  to: SubmissionStatus
): boolean {
  if (from === to) return true;
  switch (from) {
    case "draft":
      return to === "reviewing";
    case "changes_requested":
      return to === "reviewing";
    case "reviewing":
      return to === "changes_requested" || to === "approved" || to === "rejected";
    case "approved":
      return to === "published";
    case "published":
      return false; // Published is a terminal state
    case "rejected":
      return false; // Rejected is a terminal state
    default:
      return false;
  }
}

async function resolveTagRelationships(
  payload: Awaited<ReturnType<typeof getPayload>>,
  tagsInput?: string[]
): Promise<(string | number)[]> {
  if (!Array.isArray(tagsInput) || tagsInput.length === 0) return [];
  const tagIds: (string | number)[] = [];

  for (const t of tagsInput) {
    if (!t || t === "all") continue;
    const clean = String(t).trim();
    const found = await payload.find({
      collection: "tags",
      where: {
        or: [{ tagId: { equals: clean } }, { name: { equals: clean } }],
      },
      limit: 1,
    });
    if (found.docs.length > 0) {
      tagIds.push(found.docs[0].id);
    } else {
      const created = await payload.create({
        collection: "tags",
        data: {
          tagId: clean.toLowerCase().replace(/[^\w-]/g, ""),
          name: clean,
        },
      });
      tagIds.push(created.id);
    }
  }
  return tagIds;
}

function parseSubmissionDoc(doc: Record<string, unknown>): {
  id: string | number;
  legacyId: number | null;
  slug: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  authorAlias: string;
  status: SubmissionStatus;
  tags: string[];
  tagItems: SubmissionTagItem[];
  coverImage: SubmissionCoverImage | null;
  coverImageId: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  publishedArticleId: string | null;
  createdAt: string;
  updatedAt: string;
} {
  const tagItems: SubmissionTagItem[] = [];
  const tags: string[] = [];

  if (Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (typeof t === "object" && t !== null) {
        const tagObj = t as Record<string, unknown>;
        const tagId = (tagObj.tagId as string) || String(tagObj.id);
        const name = (tagObj.name as string) || tagId;
        tags.push(tagId);
        tagItems.push({ id: tagId, name });
      } else if (typeof t === "string" || typeof t === "number") {
        tags.push(String(t));
        tagItems.push({ id: String(t), name: String(t) });
      }
    }
  }

  let coverImage: SubmissionCoverImage | null = null;
  let coverImageId: string | null = null;

  if (doc.coverImage && typeof doc.coverImage === "object") {
    const mediaObj = doc.coverImage as Record<string, unknown>;
    const mediaId = String(mediaObj.id);
    coverImageId = mediaId;
    coverImage = {
      id: mediaId,
      url: `/api/media/${mediaId}`,
      alt: (mediaObj.alt as string) || undefined,
      caption: (mediaObj.caption as string) || undefined,
      width: (mediaObj.width as number) || undefined,
      height: (mediaObj.height as number) || undefined,
    };
  } else if (typeof doc.coverImage === "string" || typeof doc.coverImage === "number") {
    const mediaId = String(doc.coverImage);
    coverImageId = mediaId;
    coverImage = {
      id: mediaId,
      url: `/api/media/${mediaId}`,
    };
  }

  let publishedArticleId: string | null = null;
  if (doc.publishedArticle) {
    if (typeof doc.publishedArticle === "object" && doc.publishedArticle !== null) {
      publishedArticleId = String((doc.publishedArticle as Record<string, unknown>).id);
    } else {
      publishedArticleId = String(doc.publishedArticle);
    }
  }

  return {
    id: (doc.id as string | number) ?? "",
    legacyId: doc.legacyId !== undefined && doc.legacyId !== null ? Number(doc.legacyId) : null,
    slug: (doc.slug as string) ?? "",
    title: (doc.title as string) ?? "",
    summary: (doc.summary as string) ?? "",
    contentMarkdown: (doc.contentMarkdown as string) ?? "",
    authorAlias: (doc.authorAlias as string) || "匿名組員",
    status: (doc.status as SubmissionStatus) || "draft",
    tags,
    tagItems,
    coverImage,
    coverImageId,
    submittedAt: doc.submittedAt ? String(doc.submittedAt) : null,
    approvedAt: doc.approvedAt ? String(doc.approvedAt) : null,
    publishedAt: doc.publishedAt ? String(doc.publishedAt) : null,
    publishedArticleId,
    createdAt: (doc.createdAt as string) || new Date().toISOString(),
    updatedAt: (doc.updatedAt as string) || new Date().toISOString(),
  };
}

/**
 * Routing rules for Submission lookups (Blocker 2 fix):
 *   - Pure numeric input is always treated as legacyId (old Drizzle URL: /reviews/1)
 *     New Payload submissions never have numeric-only slugs, so there is NO collision possible.
 *   - Non-numeric input (slug string) uses slug lookup only
 *     New Submissions always use slug as their canonical URL identifier.
 *
 * This eliminates the ID namespace collision: numeric ID space == legacyId space.
 * New submissions must be accessed by slug, not by Payload's internal numeric ID.
 */
async function findSubmissionDoc(
  payload: Awaited<ReturnType<typeof getPayload>>,
  idOrSlug: string | number
): Promise<Record<string, unknown> | null> {
  const queryStr = String(idOrSlug).trim();
  const numId = Number(queryStr);
  // Treat every integer-only identifier as a legacy Drizzle ID.  This keeps
  // numeric Payload IDs out of the public route namespace while still
  // accepting old links such as `/reviews/001`.
  const isNumeric = /^\d+$/.test(queryStr);

  if (isNumeric) {
    // Numeric input exclusively uses legacyId lookup (old Drizzle submission URLs)
    // We deliberately do NOT fall back to Payload internal ID to prevent namespace collision
    if (numId <= 0) return null;
    const byLegacy = await payload.find({
      collection: "submissions",
      where: { legacyId: { equals: numId } },
      depth: 2,
      limit: 1,
    });
    if (byLegacy.docs.length > 0) {
      return byLegacy.docs[0] as unknown as Record<string, unknown>;
    }
    // Numeric input with no matching legacyId is not found
    return null;
  }

  // Non-numeric input uses slug lookup (canonical URL for new submissions)
  const bySlug = await payload.find({
    collection: "submissions",
    where: { slug: { equals: queryStr } },
    depth: 2,
    limit: 1,
  });
  if (bySlug.docs.length > 0) {
    return bySlug.docs[0] as unknown as Record<string, unknown>;
  }

  return null;
}

/**
 * Internal-only lookup by Payload ID (used within SubmissionService after creation)
 * This bypasses the public routing rules and looks up directly by Payload's internal ID.
 */
async function findSubmissionDocById(
  payload: Awaited<ReturnType<typeof getPayload>>,
  payloadId: string | number
): Promise<Record<string, unknown> | null> {
  try {
    const doc = await payload.findByID({
      collection: "submissions",
      id: payloadId as any,
      depth: 2,
    });
    if (doc) return doc as unknown as Record<string, unknown>;
  } catch {
    // not found
  }
  return null;
}


export class SubmissionService {
  /**
   * 建立草稿 (Draft) 或直接送審 (Reviewing)
   */
  static async createDraft(input: {
    title: string;
    summary?: string;
    contentMarkdown: string;
    authorAlias?: string;
    tags?: string[];
    coverImageId?: string | null;
    submitImmediately?: boolean;
    legacyId?: number;
    createdAt?: string;
    updatedAt?: string;
    submittedAt?: string | null;
  }): Promise<SubmissionDetail> {
    const validation = validateArticleInput({
      title: input.title,
      summary: input.summary,
      contentMarkdown: input.contentMarkdown,
    });
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid article content input");
    }

    const payload = await getPayload({ config });
    const cleanTitle = input.title.trim();
    const rawContent = input.contentMarkdown.trim();

    let finalSummary = typeof input.summary === "string" ? input.summary.trim() : "";
    if (!finalSummary) {
      finalSummary = extractSummaryFromMarkdown(
        rawContent,
        ARTICLE_CONTENT_LIMITS.MAX_SUMMARY_LENGTH
      );
    }
    if (!finalSummary) {
      finalSummary = cleanTitle;
    }

    // Verify coverImage if provided
    let coverImageRel: string | number | null = null;
    if (input.coverImageId && String(input.coverImageId).trim()) {
      const mediaId = String(input.coverImageId).trim();
      let mediaDoc = null;
      try {
        mediaDoc = await payload.findByID({
          collection: "media",
          id: Number(mediaId) || mediaId,
        });
      } catch {
        mediaDoc = null;
      }
      if (!mediaDoc) {
        throw new Error(`Referenced coverImageId "${input.coverImageId}" does not exist in Media collection`);
      }
      coverImageRel = mediaDoc.id;
    }

    const tagIds = await resolveTagRelationships(payload, input.tags);

    const rawSlug = cleanTitle
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const baseSlug = rawSlug || `submission-${Date.now()}`;
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const initialStatus: SubmissionStatus = input.submitImmediately ? "reviewing" : "draft";
    const nowIso = new Date().toISOString();

    const created = await payload.create({
      collection: "submissions",
      data: {
        title: cleanTitle,
        slug,
        summary: finalSummary,
        contentMarkdown: rawContent,
        authorAlias: input.authorAlias?.trim() || "匿名組員",
        status: initialStatus,
        tags: tagIds as any,
        coverImage: coverImageRel as any,
        submittedAt: input.submittedAt !== undefined ? input.submittedAt : (initialStatus === "reviewing" ? nowIso : null),
        legacyId: input.legacyId,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
      },
    });

    return (await this.getSubmissionById(created.id))!;
  }

  /**
   * 更新稿件內容（嚴格限制僅允許在 Draft 或 Changes Requested 狀態下修改）
   */
  static async updateDraft(
    idOrSlug: string | number,
    input: {
      title?: string;
      summary?: string;
      contentMarkdown?: string;
      authorAlias?: string;
      tags?: string[];
      coverImageId?: string | null;
    }
  ): Promise<SubmissionDetail> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) {
      throw new Error(`Submission not found: ${idOrSlug}`);
    }

    const currentStatus = (existing.status as SubmissionStatus) || "draft";
    if (currentStatus !== "draft" && currentStatus !== "changes_requested") {
      throw new Error(
        `Cannot edit submission in '${currentStatus}' status. Content can only be edited in 'draft' or 'changes_requested' status.`
      );
    }

    const validation = validateArticleInput(
      {
        title: input.title,
        summary: input.summary,
        contentMarkdown: input.contentMarkdown,
      },
      { isPatch: true }
    );
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid article content input");
    }

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.summary !== undefined) updateData.summary = input.summary.trim();
    if (input.contentMarkdown !== undefined) updateData.contentMarkdown = input.contentMarkdown.trim();
    if (input.authorAlias !== undefined) updateData.authorAlias = input.authorAlias.trim() || "匿名組員";

    if (input.tags !== undefined) {
      const tagIds = await resolveTagRelationships(payload, input.tags);
      updateData.tags = tagIds;
    }

    // Only modify coverImage if explicitly specified (string to update, null to remove)
    if (input.coverImageId !== undefined) {
      if (input.coverImageId === null || input.coverImageId === "") {
        updateData.coverImage = null;
      } else {
        const mediaId = String(input.coverImageId).trim();
        let mediaDoc = null;
        try {
          mediaDoc = await payload.findByID({
            collection: "media",
            id: Number(mediaId) || mediaId,
          });
        } catch {
          mediaDoc = null;
        }
        if (!mediaDoc) {
          throw new Error(`Referenced coverImageId "${input.coverImageId}" does not exist in Media collection`);
        }
        updateData.coverImage = mediaDoc.id;
      }
    }

    await payload.update({
      collection: "submissions",
      id: existing.id as string | number,
      data: updateData,
    });

    return (await this.getSubmissionById(existing.id as string | number))!;
  }

  /**
   * 取得稿件完整詳情（包含評分匯總與標註）
   */
  static async getSubmission(
    idOrSlug: string | number,
    reviewerToken?: string | null
  ): Promise<SubmissionDetail | null> {
    const payload = await getPayload({ config });
    const doc = await findSubmissionDoc(payload, idOrSlug);
    if (!doc) return null;

    const parsed = parseSubmissionDoc(doc);
    const submissionId = parsed.id;

    // Fetch reviews for rating aggregates
    const reviewsResult = await payload.find({
      collection: "submission-reviews",
      where: {
        submission: { equals: submissionId },
      },
      limit: 0,
    });

    const count = reviewsResult.docs.length;
    let sumDepth = 0;
    let sumClarity = 0;
    let sumPracticality = 0;
    let myRating: SubmissionReviewItem | null = null;

    for (const rDoc of reviewsResult.docs) {
      const r = rDoc as unknown as Record<string, unknown>;
      const d = Number(r.scoreDepth) || 0;
      const c = Number(r.scoreClarity) || 0;
      const p = Number(r.scorePracticality) || 0;
      sumDepth += d;
      sumClarity += c;
      sumPracticality += p;

      if (reviewerToken && r.reviewerToken === reviewerToken) {
        myRating = {
          id: r.id as string | number,
          submissionId,
          priorKnowledge: (r.priorKnowledge as SubmissionReviewItem["priorKnowledge"]) || "new_knowledge",
          scoreDepth: d,
          scoreClarity: c,
          scorePracticality: p,
          generalFeedback: (r.generalFeedback as string) || null,
          createdAt: String(r.createdAt),
          updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
        };
      }
    }

    const ratingStats: SubmissionRatingStats = {
      count,
      avgDepth: count > 0 ? Math.round((sumDepth / count) * 10) / 10 : 0,
      avgClarity: count > 0 ? Math.round((sumClarity / count) * 10) / 10 : 0,
      avgPracticality: count > 0 ? Math.round((sumPracticality / count) * 10) / 10 : 0,
      overallAvg:
        count > 0
          ? Math.round(((sumDepth + sumClarity + sumPracticality) / (count * 3)) * 10) / 10
          : 0,
    };

    // Fetch annotations
    const annotationsResult = await payload.find({
      collection: "submission-annotations",
      where: {
        submission: { equals: submissionId },
      },
      limit: 0,
      sort: "createdAt",
    });

    let openAnnotationsCount = 0;
    const annotations: SubmissionAnnotationItem[] = annotationsResult.docs.map((aDoc) => {
      const a = aDoc as unknown as Record<string, unknown>;
      const status = (a.status as "open" | "resolved") || "open";
      if (status === "open") openAnnotationsCount++;
      return {
        id: a.id as string | number,
        submissionId,
        selectedText: (a.selectedText as string) || "",
        textOffsetStart: Number(a.textOffsetStart) || 0,
        textOffsetEnd: Number(a.textOffsetEnd) || 0,
        comment: (a.comment as string) || "",
        status,
        createdAt: (a.createdAt as string) || new Date().toISOString(),
      };
    });

    return {
      ...parsed,
      content: parsed.contentMarkdown, // Deprecated alias
      ratingStats,
      annotationStats: {
        total: annotations.length,
        open: openAnnotationsCount,
      },
      myRating,
      annotations,
    };
  }

  /**
   * Internal method: get submission by Payload's native ID (bypasses public routing rules)
   * Used after create/update operations where we have the native ID.
   */
  static async getSubmissionById(
    payloadId: string | number,
    reviewerToken?: string | null
  ): Promise<SubmissionDetail | null> {
    const payload = await getPayload({ config });
    const doc = await findSubmissionDocById(payload, payloadId);
    if (!doc) return null;

    const parsed = parseSubmissionDoc(doc);
    const submissionId = parsed.id;

    const reviewsResult = await payload.find({
      collection: "submission-reviews",
      where: { submission: { equals: submissionId } },
      limit: 0,
    });

    const count = reviewsResult.docs.length;
    let sumDepth = 0, sumClarity = 0, sumPracticality = 0;
    let myRating: SubmissionReviewItem | null = null;

    for (const rDoc of reviewsResult.docs) {
      const r = rDoc as unknown as Record<string, unknown>;
      const d = Number(r.scoreDepth) || 0;
      const c = Number(r.scoreClarity) || 0;
      const p = Number(r.scorePracticality) || 0;
      sumDepth += d; sumClarity += c; sumPracticality += p;

      if (reviewerToken && r.reviewerToken === reviewerToken) {
        myRating = {
          id: r.id as string | number,
          submissionId,
          priorKnowledge: (r.priorKnowledge as SubmissionReviewItem["priorKnowledge"]) || "new_knowledge",
          scoreDepth: d, scoreClarity: c, scorePracticality: p,
          generalFeedback: (r.generalFeedback as string) || null,
          createdAt: String(r.createdAt),
          updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
        };
      }
    }

    const ratingStats: SubmissionRatingStats = {
      count,
      avgDepth: count > 0 ? Math.round((sumDepth / count) * 10) / 10 : 0,
      avgClarity: count > 0 ? Math.round((sumClarity / count) * 10) / 10 : 0,
      avgPracticality: count > 0 ? Math.round((sumPracticality / count) * 10) / 10 : 0,
      overallAvg: count > 0 ? Math.round(((sumDepth + sumClarity + sumPracticality) / (count * 3)) * 10) / 10 : 0,
    };

    const annotationsResult = await payload.find({
      collection: "submission-annotations",
      where: { submission: { equals: submissionId } },
      limit: 0, sort: "createdAt",
    });

    let openAnnotationsCount = 0;
    const annotations: SubmissionAnnotationItem[] = annotationsResult.docs.map((aDoc) => {
      const a = aDoc as unknown as Record<string, unknown>;
      const status = (a.status as "open" | "resolved") || "open";
      if (status === "open") openAnnotationsCount++;
      return {
        id: a.id as string | number, submissionId,
        selectedText: (a.selectedText as string) || "",
        textOffsetStart: Number(a.textOffsetStart) || 0,
        textOffsetEnd: Number(a.textOffsetEnd) || 0,
        comment: (a.comment as string) || "",
        status,
        createdAt: (a.createdAt as string) || new Date().toISOString(),
      };
    });

    return {
      ...parsed,
      content: parsed.contentMarkdown,
      ratingStats,
      annotationStats: { total: annotations.length, open: openAnnotationsCount },
      myRating,
      annotations,
    };
  }

  /**
   * 取得稿件清單（包含各篇的評分匯總與標註計數）
   */
  static async listSubmissions(options?: {
    status?: SubmissionStatus | SubmissionStatus[];
    limit?: number;
    page?: number;
  }): Promise<SubmissionSummary[]> {
    const payload = await getPayload({ config });
    const whereClause: Record<string, unknown> = {};

    if (options?.status) {
      if (Array.isArray(options.status)) {
        whereClause.status = { in: options.status };
      } else {
        whereClause.status = { equals: options.status };
      }
    }

    const submissionsResult = await payload.find({
      collection: "submissions",
      where: whereClause as any,
      depth: 2,
      limit: options?.limit ?? 0,
      page: options?.page,
      sort: "-createdAt",
    });

    if (submissionsResult.docs.length === 0) {
      return [];
    }

    const [allReviews, allAnnotations] = await Promise.all([
      payload.find({ collection: "submission-reviews", limit: 0 }),
      payload.find({ collection: "submission-annotations", limit: 0 }),
    ]);

    const ratingMap = new Map<
      string,
      { count: number; sumDepth: number; sumClarity: number; sumPracticality: number }
    >();

    for (const rDoc of allReviews.docs) {
      const r = rDoc as unknown as Record<string, unknown>;
      const subRef = typeof r.submission === "object" && r.submission !== null
        ? String((r.submission as Record<string, unknown>).id)
        : String(r.submission);

      const existing = ratingMap.get(subRef) || { count: 0, sumDepth: 0, sumClarity: 0, sumPracticality: 0 };
      existing.count++;
      existing.sumDepth += Number(r.scoreDepth) || 0;
      existing.sumClarity += Number(r.scoreClarity) || 0;
      existing.sumPracticality += Number(r.scorePracticality) || 0;
      ratingMap.set(subRef, existing);
    }

    const annotationMap = new Map<string, { total: number; open: number }>();
    for (const aDoc of allAnnotations.docs) {
      const a = aDoc as unknown as Record<string, unknown>;
      const subRef = typeof a.submission === "object" && a.submission !== null
        ? String((a.submission as Record<string, unknown>).id)
        : String(a.submission);

      const existing = annotationMap.get(subRef) || { total: 0, open: 0 };
      existing.total++;
      if (a.status === "open") existing.open++;
      annotationMap.set(subRef, existing);
    }

    return submissionsResult.docs.map((doc) => {
      const parsed = parseSubmissionDoc(doc as unknown as Record<string, unknown>);
      const idKey = String(parsed.id);

      const rStats = ratingMap.get(idKey);
      const ratingStats: SubmissionRatingStats = {
        count: rStats?.count ?? 0,
        avgDepth: rStats && rStats.count > 0 ? Math.round((rStats.sumDepth / rStats.count) * 10) / 10 : 0,
        avgClarity: rStats && rStats.count > 0 ? Math.round((rStats.sumClarity / rStats.count) * 10) / 10 : 0,
        avgPracticality: rStats && rStats.count > 0 ? Math.round((rStats.sumPracticality / rStats.count) * 10) / 10 : 0,
        overallAvg:
          rStats && rStats.count > 0
            ? Math.round(((rStats.sumDepth + rStats.sumClarity + rStats.sumPracticality) / (rStats.count * 3)) * 10) / 10
            : 0,
      };

      const aStats = annotationMap.get(idKey);
      const annotationStats = {
        total: aStats?.total ?? 0,
        open: aStats?.open ?? 0,
      };

      return {
        ...parsed,
        ratingStats,
        annotationStats,
      };
    });
  }

  /**
   * 狀態流轉：送出審評 (draft / changes_requested -> reviewing)
   */
  static async submitForReview(idOrSlug: string | number): Promise<SubmissionDetail> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) throw new Error(`Submission not found: ${idOrSlug}`);

    const currentStatus = (existing.status as SubmissionStatus) || "draft";
    if (!isValidStatusTransition(currentStatus, "reviewing")) {
      throw new InvalidStatusTransitionError(currentStatus, "reviewing");
    }

    await payload.update({
      collection: "submissions",
      id: existing.id as string | number,
      data: {
        status: "reviewing",
        submittedAt: new Date().toISOString(),
      },
    });

    return (await this.getSubmissionById(existing.id as string | number))!;
  }

  /**
   * 狀態流轉：請求修改 (reviewing -> changes_requested)
   */
  static async requestChanges(idOrSlug: string | number): Promise<SubmissionDetail> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) throw new Error(`Submission not found: ${idOrSlug}`);

    const currentStatus = (existing.status as SubmissionStatus) || "draft";
    if (!isValidStatusTransition(currentStatus, "changes_requested")) {
      throw new InvalidStatusTransitionError(currentStatus, "changes_requested");
    }

    await payload.update({
      collection: "submissions",
      id: existing.id as string | number,
      data: {
        status: "changes_requested",
      },
    });

    return (await this.getSubmissionById(existing.id as string | number))!;
  }

  /**
   * 狀態流轉：審評通過 (reviewing -> approved)
   */
  static async approveSubmission(idOrSlug: string | number): Promise<SubmissionDetail> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) throw new Error(`Submission not found: ${idOrSlug}`);

    const currentStatus = (existing.status as SubmissionStatus) || "draft";
    if (!isValidStatusTransition(currentStatus, "approved")) {
      throw new InvalidStatusTransitionError(currentStatus, "approved");
    }

    await payload.update({
      collection: "submissions",
      id: existing.id as string | number,
      data: {
        status: "approved",
        approvedAt: new Date().toISOString(),
      },
    });

    return (await this.getSubmissionById(existing.id as string | number))!;
  }

  /**
   * 狀態流轉：退稿 (reviewing -> rejected)
   */
  static async rejectSubmission(idOrSlug: string | number): Promise<SubmissionDetail> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) throw new Error(`Submission not found: ${idOrSlug}`);

    const currentStatus = (existing.status as SubmissionStatus) || "draft";
    if (!isValidStatusTransition(currentStatus, "rejected")) {
      throw new InvalidStatusTransitionError(currentStatus, "rejected");
    }

    await payload.update({
      collection: "submissions",
      id: existing.id as string | number,
      data: {
        status: "rejected",
      },
    });

    return (await this.getSubmissionById(existing.id as string | number))!;
  }

  /**
   * 唯一正式發布流程：Submission -> Payload Article (approved -> published)
   * 具備原子性保護與完全 Idempotent（冪等性），重複呼叫不會產生重複文章。
   */
  static async publishSubmission(
    idOrSlug: string | number,
    options?: { readTime?: string; eyebrow?: string }
  ): Promise<{
    submission: SubmissionDetail;
    article: Record<string, unknown>;
    alreadyPublished: boolean;
  }> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) throw new Error(`Submission not found: ${idOrSlug}`);

    const currentStatus = (existing.status as SubmissionStatus) || "draft";

    // Check Idempotency: if already published with an article relationship
    if (currentStatus === "published") {
      let linkedArticle: Record<string, unknown> | null = null;
      if (existing.publishedArticle) {
        const articleId = typeof existing.publishedArticle === "object" && existing.publishedArticle !== null
          ? (existing.publishedArticle as Record<string, unknown>).id
          : existing.publishedArticle;
        linkedArticle = (await payload.findByID({
          collection: "articles",
          id: articleId as any,
          depth: 2,
        })) as unknown as Record<string, unknown>;
      } else {
        const bySlug = await payload.find({
          collection: "articles",
          where: { slug: { equals: existing.slug } },
          limit: 1,
        });
        if (bySlug.docs.length > 0) {
          linkedArticle = bySlug.docs[0] as unknown as Record<string, unknown>;
        }
      }

      if (linkedArticle) {
        const detail = (await this.getSubmissionById(existing.id as string | number))!;
        return { submission: detail, article: linkedArticle, alreadyPublished: true };
      }
    }

    // Must be in 'approved' status to publish
    if (currentStatus !== "approved") {
      throw new Error(`Cannot publish submission with status "${currentStatus}". Only approved submissions can be published.`);
    }

    const nowIso = new Date().toISOString();
    const cleanSlug = String(existing.slug).trim();

    // Map tag IDs
    let articleTagIds: (string | number)[] = [];
    if (Array.isArray(existing.tags)) {
      articleTagIds = existing.tags
        .map((t) => (typeof t === "object" && t !== null ? (t as Record<string, unknown>).id : t))
        .filter(Boolean) as (string | number)[];
    }

    // Map coverImage ID from resolved relationship
    const resolvedCoverImageId: string | number | null = existing.coverImage
      ? typeof existing.coverImage === "object" && existing.coverImage !== null
        ? ((existing.coverImage as Record<string, unknown>).id as string | number)
        : (existing.coverImage as string | number)
      : null;
    const existingArticleResult = await payload.find({
      collection: "articles",
      where: { slug: { equals: cleanSlug } },
      depth: 0,
      limit: 1,
    });

    let publishedArticleDoc: Record<string, unknown>;
    let isNewArticle = false;
    // Snapshot of old article state for rollback compensation if Submission update fails
    let oldArticleSnapshot: Record<string, unknown> | null = null;

    if (existingArticleResult.docs.length > 0) {
      const targetDoc = existingArticleResult.docs[0] as unknown as Record<string, unknown>;
      const targetId = targetDoc.id;
      oldArticleSnapshot = { ...targetDoc }; // Save for rollback

      publishedArticleDoc = (await (payload as any).update({
        collection: "articles",
        id: targetId as any,
        data: {
          title: existing.title,
          slug: cleanSlug,
          summary: existing.summary,
          contentMarkdown: existing.contentMarkdown,
          author: (existing.authorAlias as string) || "MOBILE PULSE 編輯部",
          readTime: options?.readTime || "5 MIN READ",
          eyebrow: options?.eyebrow || null,
          publishedAt: nowIso,
          status: "published",
          tags: articleTagIds as any,
          coverImage: resolvedCoverImageId as any,
        },
      })) as unknown as Record<string, unknown>;
    } else {
      isNewArticle = true;
      publishedArticleDoc = (await (payload as any).create({
        collection: "articles",
        data: {
          title: existing.title,
          slug: cleanSlug,
          summary: existing.summary,
          contentMarkdown: existing.contentMarkdown,
          author: (existing.authorAlias as string) || "MOBILE PULSE 編輯部",
          readTime: options?.readTime || "5 MIN READ",
          eyebrow: options?.eyebrow || null,
          publishedAt: nowIso,
          status: "published",
          tags: articleTagIds as any,
          coverImage: resolvedCoverImageId as any,
        },
      })) as unknown as Record<string, unknown>;
    }

    // Update Submission status with full rollback compensation (Blocker 3 fix)
    try {
      await (payload as any).update({
        collection: "submissions",
        id: existing.id as string | number,
        data: {
          status: "published",
          publishedAt: nowIso,
          publishedArticle: publishedArticleDoc.id as any,
        },
      });
    } catch (updateErr) {
      // Rollback article changes to preserve data consistency
      if (isNewArticle && publishedArticleDoc?.id) {
        // New article: delete it to undo
        try {
          await (payload as any).delete({ collection: "articles", id: publishedArticleDoc.id as any });
        } catch {
          console.error("[publishSubmission] rollback: failed to delete newly created article", publishedArticleDoc.id);
        }
      } else if (!isNewArticle && oldArticleSnapshot && publishedArticleDoc?.id) {
        // Existing article was updated: restore original state
        try {
          await (payload as any).update({
            collection: "articles",
            id: publishedArticleDoc.id as any,
            data: {
              title: oldArticleSnapshot.title,
              slug: oldArticleSnapshot.slug,
              summary: oldArticleSnapshot.summary,
              contentMarkdown: oldArticleSnapshot.contentMarkdown,
              author: oldArticleSnapshot.author,
              readTime: oldArticleSnapshot.readTime,
              eyebrow: oldArticleSnapshot.eyebrow,
              publishedAt: oldArticleSnapshot.publishedAt,
              status: oldArticleSnapshot.status,
              tags: oldArticleSnapshot.tags,
              coverImage: oldArticleSnapshot.coverImage,
              ...(Object.prototype.hasOwnProperty.call(oldArticleSnapshot, "createdAt")
                ? { createdAt: oldArticleSnapshot.createdAt }
                : {}),
              ...(Object.prototype.hasOwnProperty.call(oldArticleSnapshot, "updatedAt")
                ? { updatedAt: oldArticleSnapshot.updatedAt }
                : {}),
              ...(Object.prototype.hasOwnProperty.call(oldArticleSnapshot, "interactiveComponent")
                ? { interactiveComponent: oldArticleSnapshot.interactiveComponent }
                : {}),
            },
          });
          // Payload's update operation refreshes updatedAt unconditionally. If
          // the adapter is available, restore both timestamp columns directly
          // so compensation returns the article to its exact prior state.
          if (payload.db?.updateOne) {
            const timestampData: Record<string, string> = {};
            if (typeof oldArticleSnapshot.createdAt === "string") {
              timestampData.createdAt = oldArticleSnapshot.createdAt;
            }
            if (typeof oldArticleSnapshot.updatedAt === "string") {
              timestampData.updatedAt = oldArticleSnapshot.updatedAt;
            }
            if (Object.keys(timestampData).length > 0) {
              await payload.db.updateOne({
                collection: "articles",
                id: publishedArticleDoc.id as any,
                data: timestampData,
              });
            }
          }
        } catch {
          console.error("[publishSubmission] rollback: failed to restore updated article", publishedArticleDoc.id);
        }
      }
      throw new Error(`Failed to update submission status to published: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`);
    }

    const updatedDetail = (await this.getSubmissionById(existing.id as string | number))!;
    return {
      submission: updatedDetail,
      article: publishedArticleDoc,
      alreadyPublished: false,
    };
  }

  /**
   * 新增或更新審評評分（依 reviewerToken 唯一性 Upsert）
   */
  static async addOrUpdateReview(
    idOrSlug: string | number,
    input: {
      reviewerToken: string;
      priorKnowledge?: "new_knowledge" | "familiar_surface" | "already_expert";
      scoreDepth: number;
      scoreClarity: number;
      scorePracticality: number;
      generalFeedback?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<{ review: SubmissionReviewItem; ratingStats: SubmissionRatingStats }> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) throw new Error(`Submission not found: ${idOrSlug}`);

    const subId = existing.id as string | number;
    const token = input.reviewerToken.trim();
    if (!token || token.length < 8) {
      throw new Error("Invalid reviewer token");
    }

    const depth = Number(input.scoreDepth);
    const clarity = Number(input.scoreClarity);
    const practicality = Number(input.scorePracticality);

    if (![depth, clarity, practicality].every((s) => Number.isInteger(s) && s >= 1 && s <= 5)) {
      throw new Error("Scores must be integers between 1 and 5");
    }

    const existingReviews = await payload.find({
      collection: "submission-reviews",
      where: {
        and: [
          { submission: { equals: subId } },
          { reviewerToken: { equals: token } },
        ],
      },
      limit: 1,
    });

    let reviewDoc: Record<string, unknown>;

    if (existingReviews.docs.length > 0) {
      reviewDoc = (await payload.update({
        collection: "submission-reviews",
        id: existingReviews.docs[0].id,
        data: {
          priorKnowledge: input.priorKnowledge || "new_knowledge",
          scoreDepth: depth,
          scoreClarity: clarity,
          scorePracticality: practicality,
          generalFeedback: input.generalFeedback ? input.generalFeedback.trim() : null,
          ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
        },
      })) as unknown as Record<string, unknown>;
    } else {
      reviewDoc = (await payload.create({
        collection: "submission-reviews",
        data: {
          submission: subId as any,
          reviewerToken: token,
          priorKnowledge: input.priorKnowledge || "new_knowledge",
          scoreDepth: depth,
          scoreClarity: clarity,
          scorePracticality: practicality,
          generalFeedback: input.generalFeedback ? input.generalFeedback.trim() : null,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
          ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
        },
      })) as unknown as Record<string, unknown>;
    }

    const updatedSubmission = (await this.getSubmissionById(subId, token))!;
    return {
      review: updatedSubmission.myRating || {
        id: reviewDoc.id as string | number,
        submissionId: subId,
        priorKnowledge: (reviewDoc.priorKnowledge as SubmissionReviewItem["priorKnowledge"]) || "new_knowledge",
        scoreDepth: depth,
        scoreClarity: clarity,
        scorePracticality: practicality,
        generalFeedback: (reviewDoc.generalFeedback as string) || null,
        createdAt: String(reviewDoc.createdAt),
      },
      ratingStats: updatedSubmission.ratingStats,
    };
  }

  /**
   * 新增行內標註
   */
  static async addAnnotation(
    idOrSlug: string | number,
    input: {
      reviewerToken: string;
      selectedText: string;
      textOffsetStart: number;
      textOffsetEnd: number;
      comment: string;
      createdAt?: string;
    }
  ): Promise<SubmissionAnnotationItem> {
    const payload = await getPayload({ config });
    const existing = await findSubmissionDoc(payload, idOrSlug);
    if (!existing) throw new Error(`Submission not found: ${idOrSlug}`);

    const subId = existing.id as string | number;
    const token = input.reviewerToken?.trim();
    if (!token || token.length < 8) {
      throw new Error("Invalid reviewer token");
    }

    if (!input.selectedText?.trim() || !input.comment?.trim()) {
      throw new Error("selectedText and comment are required");
    }

    const created = await payload.create({
      collection: "submission-annotations",
      data: {
        submission: subId as any,
        reviewerToken: token,
        selectedText: input.selectedText.trim(),
        textOffsetStart: Number(input.textOffsetStart) || 0,
        textOffsetEnd: Number(input.textOffsetEnd) || 0,
        comment: input.comment.trim(),
        status: "open",
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      },
    });

    return {
      id: created.id as string | number,
      submissionId: subId,
      selectedText: input.selectedText.trim(),
      textOffsetStart: Number(input.textOffsetStart) || 0,
      textOffsetEnd: Number(input.textOffsetEnd) || 0,
      comment: input.comment.trim(),
      status: "open",
      createdAt: created.createdAt ? String(created.createdAt) : new Date().toISOString(),
    };
  }

  /**
   * 更新標註狀態 (open / resolved)
   */
  static async updateAnnotationStatus(
    annotationId: string | number,
    status: "open" | "resolved"
  ): Promise<SubmissionAnnotationItem> {
    const payload = await getPayload({ config });
    const updated = await payload.update({
      collection: "submission-annotations",
      id: Number(annotationId) || annotationId,
      data: {
        status,
      },
    });

    const subRef = typeof updated.submission === "object" && updated.submission !== null
      ? (updated.submission as { id: string | number }).id
      : updated.submission;

    return {
      id: updated.id as string | number,
      submissionId: subRef as string | number,
      selectedText: (updated.selectedText as string) || "",
      textOffsetStart: Number(updated.textOffsetStart) || 0,
      textOffsetEnd: Number(updated.textOffsetEnd) || 0,
      comment: (updated.comment as string) || "",
      status: (updated.status as "open" | "resolved") || "open",
      createdAt: updated.createdAt ? String(updated.createdAt) : new Date().toISOString(),
    };
  }
}
