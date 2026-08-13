"use client";

import { useState } from "react";
import { ARTICLES, TAGS } from "../data/articles";

export function ArticleDirectory() {
  const [activeTag, setActiveTag] = useState("all");
  const visible = ARTICLES.filter((article) => activeTag === "all" || article.tags.includes(activeTag));

  return (
    <>
      <nav className="tag-list" aria-label="文章分類">
        {TAGS.map((tag) => <button key={tag.id} className={activeTag === tag.id ? "active" : ""} type="button" onClick={() => setActiveTag(tag.id)}>{tag.label}</button>)}
      </nav>
      {visible.length ? <div className="article-grid">
        {visible.map((article, index) => <a className="article-card" href={article.href} key={article.slug}>
          <div className="card-art" style={{ backgroundImage: `url(${article.coverImage})` }} aria-hidden="true"><span>0{index + 1}</span></div>
          <p className="card-meta">{article.publishedAt} · {article.tags.slice(0, 2).join(" / ")}</p>
          <h3>{article.title}</h3><p>{article.summary}</p><span className="read-more">閱讀文章 <b>↗</b></span>
        </a>)}
      </div> : <div className="empty-state"><p>這個分類正在收集訊號中。</p><button type="button" onClick={() => setActiveTag("all")}>查看全部文章</button></div>}
    </>
  );
}
