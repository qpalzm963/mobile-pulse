"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmissionAnnotator, type Annotation } from "@/components/SubmissionAnnotator";
import { SubmissionRatingCard } from "@/components/SubmissionRatingCard";
import { getOrCreateReviewerToken } from "@/lib/reviewer-token";

interface SubmissionDetail {
  id: string | number;
  slug: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  content: string; // Deprecated alias
  authorAlias: string;
  tags: string[];
  status: "draft" | "reviewing" | "changes_requested" | "approved" | "published" | "rejected";
  createdAt: string;
  publishedArticleId?: string | null;
  ratingStats: {
    count: number;
    avgDepth: number;
    avgClarity: number;
    avgPracticality: number;
    overallAvg: number;
  };
  myRating: {
    scoreDepth: number;
    scoreClarity: number;
    scorePracticality: number;
    generalFeedback: string | null;
  } | null;
  annotations: Annotation[];
}

export default function ReviewDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const reviewerToken = getOrCreateReviewerToken();

    fetch(`/api/submissions/${id}`, {
      headers: {
        "x-reviewer-token": reviewerToken,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("無法取得稿件內容");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "發生錯誤");
        setLoading(false);
      });
  }, [id]);

  const handleAction = async (action: "submit" | "request_changes" | "approve" | "reject" | "publish") => {
    if (!data) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      if (action === "publish") {
        const res = await fetch(`/api/submissions/${data.id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "發布失敗");
        setData((prev) => (prev ? { ...prev, status: "published" } : prev));
        setActionMessage("🚀 文章已正式發布至前台！");
      } else {
        const res = await fetch(`/api/submissions/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "操作失敗");
        if (resJson.submission) {
          setData(resJson.submission);
        }
        setActionMessage("狀態更新成功！");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "操作失敗";
      setActionMessage(`❌ 錯誤：${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: SubmissionDetail["status"]) => {
    switch (status) {
      case "reviewing":
        return <span style={{ background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid var(--accent-border)", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>🔍 同儕審評中</span>;
      case "changes_requested":
        return <span style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>⚠️ 需修改 / 退修</span>;
      case "approved":
        return <span style={{ background: "var(--success-subtle)", color: "var(--success)", border: "1px solid var(--success-border)", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>✓ 已審核採納 (可發布)</span>;
      case "published":
        return <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>🚀 已正式發布</span>;
      case "rejected":
        return <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>❌ 未採納</span>;
      case "draft":
        return <span style={{ background: "var(--bg-subtle)", color: "var(--muted)", border: "1px solid var(--rule)", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>📝 草稿</span>;
      default:
        return <span>{status}</span>;
    }
  };

  if (loading) {
    return (
      <main className="article-page">
        <header className="site-header">
          <Link className="brand" href="/">
            MOBILE <i>PULSE</i>
          </Link>
        </header>
        <div style={{ textAlign: "center", padding: "100px 20px", color: "var(--muted)" }}>
          載入審評工作台中...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="article-page">
        <header className="site-header">
          <Link className="brand" href="/">
            MOBILE <i>PULSE</i>
          </Link>
        </header>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2 style={{ color: "var(--warn)" }}>無法開啟此稿件</h2>
          <p style={{ color: "var(--muted)", margin: "8px 0 20px" }}>{error || "找不到該篇投稿"}</p>
          <Link href="/reviews" className="back-link">
            ← 返回審評大廳
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="article-page">
      <header className="site-header">
        <Link className="brand" href="/">
          MOBILE <i>PULSE</i>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link className="back-link" href="/reviews">
            ← 審評大廳
          </Link>
          <Link className="back-link" href="/submit">
            + 我要投稿
          </Link>
        </div>
      </header>

      <div className="article-shell" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <article className="article-body" style={{ width: "100%", maxWidth: "100%" }}>
          <div className="article-intro" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="eyebrow" style={{ margin: 0 }}>審評工作台</span>
                {getStatusBadge(data.status)}
              </div>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                作者：<strong>{data.authorAlias}</strong> · 提交於 {new Date(data.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h1>{data.title}</h1>
            <p className="dek">{data.summary}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "14px 0 0" }}>
              {data.tags.map((t) => (
                <span
                  key={t}
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
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Workflow Action Bar */}
          <div
            style={{
              padding: "16px 20px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              marginBottom: "28px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                🛠️ 審稿流程操作：
              </span>
              {data.status === "changes_requested" && (
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#b45309" }}>
                  ⚠️ 目前為「退修 / 需修改」狀態。作者修改完畢後可點選「重新送審」。
                </p>
              )}
              {data.status === "approved" && (
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--success)" }}>
                  ✓ 本稿件已通過審評，可直接點選發布為公開文章。
                </p>
              )}
              {data.status === "published" && (
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#16a34a" }}>
                  🚀 本稿件已正式發布至前台！
                  <Link
                    href={`/articles/${data.slug}`}
                    style={{ marginLeft: "8px", fontWeight: 700, color: "var(--accent)" }}
                  >
                    前往閱讀公開文章 ↗
                  </Link>
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {data.status === "changes_requested" && (
                <button
                  onClick={() => handleAction("submit")}
                  disabled={actionLoading}
                  style={{
                    padding: "6px 14px",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🚀 修改完成，重新送審
                </button>
              )}

              {data.status === "reviewing" && (
                <>
                  <button
                    onClick={() => handleAction("request_changes")}
                    disabled={actionLoading}
                    style={{
                      padding: "6px 12px",
                      background: "#fffbeb",
                      color: "#b45309",
                      border: "1px solid #fde68a",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ⚠️ 請求作者修改
                  </button>
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading}
                    style={{
                      padding: "6px 14px",
                      background: "var(--success)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✓ 審核採納
                  </button>
                </>
              )}

              {data.status === "approved" && (
                <button
                  onClick={() => handleAction("publish")}
                  disabled={actionLoading}
                  style={{
                    padding: "6px 16px",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🚀 正式發布文章 (Publish)
                </button>
              )}
            </div>
          </div>

          {actionMessage && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                marginBottom: "20px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--rule)",
              }}
            >
              {actionMessage}
            </div>
          )}

          {/* Interactive In-line Text Selection Annotator */}
          <SubmissionAnnotator
            submissionId={data.id}
            content={data.contentMarkdown || data.content}
            initialAnnotations={data.annotations}
          />

          {/* Anonymous Multi-dimensional Rating Card */}
          <SubmissionRatingCard
            submissionId={data.id}
            initialStats={data.ratingStats}
            initialMyRating={data.myRating}
            onRatingUpdated={(newStats, myRating) => {
              setData((prev) => (prev ? { ...prev, ratingStats: newStats, myRating } : prev));
            }}
          />
        </article>
      </div>

      <footer>
        <span>MOBILE PULSE</span>
        <p>整理訊號，留給真正要交付產品的人。</p>
      </footer>
    </main>
  );
}
