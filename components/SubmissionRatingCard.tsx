"use client";

import { useState } from "react";
import { getOrCreateReviewerToken } from "../lib/reviewer-token";

export type PriorKnowledgeLevel = "new_knowledge" | "familiar_surface" | "already_expert";

interface RatingStats {
  count: number;
  avgDepth: number;
  avgClarity: number;
  avgPracticality: number;
  overallAvg: number;
  priorNewCount?: number;
  priorFamiliarCount?: number;
  priorExpertCount?: number;
}

interface MyRating {
  priorKnowledge?: PriorKnowledgeLevel;
  scoreDepth: number;
  scoreClarity: number;
  scorePracticality: number;
  generalFeedback: string | null;
}

interface Props {
  submissionId: number;
  initialStats: RatingStats;
  initialMyRating: MyRating | null;
  onRatingUpdated?: (newStats: RatingStats, myRating: MyRating) => void;
}

const DEPTH_LABELS = ["", "基礎入門", "通識概覽", "架構清晰", "深入扎實", "極具深度"];
const CLARITY_LABELS = ["", "結構較散", "尚可理解", "條理通順", "表達流暢", "極佳節奏"];
const PRACTICAL_LABELS = ["", "概念探索", "局部參考", "具實務價值", "可直接落地", "標準範本"];

