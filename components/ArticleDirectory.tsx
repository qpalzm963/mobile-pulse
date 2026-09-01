"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { PublishedArticleSummary, TagItem } from "@/lib/articles";

export interface ArticleDirectoryProps {
  articles?: PublishedArticleSummary[];
  tags?: TagItem[];
  children?: ReactNode;
}

/**
 * 首頁目錄。側欄與清單都由這裡渲染，因為篩選狀態是兩者共用的；
 * children 會放進清單上方，讓頁面自己決定開場文案。
 */
export function ArticleDirectory({
  articles = [],
  tags = [],
  children,
}: ArticleDirectoryProps) {
  const [activeTag, setActiveTag] = useState("all");

  const effectiveTags: TagItem[] = tags.length > 0
    ? tags
    : [{ id: "all", label: "全部" }];

  const labelsMap = new Map(effectiveTags.map((tag) => [tag.id, tag.label]));

  const countFor = (id: string) => {
    return id === "all"
      ? articles.length
      : articles.filter((article) => article.tags.includes(id)).length;
  };

  const visible = articles.filter(
    (article) => activeTag === "all" || article.tags.includes(activeTag)
  );

  return (
    <div className="shell">
      <aside className="side">
        <h2>分類</h2>
        <nav aria-label="文章分類">
          <ul>
            {effectiveTags.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  className={activeTag === tag.id ? "active" : ""}
                  aria-pressed={activeTag === tag.id}
                  onClick={() => setActiveTag(tag.id)}
                >
                  {tag.label}
                  <span className="count">{countFor(tag.id)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section className="feed">
        {children}
        {visible.length ? (
          visible.map((article) => (
            <Link className="row" href={article.href} key={article.slug}>
              {article.coverImage?.url ? (
                <div
                  className="card-cover"
                  style={{
                    marginBottom: "12px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    maxHeight: "180px",
                    background: "var(--bg-subtle, #1a2234)",
                  }}
                >
                  <img
                    src={article.coverImage.url}
                    alt={article.coverImage.alt || article.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ) : null}
              <p className="card-meta">
                <span>{article.publishedAt}</span>
                {article.readTime ? (
                  <>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </>
                ) : null}
              </p>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <div className="tags">
                {article.tags.map((tag) => (
                  <span key={tag}>{labelsMap.get(tag) ?? tag}</span>
                ))}
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <p>這個分類正在收集訊號中。</p>
            <button type="button" onClick={() => setActiveTag("all")}>
              查看全部文章
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
