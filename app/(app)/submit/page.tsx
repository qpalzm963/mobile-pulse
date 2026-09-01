"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { TAGS } from "@/data/articles";
import {
  MARKDOWN_AI_PROMPT_TEMPLATE,
  SAMPLE_MARKDOWN,
  extractSummaryFromMarkdown,
  insertTextAtCursor,
} from "@/lib/content-markdown";
import { RichMarkdownRenderer } from "@/components/RichMarkdownRenderer";

export default function SubmitArticlePage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("攻克 Swift 6 嚴格並發：從編譯地獄到無競態架構的架構師避坑與重構指南");
  const [summary, setSummary] = useState("");
  const [authorAlias, setAuthorAlias] = useState("iOS 架構小組");
  const [selectedTags, setSelectedTags] = useState<string[]>(["ios", "engineering"]);
  const [content, setContent] = useState(SAMPLE_MARKDOWN);
  const [coverImageId, setCoverImageId] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image Upload Modal States
  const [showImageModal, setShowImageModal] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [modalUploadError, setModalUploadError] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageAltInput, setImageAltInput] = useState("");
  const [imageCaptionInput, setImageCaptionInput] = useState("");
  const [imageSizeInput, setImageSizeInput] = useState<"small" | "normal" | "wide" | "full">("normal");
  const [isCoverModal, setIsCoverModal] = useState(false);
  const [savedSelection, setSavedSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

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

  const handleOpenImageModal = (asCover: boolean = false) => {
    setIsCoverModal(asCover);
    if (!asCover && textareaRef.current) {
      setSavedSelection({
        start: textareaRef.current.selectionStart ?? content.length,
        end: textareaRef.current.selectionEnd ?? content.length,
      });
    }
    setSelectedImageFile(null);
    setImageAltInput("");
    setImageCaptionInput("");
    setImageSizeInput("normal");
    setModalUploadError(null);
    setShowImageModal(true);
  };

  const handleUploadImage = async () => {
    if (!selectedImageFile) {
      setModalUploadError("請先選擇要上傳的圖片檔案！");
      return;
    }

    setIsUploadingImage(true);
    setModalUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedImageFile);
      formData.append("alt", imageAltInput.trim() || selectedImageFile.name.replace(/\.[^/.]+$/, ""));
      if (imageCaptionInput.trim()) {
        formData.append("caption", imageCaptionInput.trim());
      }

      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "圖片上傳失敗");
      }

      const media = data.media;

      if (isCoverModal) {
        // Set Cover Image
        setCoverImageId(media.id);
        setCoverImageUrl(media.url);
      } else {
        // Insert Shortcode into Markdown content at cursor position
        const captionAttr = media.caption ? ` caption="${media.caption}"` : "";
        const sizeAttr = imageSizeInput !== "normal" ? ` size="${imageSizeInput}"` : "";
        const shortcode = `:::image id="${media.id}" alt="${media.alt}"${captionAttr}${sizeAttr} :::`;
        
        const { newText, newCursorPos } = insertTextAtCursor(
          content,
          shortcode,
          savedSelection.start,
          savedSelection.end
        );
        setContent(newText);

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 50);
      }

      setShowImageModal(false);
      setSelectedImageFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "上傳失敗，請檢查檔案格式與大小。";
      setModalUploadError(msg);
    } finally {
      setIsUploadingImage(false);
    }
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
          coverImageId: coverImageId || undefined,
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

              {/* Cover Image Uploader */}
              <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--rule)", borderRadius: "var(--radius-sm)", padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span style={{ font: "700 13px var(--sans)", color: "var(--ink)", display: "block" }}>
                      文章封面圖 (Cover Image)
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {coverImageId ? `已設定封面 [Media ID: ${coverImageId}]` : "選填，用於首頁卡片、文章頂部大圖與社群分享"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenImageModal(true)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid var(--rule)",
                        color: "var(--ink)",
                        padding: "6px 14px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {coverImageId ? "🔄 更換封面圖" : "🖼️ 上傳封面圖"}
                    </button>
                    {coverImageId && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageId("");
                          setCoverImageUrl("");
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        移除
                      </button>
                    )}
                  </div>
                </div>
                {coverImageUrl && (
                  <div style={{ marginTop: "12px" }}>
                    <img
                      src={coverImageUrl}
                      alt="封面預覽"
                      style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "6px", border: "1px solid var(--rule)" }}
                    />
                  </div>
                )}
              </div>

              {/* Markdown Editor & Image Insertion Toolbar */}
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label htmlFor="submit-content" style={{ font: "700 13px var(--sans)", color: "var(--ink)" }}>
                    Markdown 文章內容 *
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenImageModal(false)}
                      style={{
                        background: "var(--accent-subtle)",
                        border: "1px solid var(--accent-border)",
                        color: "var(--accent)",
                        padding: "5px 12px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      🖼️ 插入圖片 Shortcode
                    </button>
                  </div>
                </div>

                <textarea
                  id="submit-content"
                  ref={textareaRef}
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

            {/* ── Image Upload Modal ────────────────────────────────────── */}
            {showImageModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(15, 23, 42, 0.6)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--rule)",
                    boxShadow: "var(--shadow-lg)",
                    width: "100%",
                    maxWidth: "520px",
                    padding: "28px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "17px", color: "var(--ink)" }}>
                      {isCoverModal ? "🖼️ 上傳文章封面圖" : "🖼️ 上傳並插入圖片 Shortcode"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowImageModal(false)}
                      style={{ background: "transparent", border: "none", fontSize: "16px", cursor: "pointer", color: "var(--muted)" }}
                    >
                      ✕
                    </button>
                  </div>

                  {modalUploadError && (
                    <div
                      style={{
                        background: "var(--warn-subtle)",
                        border: "1px solid var(--warn-border)",
                        color: "var(--warn)",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "13px",
                        marginBottom: "16px",
                      }}
                    >
                      ⚠️ {modalUploadError}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* File Input */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px" }}>
                        選擇圖片檔案 * (PNG, JPEG, WebP, GIF, SVG - 上限 10MB)
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedImageFile(file);
                          if (file && !imageAltInput) {
                            setImageAltInput(file.name.replace(/\.[^/.]+$/, ""));
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px dashed var(--rule)",
                          background: "var(--bg-subtle)",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    {/* Alt Input */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px" }}>
                        無障礙替代文字 (Alt Text) *
                      </label>
                      <input
                        type="text"
                        value={imageAltInput}
                        onChange={(e) => setImageAltInput(e.target.value)}
                        placeholder="例如：Swift 6 靜態記憶體隔離架構圖"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--rule)",
                          fontSize: "13.5px",
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Caption Input */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px" }}>
                        圖片下方說明 (Caption，選填)
                      </label>
                      <input
                        type="text"
                        value={imageCaptionInput}
                        onChange={(e) => setImageCaptionInput(e.target.value)}
                        placeholder="例如：圖 1：隔離邊界示意"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--rule)",
                          fontSize: "13.5px",
                          outline: "none",
                        }}
                      />
                    </div>

                    {!isCoverModal && (
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px" }}>
                          圖片顯示寬度 (Size Preset)
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                          {(["small", "normal", "wide", "full"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setImageSizeInput(s)}
                              style={{
                                padding: "6px 8px",
                                borderRadius: "4px",
                                border: `1px solid ${imageSizeInput === s ? "var(--accent)" : "var(--rule)"}`,
                                background: imageSizeInput === s ? "var(--accent-subtle)" : "var(--bg-subtle)",
                                color: imageSizeInput === s ? "var(--accent)" : "var(--ink)",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                textTransform: "capitalize",
                              }}
                            >
                              {s === "small" ? "小 (420px)" : s === "normal" ? "標準 (680px)" : s === "wide" ? "寬 (900px)" : "全寬 (100%)"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                    <button
                      type="button"
                      onClick={() => setShowImageModal(false)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--rule)",
                        background: "transparent",
                        color: "var(--muted)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingImage || !selectedImageFile}
                      onClick={handleUploadImage}
                      style={{
                        padding: "8px 20px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background: "var(--accent)",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: isUploadingImage || !selectedImageFile ? "not-allowed" : "pointer",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      {isUploadingImage ? "上傳中..." : isCoverModal ? "確認設定為封面" : "上傳並插入 Shortcode 🚀"}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              {coverImageUrl && (
                <div style={{ marginTop: "20px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--rule)" }}>
                  <img src={coverImageUrl} alt="文章封面" style={{ width: "100%", maxHeight: "380px", objectFit: "cover", display: "block" }} />
                </div>
              )}
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