export function SubmissionRatingCard({
  submissionId,
  initialStats,
  initialMyRating,
  onRatingUpdated,
}: Props) {
  const [stats, setStats] = useState<RatingStats>(initialStats);
  const [priorKnowledge, setPriorKnowledge] = useState<PriorKnowledgeLevel>(
    initialMyRating?.priorKnowledge ?? "new_knowledge"
  );
  const [depth, setDepth] = useState<number>(initialMyRating?.scoreDepth ?? 4);
  const [clarity, setClarity] = useState<number>(initialMyRating?.scoreClarity ?? 4);
  const [practicality, setPracticality] = useState<number>(initialMyRating?.scorePracticality ?? 4);
  const [feedback, setFeedback] = useState<string>(initialMyRating?.generalFeedback ?? "");
  const [hasRated, setHasRated] = useState<boolean>(!!initialMyRating);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const reviewerToken = getOrCreateReviewerToken();

    try {
      const res = await fetch(`/api/submissions/${submissionId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerToken,
          priorKnowledge,
          scoreDepth: depth,
          scoreClarity: clarity,
          scorePracticality: practicality,
          generalFeedback: feedback,
        }),
      });

      if (!res.ok) throw new Error("評分提交失敗");

      const data = await res.json();
      setStats(data.ratingStats);
      setHasRated(true);
      setMessage("✓ 評分已記錄（完全匿名）");
      onRatingUpdated?.(data.ratingStats, data.myRating);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "發生錯誤";
      setMessage("✕ " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSegmentedScore = (
    value: number,
    onChange: (v: number) => void,
    numberKey: string,
    title: string,
    enTitle: string,
    labels: string[]
  ) => {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: "16px",
          padding: "12px 0",
          borderBottom: "1px solid var(--rule-light)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ font: "700 11px var(--mono)", color: "var(--muted)" }}>{numberKey}</span>
            <span style={{ font: "600 13.5px var(--sans)", color: "var(--ink)" }}>{title}</span>
            <span style={{ font: "400 11.5px var(--mono)", color: "var(--muted)" }}>{enTitle}</span>
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--accent)", fontWeight: 600, display: "block", marginTop: "2px" }}>
            {value} 級 · {labels[value]}
          </span>
        </div>

        {/* Continuous Segmented Rating Bar */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--bg-subtle)",
            padding: "2px",
            borderRadius: "6px",
            border: "1px solid var(--rule)",
          }}
        >
          {[1, 2, 3, 4, 5].map((level) => {
            const isSelected = level === value;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onChange(level)}
                style={{
                  background: isSelected ? "var(--ink)" : "transparent",
                  color: isSelected ? "#ffffff" : "var(--muted)",
                  border: "none",
                  padding: "5px 12px",
                  borderRadius: "4px",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const totalCount = stats.count || 0;
  const newCount = stats.priorNewCount ?? 0;
  const familiarCount = stats.priorFamiliarCount ?? 0;
  const expertCount = stats.priorExpertCount ?? 0;

  const newPct = totalCount > 0 ? Math.round((newCount / totalCount) * 100) : 0;
  const familiarPct = totalCount > 0 ? Math.round((familiarCount / totalCount) * 100) : 0;
  const expertPct = totalCount > 0 ? Math.round((expertCount / totalCount) * 100) : 0;

  return (
    <div
      style={{
        margin: "40px 0",
        background: "#ffffff",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        padding: "24px 28px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "1px solid var(--rule)",
          paddingBottom: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <span style={{ font: "700 10.5px var(--mono)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            PEER REVIEW PROTOCOL
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: "17px", color: "var(--ink)", fontWeight: 700 }}>
            文章質量評分與認知調查
          </h3>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", justifyContent: "flex-end" }}>
            <span style={{ font: "800 24px/1 var(--mono)", color: "var(--ink)" }}>
              {stats.overallAvg > 0 ? stats.overallAvg.toFixed(1) : "—"}
            </span>
            <span style={{ font: "500 12px var(--mono)", color: "var(--muted)" }}>/ 5.0</span>
          </div>
          <span style={{ font: "500 11px var(--mono)", color: "var(--muted)", display: "block", marginTop: "2px" }}>
            {stats.count} REVIEWS SUBMITTED
          </span>
        </div>
      </div>

      {/* Aggregate Distribution Bar (if ratings exist) */}
      {totalCount > 0 && (
        <div style={{ marginBottom: "24px", background: "var(--bg-subtle)", padding: "12px 14px", borderRadius: "6px", border: "1px solid var(--rule-light)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: "6px" }}>
            <span>PRIOR KNOWLEDGE DISTRIBUTION</span>
            <span>{totalCount} CONTRIBUTORS</span>
          </div>

          {/* Minimal Multi-Segment Progress Bar */}
          <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", background: "#e2e8f0", marginBottom: "8px" }}>
            {newPct > 0 && <div style={{ width: `${newPct}%`, background: "var(--accent)" }} title={`首次接觸: ${newPct}%`} />}
            {familiarPct > 0 && <div style={{ width: `${familiarPct}%`, background: "#94a3b8" }} title={`概念已知: ${familiarPct}%`} />}
            {expertPct > 0 && <div style={{ width: `${expertPct}%`, background: "#334155" }} title={`實務熟手: ${expertPct}%`} />}
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--ink)", fontFamily: "var(--mono)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--accent)", display: "inline-block" }} />
              首次接觸 {newPct}%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#94a3b8", display: "inline-block" }} />
              概念已知 {familiarPct}%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#334155", display: "inline-block" }} />
              實務熟手 {expertPct}%
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 01: Prior Knowledge Segmented Control */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <label style={{ font: "700 12px var(--mono)", color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              01 / 閱讀前對此主題的了解程度
            </label>
            <span style={{ font: "400 11px var(--mono)", color: "var(--muted)" }}>
              PRIOR KNOWLEDGE LEVEL
            </span>
          </div>

          {/* Sleek Segmented Switcher */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "6px",
              background: "var(--bg-subtle)",
              padding: "4px",
              borderRadius: "6px",
              border: "1px solid var(--rule)",
            }}
          >
            <button
              type="button"
              onClick={() => setPriorKnowledge("new_knowledge")}
              style={{
                background: priorKnowledge === "new_knowledge" ? "#ffffff" : "transparent",
                border: `1px solid ${priorKnowledge === "new_knowledge" ? "var(--rule)" : "transparent"}`,
                borderRadius: "4px",
                padding: "8px 10px",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: priorKnowledge === "new_knowledge" ? "var(--shadow-sm)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <div style={{ font: "700 12px var(--mono)", color: priorKnowledge === "new_knowledge" ? "var(--accent)" : "var(--ink)" }}>
                01 · 首次接觸
              </div>
              <div style={{ font: "400 11px var(--sans)", color: "var(--muted)", marginTop: "2px" }}>
                未接觸過此技術概念
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPriorKnowledge("familiar_surface")}
              style={{
                background: priorKnowledge === "familiar_surface" ? "#ffffff" : "transparent",
                border: `1px solid ${priorKnowledge === "familiar_surface" ? "var(--rule)" : "transparent"}`,
                borderRadius: "4px",
                padding: "8px 10px",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: priorKnowledge === "familiar_surface" ? "var(--shadow-sm)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <div style={{ font: "700 12px var(--mono)", color: priorKnowledge === "familiar_surface" ? "var(--accent)" : "var(--ink)" }}>
                02 · 概念已知
              </div>
              <div style={{ font: "400 11px var(--sans)", color: "var(--muted)", marginTop: "2px" }}>
                理解原理但未深入實踐
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPriorKnowledge("already_expert")}
              style={{
                background: priorKnowledge === "already_expert" ? "#ffffff" : "transparent",
                border: `1px solid ${priorKnowledge === "already_expert" ? "var(--rule)" : "transparent"}`,
                borderRadius: "4px",
                padding: "8px 10px",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: priorKnowledge === "already_expert" ? "var(--shadow-sm)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <div style={{ font: "700 12px var(--mono)", color: priorKnowledge === "already_expert" ? "var(--accent)" : "var(--ink)" }}>
                03 · 實務熟手
              </div>
              <div style={{ font: "400 11px var(--sans)", color: "var(--muted)", marginTop: "2px" }}>
                生產環境已有實踐經驗
              </div>
            </button>
          </div>
        </div>

        {/* Section 02: Scoring Dimensions */}
        <div style={{ marginBottom: "20px" }}>
          {renderSegmentedScore(depth, setDepth, "02", "技術深度", "TECHNICAL DEPTH", DEPTH_LABELS)}
          {renderSegmentedScore(clarity, setClarity, "03", "表達清晰度", "CLARITY & FLOW", CLARITY_LABELS)}
          {renderSegmentedScore(practicality, setPracticality, "04", "落地實用性", "PRACTICAL VALUE", PRACTICAL_LABELS)}
        </div>

        {/* Section 03: Text Feedback */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <label htmlFor="submission-feedback-text" style={{ font: "700 12px var(--mono)", color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              05 / 匿名建議與改進意見 (選填)
            </label>
            <span style={{ font: "400 11px var(--mono)", color: "var(--muted)" }}>
              CONSTRUCTIVE FEEDBACK
            </span>
          </div>
          <textarea
            id="submission-feedback-text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="給予投稿組員具體且具建設性的改進建議（匿名送出）..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--rule)",
              fontFamily: "var(--sans)",
              fontSize: "13px",
              lineHeight: "1.6",
              color: "var(--ink)",
              boxSizing: "border-box",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--rule)" }}>
          <span style={{ fontSize: "11.5px", fontFamily: "var(--mono)", color: message?.startsWith("✓") ? "var(--success)" : "var(--muted)" }}>
            {message || (hasRated ? "SAVED · 再次送出將自動覆蓋更新" : "ANONYMOUS · 依隨機 Token 去重")}
          </span>

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: "var(--ink)",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 18px",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "opacity 0.15s ease",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "SAVING..." : hasRated ? "UPDATE REVIEW" : "SUBMIT REVIEW"}
          </button>
        </div>
      </form>
    </div>
  );
}
