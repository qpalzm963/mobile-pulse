import React, { useState } from "react";
import type { Article, ArticleStatus, WorkflowColumn } from "@mobile-pulse/api-client";
import { GripVertical } from "lucide-react";

interface Props {
  articles: Article[];
  workflow: WorkflowColumn[];
  onSelectArticle: (article: Article) => void;
  onUpdateStatus: (id: string | number, status: ArticleStatus) => Promise<void>;
  formatDate: (val?: string) => string;
}

export const WorkflowBoard: React.FC<Props> = ({
  articles,
  workflow,
  onSelectArticle,
  onUpdateStatus,
  formatDate,
}) => {
  const [draggedId, setDraggedId] = useState<string | number | null>(null);
  const [dropTarget, setDropTarget] = useState<ArticleStatus | null>(null);

  const handleDragStart = (id: string | number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, status: ArticleStatus) => {
    e.preventDefault();
    if (dropTarget !== status) {
      setDropTarget(status);
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (status: ArticleStatus) => {
    if (draggedId !== null) {
      await onUpdateStatus(draggedId, status);
      setDraggedId(null);
      setDropTarget(null);
    }
  };

  return (
    <div className="workflow-board" role="region" aria-label="文章看板">
      {workflow.map(({ status, label, description }) => {
        const laneArticles = articles.filter((a) => a.status === status);
        const isOver = dropTarget === status;

        return (
          <section
            key={status}
            className={`workflow-lane workflow-lane--${status} ${isOver ? "is-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(status)}
          >
            <header>
              <div>
                <i />
                <h2>{label}</h2>
              </div>
              <b>{laneArticles.length}</b>
            </header>
            <p>{description}</p>

            <div className="workflow-lane__cards">
              {laneArticles.length === 0 ? (
                <div className="workspace-empty">此階段目前沒有文章</div>
              ) : (
                laneArticles.map((article) => (
                  <article
                    key={article.id}
                    className="article-card"
                    draggable
                    onDragStart={() => handleDragStart(article.id)}
                  >
                    <div className="article-card__meta">
                      <span>{article.eyebrow || "ARTICLE"}</span>
                      <GripVertical size={14} />
                    </div>

                    <button type="button" onClick={() => onSelectArticle(article)}>
                      {article.title || "無標題文章"}
                    </button>

                    <p>{article.summary || "尚未填寫摘要。"}</p>

                    <footer>
                      <span>{formatDate(article.updatedAt || article.publishedAt)}</span>
                      <select
                        className={`status-select status-select--${article.status} is-compact`}
                        value={article.status}
                        onChange={(e) => onUpdateStatus(article.id, e.target.value as ArticleStatus)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`修改 ${article.title} 狀態`}
                      >
                        {workflow.map((w) => (
                          <option key={w.status} value={w.status}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </footer>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
