import { getPayload } from "payload";
import config from "@payload-config";

export interface ArticleCoverImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ArticleTag {
  id: string;
  name: string;
}

export interface PublishedArticleSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  eyebrow?: string | null;
  author: string;
  readTime: string;
  publishedAt: string;
  tags: string[];
  tagItems: ArticleTag[];
  coverImage?: ArticleCoverImage | null;
  href: string;
}

export interface PublishedArticleDetail extends PublishedArticleSummary {
  contentMarkdown: string;
  interactiveComponent?: string | null;
}

export interface TagItem {
  id: string;
  label: string;
  count?: number;
}

export interface ListArticlesOptions {
  limit?: number;
  page?: number;
}

export function formatDisplayDate(dateVal: unknown): string {
  if (!dateVal) return "近期發布";
  if (typeof dateVal === "string") {
    // If it's already "2026.08.20"
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateVal)) return dateVal;
    // If it's "2026-08-20" or ISO
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getUTCFullYear();
      const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(parsed.getUTCDate()).padStart(2, "0");
      return `${yyyy}.${mm}.${dd}`;
    }
    return dateVal;
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const yyyy = dateVal.getUTCFullYear();
    const mm = String(dateVal.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dateVal.getUTCDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  }
  return "近期發布";
}

function mapArticleSummary(doc: Record<string, unknown>): PublishedArticleSummary {
  const tagItems: ArticleTag[] = [];
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

  let coverImage: ArticleCoverImage | null = null;
  if (doc.coverImage && typeof doc.coverImage === "object") {
    const mediaObj = doc.coverImage as Record<string, unknown>;
    const mediaId = String(mediaObj.id);
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
    coverImage = {
      id: mediaId,
      url: `/api/media/${mediaId}`,
    };
  }

  return {
    id: String(doc.id),
    slug: doc.slug as string,
    title: doc.title as string,
    summary: (doc.summary as string) || "",
    eyebrow: (doc.eyebrow as string) || null,
    author: (doc.author as string) || "MOBILE PULSE 編輯部",
    readTime: (doc.readTime as string) || "5 MIN READ",
    publishedAt: formatDisplayDate(doc.publishedAt),
    tags,
    tagItems,
    coverImage,
    href: `/articles/${doc.slug}`,
  };
}

function mapArticleDetail(doc: Record<string, unknown>): PublishedArticleDetail {
  const summary = mapArticleSummary(doc);
  return {
    ...summary,
    contentMarkdown: (doc.contentMarkdown as string) || "",
    interactiveComponent: (doc.interactiveComponent as string) || null,
  };
}

/**
 * 取得所有已發布文章列表。
 * 僅查詢 status = 'published'，依 publishedAt 降序排列。
 * 若資料庫或 CMS 發生錯誤，將錯誤拋出由上層 Error Boundary 處理，避免誤將連線錯誤當作空文章。
 */
export async function listPublishedArticles(
  options?: ListArticlesOptions
): Promise<PublishedArticleSummary[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "articles",
    where: {
      status: {
        equals: "published",
      },
    },
    depth: 2,
    limit: options?.limit ?? 0, // 0 = no limit in Payload CMS
    page: options?.page,
    sort: "-publishedAt",
  });

  return result.docs.map((doc) =>
    mapArticleSummary(doc as unknown as Record<string, unknown>)
  );
}

/**
 * 依 slug 取得單篇已發布文章。
 * 若查無文章或狀態非 published，回傳 null（由路由觸發 notFound() 404）。
 * 若資料庫連線中斷或查詢錯誤，將錯誤拋出。
 */
export async function getPublishedArticleBySlug(
  slug: string
): Promise<PublishedArticleDetail | null> {
  if (!slug || typeof slug !== "string") return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "articles",
    where: {
      and: [
        { slug: { equals: slug.trim() } },
        { status: { equals: "published" } },
      ],
    },
    depth: 2,
    limit: 1,
  });

  if (result.docs.length === 0) {
    return null;
  }

  const doc = result.docs[0];
  return mapArticleDetail(doc as unknown as Record<string, unknown>);
}

/**
 * 動態檢查 slug 是否為已發布文章。
 */
export async function isPublishedArticleSlug(slug: string): Promise<boolean> {
  if (!slug || typeof slug !== "string") return false;
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "articles",
      where: {
        and: [
          { slug: { equals: slug.trim() } },
          { status: { equals: "published" } },
        ],
      },
      limit: 1,
    });
    return result.docs.length > 0;
  } catch (error) {
    console.error(`Failed to check article slug "${slug}":`, error);
    return false;
  }
}

/**
 * 取得所有標籤列表並統計各標籤的已發布文章數量。
 * 支援傳入已獲取的 articles，避免首頁重複執行查詢。
 */
export async function listPublishedTags(
  existingArticles?: PublishedArticleSummary[]
): Promise<TagItem[]> {
  const payload = await getPayload({ config });
  const [tagsResult, articles] = await Promise.all([
    payload.find({
      collection: "tags",
      limit: 0,
    }),
    existingArticles ? Promise.resolve(existingArticles) : listPublishedArticles(),
  ]);

  const tagCounts = new Map<string, number>();
  for (const article of articles) {
    for (const tagId of article.tags) {
      tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
    }
  }

  const tags: TagItem[] = [
    { id: "all", label: "全部", count: articles.length },
    ...tagsResult.docs.map((tagDoc) => {
      const doc = tagDoc as unknown as Record<string, unknown>;
      const id = (doc.tagId as string) || String(doc.id);
      const label = (doc.name as string) || id;
      return {
        id,
        label,
        count: tagCounts.get(id) || 0,
      };
    }),
  ];

  return tags;
}

/**
 * 首頁一次性取得已發布文章與標籤資料，避免重複查詢。
 */
export async function getHomePageData(): Promise<{
  articles: PublishedArticleSummary[];
  tags: TagItem[];
}> {
  const articles = await listPublishedArticles();
  const tags = await listPublishedTags(articles);
  return { articles, tags };
}
