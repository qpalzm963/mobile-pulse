"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmissionAnnotator, type Annotation } from "@/components/SubmissionAnnotator";
import { SubmissionRatingCard } from "@/components/SubmissionRatingCard";
import { getOrCreateReviewerToken } from "@/lib/reviewer-token";

interface SubmissionDetail {
  id: number;
  slug: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  content: string; // Deprecated alias
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
          <div className="article-intro" style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span className="eyebrow">同儕審評模式 (Peer Reviewing)</span>
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

          {/* Interactive In-line Text Selection Annotator */}
          <SubmissionAnnotator
            submissionId={data.id}
            content={data.content}
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
