import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleToc } from "@/components/ArticleToc";
import { Feedback } from "@/components/Feedback";
import { RichMarkdownRenderer } from "@/components/RichMarkdownRenderer";
import { getPublishedArticleBySlug } from "@/lib/articles";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getPublishedArticleBySlug(slug);
    if (!article) {
      return { title: "文章未找到 | MOBILE PULSE" };
    }

    return {
      title: `${article.title} | MOBILE PULSE`,
      description: article.summary,
    };
  } catch {
    return { title: "MOBILE PULSE" };
  }
}

export default async function DynamicArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="article-page">
      <header className="site-header">
        <Link className="brand" href="/">
          MOBILE <i>PULSE</i>
        </Link>
        <Link className="back-link" href="/">
          ← 所有文章
        </Link>
      </header>

      <div className="article-shell">
        <article className="article-body">
          <div className="article-intro">
            {article.eyebrow ? (
              <span className="eyebrow">{article.eyebrow}</span>
            ) : null}
            <h1>{article.title}</h1>
            <p className="dek">{article.summary}</p>
            <p className="article-date">
              <span>{article.publishedAt || "近期發布"}</span>
              <span>•</span>
              <span>{article.readTime || "5 MIN READ"}</span>
              <span>•</span>
              <span>{article.author || "MOBILE PULSE 編輯部"}</span>
            </p>
          </div>

          {article.coverImage?.url ? (
            <div
              className="article-cover"
              style={{
                margin: "24px 0",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid var(--rule, #222f49)",
                background: "var(--bg-subtle, #1a2234)",
              }}
            >
              <img
                src={article.coverImage.url}
                alt={article.coverImage.alt || article.title}
                style={{
                  width: "100%",
                  maxHeight: "420px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {article.coverImage.caption ? (
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "var(--muted, #94a3b8)",
                    borderTop: "1px solid var(--rule, #222f49)",
                  }}
                >
                  {article.coverImage.caption}
                </div>
              ) : null}
            </div>
          ) : null}

          {article.contentMarkdown ? (
            <RichMarkdownRenderer content={article.contentMarkdown} />
          ) : (
            <p className="lead">{article.summary}</p>
          )}

          <Feedback slug={article.slug} />
        </article>

        <aside className="article-aside">
          <ArticleToc />
        </aside>
      </div>
    </main>
  );
}
