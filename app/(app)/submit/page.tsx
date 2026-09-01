"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TAGS } from "@/data/articles";
import {
  MARKDOWN_AI_PROMPT_TEMPLATE,
  SAMPLE_MARKDOWN,
  extractSummaryFromMarkdown,
} from "@/lib/content-markdown";
import { RichMarkdownRenderer } from "@/components/RichMarkdownRenderer";

export default function SubmitArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("攻克 Swift 6 嚴格並發：從編譯地獄到無競態架構的架構師避坑與重構指南");
  const [summary, setSummary] = useState("");
  const [authorAlias, setAuthorAlias] = useState("iOS 架構小組");
  const [selectedTags, setSelectedTags] = useState<string[]>(["ios", "engineering"]);
  const [content, setContent] = useState(SAMPLE_MARKDOWN);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (id: string) => {
    if (id === "all") return;
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(MARKDOWN_AI_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleSubmit = async (targetStatus: "reviewing" | "draft") => {
    if (!title.trim() || !content.trim()) {
      setError("請填寫文章標題與 Markdown 內容！");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          contentMarkdown: content.trim(),
          content: content.trim(), // backward compatibility
          authorAlias: authorAlias.trim() || "匿名組員",
          tags: selectedTags,
          status: targetStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "投稿失敗");
      }

      const data = await res.json();
      router.push(`/reviews/${data.submission.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "發生錯誤，請稍後再試。";
      setError(message);
      setSubmitting(false);
    }
  };

  const displaySummary = summary.trim() || extractSummaryFromMarkdown(content) || "（尚未填寫摘要，將於送出時自動抓取）";

  return (
    <main className="article-page">
      {/* Fixed Sub-Header with Mode Switching & Actions */}
      <header className="site-header">
        <Link className="brand" href="/">
          MOBILE <i>PULSE</i>
        </Link>

        {/* Center View Mode Switcher */}
        <div style={{ display: "flex", background: "var(--bg-subtle)", borderRadius: "6px", padding: "3px", border: "1px solid var(--rule)" }}>
          <button
            type="button"
            onClick={() => setMode("edit")}
            style={{
              background: mode === "edit" ? "#ffffff" : "transparent",
              border: "none",
              padding: "6px 16px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 700,
              color: mode === "edit" ? "var(--accent)" : "var(--muted)",
              cursor: "pointer",
              boxShadow: mode === "edit" ? "var(--shadow-sm)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            ✏️ 編輯 Markdown 與欄位
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            style={{
              background: mode === "preview" ? "#ffffff" : "transparent",
              border: "none",
              padding: "6px 16px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 700,
              color: mode === "preview" ? "var(--accent)" : "var(--muted)",
              cursor: "pointer",
              boxShadow: mode === "preview" ? "var(--shadow-sm)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            👁️ 全真文章預覽 (Full Layout)
          </button>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("draft")}
            style={{
              background: "transparent",
              border: "1px solid var(--rule)",
              color: "var(--ink)",
              padding: "7px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            存為草稿
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("reviewing")}
            style={{
              background: "var(--accent)",
              border: "none",
              color: "#ffffff",
              padding: "7px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {submitting ? "送出中..." : "送交同儕審評 🚀"}
          </button>
        </div>
      </header>

      {/* ── MODE 1: EDIT FORM ────────────────────────────────────────── */}
      {mode === "edit" && (
        <div className="article-shell" style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}>
          <article className="article-body" style={{ width: "100%", maxWidth: "100%" }}>
            <div className="article-intro" style={{ marginBottom: "20px" }}>
              <span className="eyebrow">投稿中心 / Markdown 編輯</span>
              <h1>投稿技術文章</h1>
              <p className="dek">
                採用統一 Markdown 與 MOBILE PULSE Shortcode 格式撰寫。點擊頂部「👁️ 全真文章預覽」可查看與正式發布 100% 一致的排版效果。
              </p>
            </div>

            {/* Prompt Copy Banner */}
            <div
              style={{
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent-border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ fontSize: "13.5px", color: "var(--ink)", display: "block" }}>
                  🤖 想要用 AI 產文？直接複製標準 Markdown Prompt
                </strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  將規範提供給 ChatGPT / Claude，讓 AI 自動產出符合全站 Shortcodes 的 Markdown 格式！
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPrompt}
                style={{
                  background: "var(--accent)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 14px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copiedPrompt ? "✓ 已複製 Prompt 到剪貼簿！" : "📋 複製 AI 產文 Prompt 規範"}
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: "var(--warn-subtle)",
                  border: "1px solid var(--warn-border)",
                  color: "var(--warn)",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "20px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Title */}
              <div>
                <label htmlFor="submit-title" style={{ display: "block", font: "700 13px var(--sans)", color: "var(--ink)", marginBottom: "6px" }}>
                  文章標題 *
                </label>
                <input
                  id="submit-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：Swift 6 Actor 隔離機制與並發安全實踐"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--rule)",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              {/* Summary */}
              <div>
                <label htmlFor="submit-summary" style={{ display: "block", font: "700 13px var(--sans)", color: "var(--ink)", marginBottom: "6px" }}>
                  1~2 句核心摘要 <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "12px" }}>（選填，留空將自動由 Markdown 第一段提取）</span>
                </label>
                <textarea
                  id="submit-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  placeholder="留空將自動抓取 Markdown 第一段文字作為審評大廳與首頁的預覽導讀..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--rule)",
                    fontSize: "14px",
                    color: "var(--ink)",
                    boxSizing: "border-box",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </div>

              {/* Author Alias & Tags */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label htmlFor="submit-author" style={{ display: "block", font: "700 13px var(--sans)", color: "var(--ink)", marginBottom: "6px" }}>
                    作者署名 / 匿名代號
                  </label>
                  <input
                    id="submit-author"
                    type="text"
                    value={authorAlias}
                    onChange={(e) => setAuthorAlias(e.target.value)}
                    placeholder="留空預設為『匿名組員』"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--rule)",
                      fontSize: "13.5px",
                      color: "var(--ink)",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <span style={{ display: "block", font: "700 13px var(--sans)", color: "var(--ink)", marginBottom: "6px" }}>
                    文章分類標籤
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {TAGS.filter((t) => t.id !== "all").map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          style={{
                            background: isSelected ? "var(--accent-subtle)" : "var(--bg-subtle)",
                            border: `1px solid ${isSelected ? "var(--accent-border)" : "var(--rule)"}`,
                            color: isSelected ? "var(--accent)" : "var(--muted)",
                            padding: "5px 10px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Markdown Textarea */}
              <div style={{ marginTop: "10px" }}>
                <label htmlFor="submit-content" style={{ display: "block", font: "700 13px var(--sans)", color: "var(--ink)", marginBottom: "6px" }}>
                  Markdown 文章內容 *
                </label>
                <textarea
                  id="submit-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  placeholder="請在此以 Markdown 格式撰寫文章內容，支援 :::terminal, :::compare, :::timeline, :::metric, :::callout, :::image 等短碼..."
                  style={{
                    width: "100%",
                    padding: "16px 18px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--rule)",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    color: "var(--ink)",
                    boxSizing: "border-box",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </article>
        </div>
      )}

      {/* ── MODE 2: FULL ARTICLE LIVE PREVIEW ────────────────────────── */}
      {mode === "preview" && (
        <div className="article-shell">
          <article className="article-body">
            {/* Live Article Intro Header */}
            <div className="article-intro">
              <span className="eyebrow">
                投稿全真預覽 · {selectedTags.join(" / ").toUpperCase()}
              </span>
              <h1>{title || "（尚未輸入文章標題）"}</h1>
              <p className="dek">{displaySummary}</p>
              <p className="article-date">
                <span>2026.08.20</span>
                <span>•</span>
                <span>8 MIN READ</span>
                <span>•</span>
                <span>{authorAlias || "匿名組員"}</span>
              </p>
              <div className="article-tags">
                {selectedTags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>

            {/* Live Rendered Markdown Article Body (Identical to Published Articles) */}
            <RichMarkdownRenderer content={content} />
          </article>

          {/* Right Sidebar Simulation */}
          <aside style={{ position: "sticky", top: "80px", height: "fit-content" }}>
            <div style={{ background: "#ffffff", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)", padding: "18px", boxShadow: "var(--shadow-sm)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                文章預覽資訊
              </span>
              <h4 style={{ margin: "6px 0 12px", fontSize: "14px", color: "var(--ink)" }}>
                全真版面檢查
              </h4>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.6", margin: "0 0 16px" }}>
                此畫面為讀者看到的 100% 真實 Markdown 與 Shortcode 排版效果。確認無誤後可直接點擊右上角「送交同儕審評」。
              </p>
              <button
                type="button"
                onClick={() => setMode("edit")}
                style={{
                  width: "100%",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--rule)",
                  color: "var(--accent)",
                  padding: "8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ← 返回修改 Markdown
              </button>
            </div>
          </aside>
        </div>
      )}

      <footer>
        <span>MOBILE PULSE</span>
        <p>整理訊號，留給真正要交付產品的人。</p>
      </footer>
    </main>
  );
}
