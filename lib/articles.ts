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
    publishedAt: (doc.publishedAt as string) || "近期發布",
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

function normalizeDate(dateStr: string): number {
  if (!dateStr) return 0;
  const formatted = dateStr.replace(/\./g, "-");
  const time = Date.parse(formatted);
  return isNaN(time) ? 0 : time;
}

export async function listPublishedArticles(): Promise<PublishedArticleSummary[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "articles",
      where: {
        status: {
          equals: "published",
        },
      },
      depth: 2,
      limit: 200,
      sort: "-publishedAt",
    });

    const articles: PublishedArticleSummary[] = result.docs.map((doc) =>
      mapArticleSummary(doc as unknown as Record<string, unknown>)
    );

    articles.sort((a, b) => {
      const dateA = normalizeDate(a.publishedAt);
      const dateB = normalizeDate(b.publishedAt);
      return dateB - dateA;
    });

    return articles;
  } catch (error) {
    console.error("Failed to list published articles:", error);
    return [];
  }
}

export async function getPublishedArticleBySlug(slug: string): Promise<PublishedArticleDetail | null> {
  if (!slug || typeof slug !== "string") return null;
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
      depth: 2,
      limit: 1,
    });

    if (result.docs.length === 0) {
      return null;
    }

    const doc = result.docs[0];
    return mapArticleDetail(doc as unknown as Record<string, unknown>);
  } catch (error) {
    console.error(`Failed to get published article for slug "${slug}":`, error);
    return null;
  }
}

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

export async function listPublishedTags(): Promise<TagItem[]> {
  try {
    const payload = await getPayload({ config });
    const [tagsResult, articles] = await Promise.all([
      payload.find({
        collection: "tags",
        limit: 100,
      }),
      listPublishedArticles(),
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
  } catch (error) {
    console.error("Failed to list published tags:", error);
    return [{ id: "all", label: "全部", count: 0 }];
  }
}
