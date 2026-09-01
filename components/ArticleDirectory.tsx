"use client";

import { useState, type ReactNode } from "react";
import { ARTICLES, TAGS } from "../data/articles";

const LABELS = new Map(TAGS.map((tag) => [tag.id, tag.label]));

function countFor(id: string) {
  return id === "all"
    ? ARTICLES.length
    : ARTICLES.filter((article) => article.tags.includes(id)).length;
}

/**
 * 首頁目錄。側欄與清單都由這裡渲染，因為篩選狀態是兩者共用的；
 * children 會放進清單上方，讓頁面自己決定開場文案。
 */
export function ArticleDirectory({ children }: { children?: ReactNode }) {
  const [activeTag, setActiveTag] = useState("all");
  const visible = ARTICLES.filter(
    (article) => activeTag === "all" || article.tags.includes(activeTag)
  );

  return (
    <div className="shell">
      <aside className="side">
        <h2>分類</h2>
        <nav aria-label="文章分類">
          <ul>
            {TAGS.map((tag) => (
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
            <a className="row" href={article.href} key={article.slug}>
              <p className="card-meta">
                <span>{article.publishedAt}</span>
              </p>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <div className="tags">
                {article.tags.map((tag) => (
                  <span key={tag}>{LABELS.get(tag) ?? tag}</span>
                ))}
              </div>
            </a>
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
