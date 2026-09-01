"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SubmissionItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  authorAlias: string;
  tags: string[];
  status: "draft" | "reviewing" | "approved" | "published" | "rejected";
  createdAt: string;
  ratingStats: {
    count: number;
    avgDepth: number;
    avgClarity: number;
    avgPracticality: number;
    overallAvg: number;
  };
  annotationStats: {
    total: number;
    open: number;
  };
}

export default function ReviewsLobbyPage() {
  const [list, setList] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getStatusBadge = (status: SubmissionItem["status"]) => {
    switch (status) {
      case "reviewing":
        return <span style={{ background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid var(--accent-border)", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>🔍 同儕審評中</span>;
      case "approved":
        return <span style={{ background: "var(--success-subtle)", color: "var(--success)", border: "1px solid var(--success-border)", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>✓ 已審核採納</span>;
      case "published":
        return <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>🚀 已正式發布</span>;
      case "draft":
        return <span style={{ background: "var(--bg-subtle)", color: "var(--muted)", border: "1px solid var(--rule)", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>📝 草稿</span>;
      default:
        return <span style={{ background: "var(--bg-subtle)", color: "var(--muted)", padding: "3px 8px", borderRadius: "12px", fontSize: "11px" }}>{status}</span>;
    }
  };

  return (
    <main className="article-page">
      <header className="site-header">
        <Link className="brand" href="/">
          MOBILE <i>PULSE</i>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link className="back-link" href="/">
            ← 所有已發布文章
          </Link>
          <Link
            href="/submit"
            style={{
              background: "var(--accent)",
              color: "#ffffff",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12.5px",
              fontWeight: 600,
            }}
          >
            + 我要投稿
          </Link>
        </div>
      </header>

      <div className="article-shell" style={{ maxWidth: "860px", margin: "0 auto" }}>
        <article className="article-body" style={{ width: "100%", maxWidth: "100%" }}>
          <div className="article-intro" style={{ marginBottom: "28px" }}>
            <span className="eyebrow">協同創作 / 審查評分大廳</span>
            <h1>同儕投稿與匿名審查清單</h1>
            <p className="dek">
              每位組員皆可匿名參與審評。點擊進入文章可直接進行多維度打分（技術深度、清晰度、實用性），或反白選取段落新增劃線備註與具體修改建議。
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
              載入稿件清單中...
            </div>
          ) : list.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--rule)",
                borderRadius: "var(--radius-md)",
                padding: "48px 24px",
                textAlign: "center",
                background: "var(--bg-subtle)",
              }}
            >
              <span style={{ fontSize: "28px", display: "block", marginBottom: "12px" }}>📬</span>
              <h3 style={{ margin: "0 0 8px", fontSize: "17px", color: "var(--ink)" }}>目前尚無待審核稿件</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 20px" }}>
                成為第一個投稿的組員，分享你的技術發現或踩坑經驗！
              </p>
              <Link
                href="/submit"
                style={{
                  background: "var(--accent)",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "9px 20px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  display: "inline-block",
                }}
              >
                立即投稿第一篇文章
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {list.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--rule)",
                    borderRadius: "var(--radius-md)",
                    padding: "20px 24px",
                    boxShadow: "var(--shadow-sm)",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {getStatusBadge(item.status)}
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                        由 <strong>{item.authorAlias}</strong> 提交於 {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Aggregate Rating Score Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ font: "800 16px var(--display)", color: item.ratingStats.overallAvg > 0 ? "var(--accent)" : "var(--muted)" }}>
                        {item.ratingStats.overallAvg > 0 ? `${item.ratingStats.overallAvg.toFixed(1)} ★` : "尚未評分"}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        ({item.ratingStats.count} 票)
                      </span>
                    </div>
                  </div>

                  <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>
                    <Link
                      href={`/reviews/${item.id}`}
                      style={{ color: "var(--ink)", textDecoration: "none" }}
                    >
                      {item.title}
                    </Link>
                  </h3>

                  <p style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: "1.6", color: "var(--ink-body)" }}>
                    {item.summary}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--rule-light)", paddingTop: "12px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            background: "var(--bg-subtle)",
                            color: "var(--muted)",
                            border: "1px solid var(--rule)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontFamily: "var(--mono)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                        💬 {item.annotationStats.total} 條劃線備註
                      </span>
                      <Link
                        href={`/reviews/${item.id}`}
                        style={{
                          background: "var(--bg-subtle)",
                          border: "1px solid var(--rule)",
                          color: "var(--accent)",
                          textDecoration: "none",
                          padding: "6px 14px",
                          borderRadius: "4px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                        }}
                      >
                        進入審查與標註 ➔
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <footer>
        <span>MOBILE PULSE</span>
        <p>整理訊號，留給真正要交付產品的人。</p>
      </footer>
    </main>
  );
}
