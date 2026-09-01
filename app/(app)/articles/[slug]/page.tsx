import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { ArticleToc } from "@/components/ArticleToc";
import { Feedback } from "@/components/Feedback";
import { RichMarkdownRenderer } from "@/components/RichMarkdownRenderer";
import config from "@payload-config";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "articles",
      where: { slug: { equals: slug } },
      limit: 1,
    });

    if (result.docs.length === 0) {
      return { title: "文章未找到 | MOBILE PULSE" };
    }

    const article = result.docs[0];
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
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "articles",
    where: { slug: { equals: slug } },
    limit: 1,
  });

  if (result.docs.length === 0) {
    notFound();
  }

  const article = result.docs[0];

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
