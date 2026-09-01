"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { A2uiLandscapeTable } from "./A2uiLandscapeTable";
import { A2uiTrace } from "./A2uiTrace";
import { AgentSandboxInteractive } from "./AgentSandboxInteractive";
import { BrunoVsCloudComparison } from "./BrunoVsCloudComparison";
import { BrunoWorkflowDiagram } from "./BrunoWorkflowDiagram";
import { FlutterConceptMap } from "./FlutterConceptMap";
import { GenUiArchitectureInteractive } from "./GenUiArchitectureInteractive";
import { XPostCard } from "./XPostCard";

interface Props {
  content: string;
}

// Registry for dynamic interactive components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  AgentSandboxInteractive,
  BrunoVsCloudComparison,
  BrunoWorkflowDiagram,
  A2uiLandscapeTable,
  A2uiTrace,
  GenUiArchitectureInteractive,
  FlutterConceptMap,
  XPostCard,
};

export function RichMarkdownRenderer({ content }: Props) {
  if (!content) return null;

  // Migration & backward compatibility: If content is pure legacy HTML without markdown structures
  const isPureLegacyHtml =
    (content.trim().startsWith("<div") ||
      content.trim().startsWith("<p class=") ||
      content.trim().startsWith("<article")) &&
    !content.includes("```") &&
    !content.includes(":::") &&
    !/^#{1,6}\s/m.test(content);

  if (isPureLegacyHtml) {
    return (
      <div
        className="rich-html-container article-rendered-html"
        style={{ fontSize: "16px", lineHeight: "1.8", color: "var(--ink-body)" }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  const blocks = splitContentIntoBlocks(content);

  return (
    <div className="rich-markdown-container" style={{ fontSize: "16px", lineHeight: "1.8", color: "var(--ink-body)" }}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

interface Block {
  type:
    | "heading"
    | "paragraph"
    | "code"
    | "blockquote"
    | "ul"
    | "ol"
    | "hr"
    | "terminal"
    | "compare"
    | "timeline"
    | "metric"
    | "callout"
    | "image"
    | "interactive";
  level?: number;
  raw: string;
  meta?: Record<string, string>;
  lines?: string[];
  items?: string[];
}

function splitContentIntoBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Shortcode blocks: :::shortcode [params] ... ::: or single-line :::shortcode [params] :::
    if (trimmed.startsWith(":::")) {
      // Check for single-line shortcode: :::tag params :::
      const singleLineMatch = trimmed.match(/^:::([a-zA-Z0-9_-]+)(?:\s+(.*?))?(?:\s*:::)$/);
      if (singleLineMatch && trimmed !== ":::") {
        const typeName = singleLineMatch[1].toLowerCase();
        const rawParams = singleLineMatch[2] || "";
        const meta = parseShortcodeParams(rawParams);
        blocks.push({
          type: typeName as Block["type"],
          raw: "",
          meta,
          lines: [],
        });
        i++;
        continue;
      }

      // Multiline shortcode block: :::tag params \n ... \n :::
      const openMatch = trimmed.match(/^:::([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
      if (openMatch) {
        const typeName = openMatch[1].toLowerCase();
        let rawParams = openMatch[2] || "";
        if (rawParams.endsWith(":::")) {
          rawParams = rawParams.slice(0, -3).trim();
        }
        const meta = parseShortcodeParams(rawParams);
        const blockLines: string[] = [];

        i++;
        while (i < lines.length && !lines[i].trim().startsWith(":::")) {
          blockLines.push(lines[i]);
          i++;
        }
        if (i < lines.length && lines[i].trim().startsWith(":::")) {
          i++; // skip closing :::
        }

        blocks.push({
          type: typeName as Block["type"],
          raw: blockLines.join("\n"),
          meta,
          lines: blockLines,
        });
        continue;
      }
    }

    // 2. Fenced code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++;
      }
      blocks.push({
        type: "code",
        raw: codeLines.join("\n"),
        meta: { lang },
      });
      continue;
    }

    // 3. Headings
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "heading", level: 1, raw: trimmed.replace(/^#\s+/, "") });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, raw: trimmed.replace(/^##\s+/, "") });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, raw: trimmed.replace(/^###\s+/, "") });
      i++;
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      blocks.push({ type: "heading", level: 4, raw: trimmed.replace(/^####\s+/, "") });
      i++;
      continue;
    }

    // 4. Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr", raw: trimmed });
      i++;
      continue;
    }

    // 5. Blockquote
    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [trimmed.replace(/^>\s*/, "")];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", raw: quoteLines.join("\n") });
      continue;
    }

    // 6. Unordered List (- or *)
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [trimmed.replace(/^[-*+]\s+/, "")];
      i++;
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", raw: "", items });
      continue;
    }

    // 7. Ordered List (1. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [trimmed.replace(/^\d+\.\s+/, "")];
      i++;
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", raw: "", items });
      continue;
    }

    // 8. Standard paragraph (accumulate until blank line or special block)
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith(":::") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("> ") &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", raw: paraLines.join(" ") });
  }

  return blocks;
}

function parseShortcodeParams(paramStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match;
  while ((match = regex.exec(paramStr)) !== null) {
    const key = match[1];
    const val = match[2] ?? match[3] ?? match[4] ?? "";
    result[key] = val;
  }
  return result;
}

/**
 * Parses inline Markdown: bold, italic, code, links, images
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline markdown tokens
  // Matches:
  // 1. ![alt](url)
  // 2. [text](url)
  // 3. `code`
  // 4. **bold** or __bold__
  // 5. *italic* or _italic_
  const parts: React.ReactNode[] = [];
  const regex = /(!?\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  let keyIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const token = match[0];
    const index = match.index;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    if (token.startsWith("![") && token.includes("](") && token.endsWith(")")) {
      const altMatch = token.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (altMatch) {
        parts.push(
          <img
            key={`img-${keyIndex++}`}
            src={altMatch[2]}
            alt={altMatch[1]}
            style={{ maxWidth: "100%", borderRadius: "6px", display: "inline-block" }}
          />
        );
      }
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={`link-${keyIndex++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`code-${keyIndex++}`}
          style={{
            fontFamily: "var(--mono)",
            background: "var(--bg-subtle)",
            border: "1px solid var(--rule)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "0.88em",
            color: "var(--ink)",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      parts.push(<strong key={`b-${keyIndex++}`}>{token.slice(2, -2)}</strong>);
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      parts.push(<em key={`i-${keyIndex++}`}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(token);
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

function renderBlock(block: Block, index: number): React.ReactNode {
  switch (block.type) {
    case "heading": {
      if (block.level === 1)
        return (
          <h1 key={index} style={{ margin: "36px 0 16px", color: "var(--ink)", fontSize: "28px" }}>
            {renderInline(block.raw)}
          </h1>
        );
      if (block.level === 2)
        return (
          <h2
            key={index}
            style={{
              margin: "36px 0 16px",
              color: "var(--ink)",
              fontSize: "22px",
              borderBottom: "1px solid var(--rule)",
              paddingBottom: "8px",
            }}
          >
            {renderInline(block.raw)}
          </h2>
        );
      if (block.level === 3)
        return (
          <h3 key={index} style={{ margin: "28px 0 12px", color: "var(--ink)", fontSize: "18px" }}>
            {renderInline(block.raw)}
          </h3>
        );
      return (
        <h4 key={index} style={{ margin: "20px 0 10px", color: "var(--ink)", fontSize: "16px" }}>
          {renderInline(block.raw)}
        </h4>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={index}
          style={{
            borderLeft: "3px solid var(--accent)",
            background: "var(--accent-subtle)",
            padding: "14px 18px",
            margin: "24px 0",
            borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            color: "var(--ink)",
          }}
        >
          <p style={{ margin: 0, fontSize: "15px", fontStyle: "italic", lineHeight: "1.7" }}>
            {renderInline(block.raw)}
          </p>
        </blockquote>
      );

    case "ul":
      return (
        <ul key={index} style={{ margin: "16px 0 20px", paddingLeft: "24px", lineHeight: "1.8" }}>
          {block.items?.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "6px" }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol key={index} style={{ margin: "16px 0 20px", paddingLeft: "24px", lineHeight: "1.8" }}>
          {block.items?.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "6px" }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );

    case "hr":
      return (
        <hr
          key={index}
          style={{
            margin: "32px 0",
            border: "none",
            borderTop: "1px solid var(--rule)",
          }}
        />
      );

    case "code": {
      const lang = block.meta?.lang;
      return (
        <div key={index} style={{ margin: "24px 0" }}>
          {lang && (
            <div
              style={{
                background: "#1e293b",
                color: "#94a3b8",
                padding: "4px 14px",
                fontSize: "11px",
                fontFamily: "var(--mono)",
                borderTopLeftRadius: "var(--radius-sm)",
                borderTopRightRadius: "var(--radius-sm)",
                display: "inline-block",
                textTransform: "uppercase",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            style={{
              background: "#0f172a",
              color: "#f8fafc",
              padding: "16px 20px",
              borderRadius: lang ? "0 var(--radius-sm) var(--radius-sm) var(--radius-sm)" : "var(--radius-sm)",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              lineHeight: "1.6",
              overflowX: "auto",
              margin: 0,
            }}
          >
            <code>{block.raw}</code>
          </pre>
        </div>
      );
    }

    // ── 短碼 1: 終端機區塊 (:::terminal) ──────────────────────────────
    case "terminal": {
      const title = block.meta?.title || "bash";
      return (
        <div
          key={index}
          style={{
            margin: "24px 0",
            background: "#090d16",
            borderRadius: "8px",
            border: "1px solid #1e293b",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0f172a",
              padding: "8px 14px",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            </div>
            <span style={{ color: "#94a3b8", fontSize: "11.5px", fontFamily: "var(--mono)" }}>{title}</span>
            <span style={{ color: "#64748b", fontSize: "10px", fontFamily: "var(--mono)" }}>TERMINAL</span>
          </div>
          <pre style={{ margin: 0, padding: "16px 18px", color: "#38bdf8", fontFamily: "var(--mono)", fontSize: "13px", lineHeight: "1.7", overflowX: "auto" }}>
            <code>{block.raw}</code>
          </pre>
        </div>
      );
    }

    // ── 短碼 2: 左右技術對比卡 (:::compare) ──────────────────────────────
    case "compare": {
      const beforeTitle = block.meta?.before || "Before (傳統做法)";
      const afterTitle = block.meta?.after || "After (推薦實務)";

      const lines = block.lines || [];
      const beforeLines: string[] = [];
      const afterLines: string[] = [];

      lines.forEach((l) => {
        const parts = l.split("|");
        if (parts.length >= 2) {
          beforeLines.push(parts[0].trim());
          afterLines.push(parts[1].trim());
        } else {
          beforeLines.push(l);
        }
      });

      return (
        <div
          key={index}
          style={{
            margin: "24px 0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {/* Before Column */}
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "16px" }}>
            <span style={{ font: "700 12px var(--mono)", color: "#dc2626", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              ✕ {beforeTitle}
            </span>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13.5px", color: "#991b1b", lineHeight: "1.6" }}>
              {beforeLines.map((line, liIdx) => (
                <li key={liIdx}>{renderInline(line.replace(/^-\s*/, ""))}</li>
              ))}
            </ul>
          </div>

          {/* After Column */}
          <div style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)", borderRadius: "8px", padding: "16px" }}>
            <span style={{ font: "700 12px var(--mono)", color: "var(--accent)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              ✓ {afterTitle}
            </span>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13.5px", color: "var(--ink)", lineHeight: "1.6" }}>
              {afterLines.map((line, liIdx) => (
                <li key={liIdx}>{renderInline(line.replace(/^\+\s*/, ""))}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    // ── 短碼 3: 步驟時間軸 (:::timeline) ──────────────────────────────
    case "timeline": {
      const items = (block.lines || []).filter((l) => l.trim());
      return (
        <div key={index} style={{ margin: "24px 0", paddingLeft: "12px", borderLeft: "2px solid var(--accent-border)" }}>
          {items.map((item, idx) => {
            const parts = item.split("::");
            const stepTitle = parts[0]?.replace(/^[-*+]\s*/, "").trim();
            const stepDesc = parts[1]?.trim() || "";
            return (
              <div key={idx} style={{ position: "relative", marginBottom: "16px", paddingLeft: "20px" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "-27px",
                    top: "4px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: "0 0 0 3px #ffffff, 0 0 0 5px var(--accent-subtle)",
                  }}
                />
                <strong style={{ fontSize: "14.5px", color: "var(--ink)", display: "block" }}>
                  {renderInline(stepTitle)}
                </strong>
                {stepDesc && (
                  <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "var(--muted)" }}>
                    {renderInline(stepDesc)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // ── 短碼 4: 數據指標卡 (:::metric) ──────────────────────────────
    case "metric": {
      const value = block.meta?.value || "100%";
      const label = block.meta?.label || "指標說明";
      const trend = block.meta?.trend;
      return (
        <div
          key={index}
          style={{
            margin: "20px 0",
            background: "#ffffff",
            border: "1px solid var(--rule)",
            borderRadius: "8px",
            padding: "16px 20px",
            display: "inline-flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ font: "800 32px var(--display)", color: "var(--accent)", lineHeight: "1" }}>{value}</span>
            {trend === "up" && <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "14px" }}>↑</span>}
            {trend === "down" && <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "14px" }}>↓</span>}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>{label}</span>
        </div>
      );
    }

    // ── 短碼 5: 提示 Callout (:::callout) ──────────────────────────────
    case "callout": {
      const type = block.meta?.type || "info";
      const borderColor =
        type === "danger" ? "#dc2626" : type === "warn" ? "#d97706" : type === "tip" ? "var(--success, #16a34a)" : "var(--accent)";
      const bg =
        type === "danger" ? "#fef2f2" : type === "warn" ? "#fffbeb" : type === "tip" ? "#f0fdf4" : "var(--accent-subtle)";
      return (
        <div
          key={index}
          style={{
            margin: "20px 0",
            background: bg,
            borderLeft: `4px solid ${borderColor}`,
            padding: "12px 18px",
            borderRadius: "0 6px 6px 0",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)", lineHeight: "1.7" }}>
            {renderInline(block.raw)}
          </p>
        </div>
      );
    }

    // ── 短碼 6: 圖片插圖 (:::image) ──────────────────────────────
    case "image": {
      const src = block.meta?.src || (block.meta?.id ? `/api/media/${block.meta.id}` : "");
      const alt = block.meta?.alt || block.meta?.caption || "文章插圖";
      const caption = block.meta?.caption;
      const width = block.meta?.width || "100%";

      return (
        <figure
          key={index}
          style={{
            margin: "28px 0",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: width,
                maxHeight: "520px",
                objectFit: "contain",
                borderRadius: "8px",
                border: "1px solid var(--rule)",
                boxShadow: "var(--shadow-sm)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "36px 20px",
                background: "var(--bg-subtle)",
                border: "1px dashed var(--rule)",
                borderRadius: "8px",
                color: "var(--muted)",
                fontSize: "13px",
              }}
            >
              🖼️ [圖片 ID: {block.meta?.id || "未指定"}] {alt}
            </div>
          )}
          {caption && (
            <figcaption
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "var(--muted)",
                fontStyle: "italic",
                lineHeight: "1.5",
              }}
            >
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    // ── 短碼 7: 動態 React 元件掛載 (:::interactive) ──────────────────────────────
    case "interactive": {
      const name = block.meta?.name || "";
      const Component = COMPONENT_REGISTRY[name];
      if (Component) {
        return <Component key={index} />;
      }
      return (
        <div key={index} style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "4px", fontSize: "12px", color: "var(--muted)" }}>
          ⚠️ 未註冊的互動元件：{name}
        </div>
      );
    }

    // 預設段落
    default:
      return (
        <p key={index} style={{ margin: "0 0 18px", fontSize: "16px", lineHeight: "1.8", color: "var(--ink-body)" }}>
          {renderInline(block.raw)}
        </p>
      );
  }
}
