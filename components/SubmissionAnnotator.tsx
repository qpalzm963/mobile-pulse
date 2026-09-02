"use client";

import { useEffect, useRef, useState } from "react";
import { getOrCreateReviewerToken } from "../lib/reviewer-token";
import { RichMarkdownRenderer } from "./RichMarkdownRenderer";

export interface Annotation {
  id: number;
  submissionId: string | number;
  selectedText: string;
  textOffsetStart: number;
  textOffsetEnd: number;
  comment: string;
  status: "open" | "resolved";
  createdAt: string;
}

interface Props {
  /** Canonical review route identifier: a legacy numeric ID or a new submission slug. */
  submissionId: string | number;
  content: string;
  initialAnnotations: Annotation[];
}

export function SubmissionAnnotator({
  submissionId,
  content,
  initialAnnotations,
}: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [selectionRange, setSelectionRange] = useState<{
    text: string;
    x: number;
    y: number;
    targetType?: "text" | "block";
  } | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteComment, setNoteComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Detect text selection inside the article body and auto-dismiss on empty click
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // If clicking inside floating button or modal, do not clear
      const target = e.target as HTMLElement | null;
      if (target && (target.closest(".annotation-floating-btn") || target.closest(".annotation-modal-container"))) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (!showNoteModal) {
          setSelectionRange(null);
        }
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length < 2) {
        if (!showNoteModal) {
          setSelectionRange(null);
        }
        return;
      }

      // Check if selection is within our article content container
      if (!containerRef.current || !containerRef.current.contains(selection.anchorNode)) {
        if (!showNoteModal) {
          setSelectionRange(null);
        }
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectionRange({
        text: selectedText,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        targetType: "text",
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [showNoteModal]);

  // Global Escape key to dismiss tooltip and modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNoteModal(false);
        setSelectionRange(null);
        setNoteComment("");
        window.getSelection()?.removeAllRanges();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Draggable logic for the floating panel header
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const panelWidth = 320;
      const panelHeight = 480;

      const newX = Math.min(Math.max(dragStartRef.current.startX + dx, 16), window.innerWidth - panelWidth - 16);
      const newY = Math.min(Math.max(dragStartRef.current.startY + dy, 16), window.innerHeight - panelHeight - 16);

      setPanelPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    // Only drag from header, ignore buttons
    if ((e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).closest("button")) {
      return;
    }

    const panelEl = panelRef.current;
    if (!panelEl) return;

    const rect = panelEl.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };
    setIsDragging(true);
  };

  const handleCreateAnnotation = async () => {
    if (!selectionRange || !noteComment.trim()) return;

    setIsSubmitting(true);
    const reviewerToken = getOrCreateReviewerToken();

    try {
      const res = await fetch(`/api/submissions/${submissionId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerToken,
          selectedText: selectionRange.text,
          textOffsetStart: 0,
          textOffsetEnd: 0,
          comment: noteComment.trim(),
        }),
      });

      if (!res.ok) throw new Error("新增備註失敗");

      const data = await res.json();
      setAnnotations((prev) => [...prev, data.annotation]);
      setShowNoteModal(false);
      setNoteComment("");
      setSelectionRange(null);
      setIsSidebarOpen(true);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error(err);
      alert("儲存備註時發生錯誤，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleResolve = async (annotationId: number, currentStatus: "open" | "resolved") => {
    const nextStatus = currentStatus === "open" ? "resolved" : "open";
    try {
      const res = await fetch(`/api/submissions/${submissionId}/annotations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annotationId,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annotationId ? { ...a, status: nextStatus } : a))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScrollToText = (text: string, id: number) => {
    setActiveAnnotationId(id);
    if (!containerRef.current) return;

    // Search for element containing the snippet
    const elements = containerRef.current.querySelectorAll("p, h2, h3, pre, blockquote, div, span");
    for (const el of Array.from(elements)) {
      if (el.textContent && el.textContent.includes(text.slice(0, 30))) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("annotation-highlight-pulse");
        setTimeout(() => el.classList.remove("annotation-highlight-pulse"), 2000);
        break;
      }
    }
  };

  const openCount = annotations.filter((a) => a.status === "open").length;

  return (
    <div style={{ position: "relative", width: "100%", margin: "24px 0" }}>
      {/* 100% Full-Scale Article Content (No horizontal squeezing!) */}
      <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
        {/* Subtle Tip Bar */}
        <div
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            fontFamily: "var(--mono)",
            color: "var(--muted)",
          }}
        >
          <span>TIP · 滑鼠反白選取文字即可即時新增審評建議（點擊背景或 Esc 即可取消）</span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontFamily: "var(--mono)",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isSidebarOpen ? "收起懸浮備註" : `展開審評備註 (${openCount} 則待處理)`}
          </button>
        </div>

        <div className="submission-content-body" style={{ width: "100%" }}>
          <RichMarkdownRenderer content={content} />
        </div>

        {/* Floating Tooltip Button near text selection */}
        {selectionRange && !showNoteModal && (
          <button
            type="button"
            className="annotation-floating-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowNoteModal(true);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowNoteModal(true);
            }}
            style={{
              position: "fixed",
              left: `${selectionRange.x}px`,
              top: `${selectionRange.y}px`,
              transform: "translate(-50%, -100%)",
              zIndex: 9999,
              background: "var(--ink)",
              color: "#ffffff",
              border: "1px solid #334155",
              padding: "6px 14px",
              borderRadius: "20px",
              boxShadow: "var(--shadow-md)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            <span>+</span>
            <span>標註選取文字</span>
          </button>
        )}

        {/* Floating Modal for Note Input + Transparent Backdrop */}
        {showNoteModal && selectionRange && (
          <>
            {/* Backdrop: Clicking outside modal dismisses it immediately */}
            <div
              onClick={() => {
                setShowNoteModal(false);
                setNoteComment("");
                setSelectionRange(null);
                window.getSelection()?.removeAllRanges();
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
                background: "transparent",
              }}
            />

            <div
              className="annotation-modal-container"
              style={{
                position: "fixed",
                left: `${Math.min(Math.max(selectionRange.x, 180), window.innerWidth - 180)}px`,
                top: `${Math.min(selectionRange.y + 16, window.innerHeight - 240)}px`,
                transform: "translate(-50%, 0)",
                zIndex: 10000,
                background: "#ffffff",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                width: "320px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ font: "700 11px var(--mono)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  NEW ANNOTATION
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteComment("");
                    setSelectionRange(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "14px", padding: 0 }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: "var(--bg-subtle)",
                  borderLeft: "2px solid var(--accent)",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontFamily: "var(--sans)",
                  color: "var(--muted)",
                  marginBottom: "10px",
                  maxHeight: "54px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: "1.5",
                }}
              >
                &ldquo;{selectionRange.text}&rdquo;
              </div>

              <textarea
                value={noteComment}
                onChange={(e) => setNoteComment(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    handleCreateAnnotation();
                  }
                }}
                placeholder="輸入具體的修改建議或指正（Cmd+Enter 送出）..."
                rows={3}
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  border: "1px solid var(--rule)",
                  fontFamily: "var(--sans)",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  color: "var(--ink)",
                  boxSizing: "border-box",
                  resize: "none",
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                <span style={{ font: "400 10.5px var(--mono)", color: "var(--muted)" }}>
                  ANONYMOUS
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteModal(false);
                      setNoteComment("");
                      setSelectionRange(null);
                      window.getSelection()?.removeAllRanges();
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !noteComment.trim()}
                    onClick={handleCreateAnnotation}
                    style={{
                      background: "var(--ink)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "5px 12px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: isSubmitting || !noteComment.trim() ? 0.5 : 1,
                    }}
                  >
                    {isSubmitting ? "儲存中..." : "新增備註"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── FLOATING ANNOTATIONS DOCK / OVERLAY DRAWER ────────────────── */}

      {/* Floating Trigger Pill (When Collapsed) */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 8500,
            background: "var(--ink)",
            color: "#ffffff",
            border: "1px solid #334155",
            borderRadius: "30px",
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: "12.5px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: openCount > 0 ? "var(--accent)" : "#94a3b8" }} />
          <span>審評備註 ({annotations.length})</span>
          {openCount > 0 && (
            <span style={{ background: "var(--accent)", color: "#ffffff", padding: "1px 6px", borderRadius: "10px", fontSize: "11px" }}>
              {openCount} OPEN
            </span>
          )}
        </button>
      )}

      {/* Draggable Floating Panel (When Expanded) */}
      {isSidebarOpen && (
        <aside
          ref={panelRef}
          style={{
            position: "fixed",
            left: panelPos ? `${panelPos.x}px` : "auto",
            top: panelPos ? `${panelPos.y}px` : "auto",
            right: panelPos ? "auto" : "24px",
            bottom: panelPos ? "auto" : "24px",
            width: "320px",
            maxHeight: "min(560px, calc(100vh - 80px))",
            zIndex: 8500,
            background: "#ffffff",
            border: `1px solid ${isDragging ? "var(--accent)" : "var(--rule)"}`,
            borderRadius: "var(--radius-lg)",
            boxShadow: isDragging ? "0 24px 60px rgba(0, 0, 0, 0.28)" : "0 16px 40px rgba(0, 0, 0, 0.16)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: isDragging ? "none" : "auto",
            transition: isDragging ? "none" : "box-shadow 0.15s ease",
          }}
        >
          {/* Draggable Header */}
          <div
            onMouseDown={handleDragStart}
            style={{
              padding: "12px 16px",
              background: isDragging ? "var(--accent-subtle)" : "var(--bg-subtle)",
              borderBottom: "1px solid var(--rule)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: isDragging ? "grabbing" : "grab",
              transition: "background 0.15s ease",
            }}
            title="點擊並按住可任意拖曳視窗位置"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1", userSelect: "none" }}>
                ⠿
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ font: "700 12px var(--mono)", color: "var(--ink)", textTransform: "uppercase" }}>
                  審評備註 ({annotations.length})
                </span>
                <span style={{ font: "500 11px var(--mono)", color: "var(--accent)" }}>
                  {openCount} OPEN
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              title="最小化懸浮窗"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                fontSize: "14px",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              ✕
            </button>
          </div>

          {/* List Content */}
          <div style={{ padding: "12px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
            {annotations.length === 0 ? (
              <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--muted)", fontSize: "12.5px", lineHeight: "1.6" }}>
                尚無審評備註。<br />
                反白選取文章任意文字即可新增意見。
              </div>
            ) : (
              annotations.map((ann) => {
                const isOpen = ann.status === "open";
                const isActive = activeAnnotationId === ann.id;

                return (
                  <div
                    key={ann.id}
                    onClick={() => handleScrollToText(ann.selectedText, ann.id)}
                    style={{
                      background: isActive ? "var(--accent-subtle)" : isOpen ? "#ffffff" : "var(--bg-subtle)",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--rule-light)"}`,
                      borderRadius: "6px",
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      opacity: isOpen ? 1 : 0.65,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span
                        style={{
                          font: "700 10px var(--mono)",
                          color: isOpen ? "var(--accent)" : "var(--muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {isOpen ? "OPEN" : "RESOLVED"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleResolve(ann.id, ann.status);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--muted)",
                          fontSize: "11px",
                          fontFamily: "var(--mono)",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {isOpen ? "標為已解決" : "重新開啟"}
                      </button>
                    </div>

                    {/* Quoted Text */}
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "var(--muted)",
                        borderLeft: "2px solid var(--rule)",
                        paddingLeft: "6px",
                        margin: "4px 0 6px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      &ldquo;{ann.selectedText}&rdquo;
                    </div>

                    {/* Comment Content */}
                    <p style={{ margin: 0, fontSize: "12.5px", color: "var(--ink)", lineHeight: "1.5" }}>
                      {ann.comment}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
