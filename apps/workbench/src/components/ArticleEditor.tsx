import React, { useState } from "react";
import type { Article, ArticleStatus, WorkflowColumn } from "@mobile-pulse/api-client";
import { Eye, Save, X } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  article: Partial<Article>;
  workflow: WorkflowColumn[];
  saving: boolean;
  onSave: (article: Partial<Article>) => Promise<void>;
  onClose: () => void;
}

export const ArticleEditor: React.FC<Props> = ({
  article: initialArticle,
  workflow,
  saving,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Partial<Article>>(initialArticle);
  const [previewOpen, setPreviewOpen] = useState(true);

  const handleChange = <K extends keyof Article>(
    field: K,
    value: Article[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;
    await onSave(formData);
  };

  return (
    <div className="article-editor" role="dialog" aria-modal="true">
      <form className="article-editor__surface" onSubmit={handleSubmit}>
        <header>
          <div>
            <p>ARTICLE STUDIO</p>
            <h2>{formData.id ? "編輯文章內容" : "撰寫新文章"}</h2>
          </div>
          <div>
            <button
              type="button"
              className={`editor-preview ${previewOpen ? "is-active" : ""}`}
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              <Eye size={15} />
              預覽視窗
            </button>
            <button
              type="submit"
              className="workspace-primary"
              disabled={saving || !formData.title?.trim()}
            >
              <Save size={15} />
              {saving ? "儲存中..." : "儲存文章"}
            </button>
            <button
              type="button"
              className="editor-close"
              onClick={onClose}
              title="關閉編輯器 (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className={`article-editor__body ${previewOpen ? "has-preview" : ""}`}>
          <div className="article-editor__fields">
            <div className="editor-grid">
              <label className="editor-field">
                文章標題
                <input
                  required
                  placeholder="請輸入文章標題..."
                  value={formData.title || ""}
                  onChange={(e) => handleChange("title", e.target.value)}
                />
              </label>

              <label className="editor-field">
                URL Slug
                <input
                  required
                  placeholder="article-slug"
                  value={formData.slug || ""}
                  onChange={(e) => handleChange("slug", e.target.value)}
                />
              </label>
            </div>

            <div className="editor-grid--three">
              <label className="editor-field">
                頂部小標 (Eyebrow)
                <input
                  placeholder="App 開發實務"
                  value={formData.eyebrow || ""}
                  onChange={(e) => handleChange("eyebrow", e.target.value)}
                />
              </label>

              <label className="editor-field">
                工作流程狀態
                <select
                  value={formData.status || "draft"}
                  onChange={(e) => handleChange("status", e.target.value as ArticleStatus)}
                >
                  {workflow.map((w) => (
                    <option key={w.status} value={w.status}>
                      {w.label} ({w.description})
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-field">
                預估閱讀時間
                <input
                  placeholder="5 MIN READ"
                  value={formData.readTime || ""}
                  onChange={(e) => handleChange("readTime", e.target.value)}
                />
              </label>
            </div>

            <label className="editor-field">
              內容摘要 (Summary)
              <textarea
                rows={3}
                placeholder="簡短描述這篇文章的核心價值與結論..."
                value={formData.summary || ""}
                onChange={(e) => handleChange("summary", e.target.value)}
              />
            </label>

            <label className="editor-field is-grow">
              Markdown 正文內容
              <textarea
                rows={12}
                placeholder="# 文章大綱&#10;&#10;從這裡開始撰寫正文..."
                value={formData.contentMarkdown || ""}
                onChange={(e) => handleChange("contentMarkdown", e.target.value)}
              />
            </label>
          </div>

          {previewOpen && (
            <div className="article-editor__preview">
              <p>{formData.eyebrow || "ARTICLE PREVIEW"}</p>
              <h1>{formData.title || "（文章標題預覽）"}</h1>
              <span>{formData.summary || "（文章摘要預覽）"}</span>
              <MarkdownRenderer content={formData.contentMarkdown || ""} />
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
