import React from "react";
import type { Article, ArticleStatus, WorkflowColumn } from "@mobile-pulse/api-client";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";

interface Props {
  articles: Article[];
  workflow: WorkflowColumn[];
  onSelectArticle: (article: Article) => void;
  onUpdateStatus: (id: string | number, status: ArticleStatus) => Promise<void>;
  onDeleteArticle: (id: string | number) => Promise<void>;
  formatDate: (val?: string) => string;
  apiBaseUrl?: string;
}

export const ArticleLibrary: React.FC<Props> = ({
  articles,
  workflow,
  onSelectArticle,
  onUpdateStatus,
  onDeleteArticle,
  formatDate,
  apiBaseUrl = "",
}) => {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>文章資訊</th>
            <th>分類 / 主題</th>
            <th>流程狀態</th>
            <th>讀者數據</th>
            <th>更新日期</th>
            <th style={{ textAlign: "right" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {articles.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "40px 0" }}>
                沒有符合條件的文章
              </td>
            </tr>
          ) : (
            articles.map((article) => {
              const liveUrl = `${apiBaseUrl}/articles/${article.slug}`;
              return (
                <tr key={article.id}>
                  <td>
                    <button
                      className="data-table__title"
                      type="button"
                      onClick={() => onSelectArticle(article)}
                    >
                      {article.title || "無標題"}
                      <span>/{article.slug}</span>
                    </button>
                  </td>
                  <td>
                    <span className="muted">{article.eyebrow || "未分類"}</span>
                  </td>
                  <td>
                    <select
                      className={`status-select status-select--${article.status}`}
                      value={article.status}
                      onChange={(e) => onUpdateStatus(article.id, e.target.value as ArticleStatus)}
                    >
                      {workflow.map((w) => (
                        <option key={w.status} value={w.status}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {article.stats ? (
                      <div>
                        <strong>{article.stats.views} 次閱讀</strong>
                        <span className="table-subtitle">
                          {article.stats.usefulRate !== null
                            ? `有用率 ${article.stats.usefulRate}%`
                            : "尚無評分"}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="muted">{formatDate(article.updatedAt || article.publishedAt)}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => onSelectArticle(article)}
                        title="編輯文章"
                      >
                        <Pencil size={14} />
                      </button>
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="查看前台文章"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => onDeleteArticle(article.id)}
                        title="刪除文章"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
