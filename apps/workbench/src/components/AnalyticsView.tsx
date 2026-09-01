import React from "react";
import type { Article } from "@mobile-pulse/api-client";

interface Props {
  articles: Article[];
  totalViews: number;
  usefulRate: number;
  feedbackTotal: number;
  onSelectArticle: (article: Article) => void;
}

export const AnalyticsView: React.FC<Props> = ({
  articles,
  totalViews,
  usefulRate,
  feedbackTotal,
  onSelectArticle,
}) => {
  const sortedArticles = [...articles].sort(
    (a, b) => (b.stats?.views || 0) - (a.stats?.views || 0)
  );

  return (
    <div className="analytics-page">
      <section className="analytics-lead">
        <div>
          <p>AUDIENCE SIGNALS</p>
          <h2>以讀者真實訊號，決定下一篇優化方向</h2>
          <span>
            透過點擊率、有用評分與讀者回饋，找出讀者最受用的實戰內容，指導後續產出節奏。
          </span>
        </div>

        <dl>
          <div>
            <dt>總閱讀量</dt>
            <dd>{totalViews}</dd>
          </div>
          <div>
            <dt>有用率</dt>
            <dd>{usefulRate}%</dd>
          </div>
          <div>
            <dt>讀者回饋</dt>
            <dd>{feedbackTotal}</dd>
          </div>
        </dl>
      </section>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>排名 / 文章名稱</th>
              <th>分類</th>
              <th>總閱讀量</th>
              <th>有用評分 (Useful)</th>
              <th>需改進 (Not Useful)</th>
              <th>整體有用率</th>
            </tr>
          </thead>
          <tbody>
            {sortedArticles.map((article, index) => {
              const stats = article.stats || {
                views: 0,
                useful: 0,
                notUseful: 0,
                usefulRate: null,
              };

              return (
                <tr key={article.id}>
                  <td>
                    <button
                      className="data-table__title"
                      type="button"
                      onClick={() => onSelectArticle(article)}
                    >
                      <strong>#{index + 1} </strong>
                      {article.title}
                      <span>/{article.slug}</span>
                    </button>
                  </td>
                  <td>
                    <span className="muted">{article.eyebrow || "App 開發"}</span>
                  </td>
                  <td>
                    <strong>{stats.views}</strong> 次
                  </td>
                  <td style={{ color: "var(--green)", fontWeight: 700 }}>
                    +{stats.useful}
                  </td>
                  <td style={{ color: "var(--red)", fontWeight: 700 }}>
                    -{stats.notUseful}
                  </td>
                  <td>
                    {stats.usefulRate !== null ? (
                      <span className="rate-badge">{stats.usefulRate}%</span>
                    ) : (
                      <span className="muted">尚未評分</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
