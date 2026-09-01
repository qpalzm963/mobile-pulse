"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  ExternalLink,
  FilePlus2,
  GripVertical,
  LayoutDashboard,
  LayoutList,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { RichMarkdownRenderer } from "../RichMarkdownRenderer";

type ArticleStatus = "idea" | "draft" | "review" | "published";
type WorkspaceView = "board" | "library" | "analytics" | "draft";

interface Tag { id: string | number; tagId: string; name: string; }
interface ArticleStats { views: number; useful: number; notUseful: number; usefulRate: number | null; }
interface Article {
  id: string | number;
  title: string;
  slug: string;
  summary: string;
  eyebrow?: string;
  status: ArticleStatus;
  contentMarkdown?: string;
  author?: string;
  readTime?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: Array<Tag | string | number>;
  stats?: ArticleStats;
}
interface Props { initialArticles: Article[]; initialTags: Tag[]; }

const workflow: Array<{ status: ArticleStatus; label: string; description: string }> = [
  { status: "idea", label: "選題", description: "等待研究或確認" },
  { status: "draft", label: "草稿", description: "正在撰寫" },
  { status: "review", label: "審核", description: "等待檢查" },
  { status: "published", label: "已發布", description: "前台可讀" },
];
const statusLabel: Record<ArticleStatus, string> = { idea: "選題", draft: "草稿", review: "審核", published: "已發布" };
const matchesTag = (article: Article, tagId: string) => article.tags?.some((tag) => typeof tag === "object" ? tag.tagId === tagId : String(tag) === tagId);
const displayDate = (value?: string) => {
  if (!value) return "尚未更新";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric" }).format(date);
};
const createDraft = (): Partial<Article> => ({
  title: "", slug: `article-${Date.now()}`, summary: "", eyebrow: "App 開發實務", status: "draft",
  contentMarkdown: "# 文章標題\n\n## 重點\n\n從這裡開始撰寫內容。\n",
  author: "MOBILE PULSE 編輯部", readTime: "5 MIN READ",
  publishedAt: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
});

export function BespokeStudioDashboard({ initialArticles, initialTags }: Props) {
  const [articles, setArticles] = useState(initialArticles);
  const [tags, setTags] = useState(initialTags);
  const [view, setView] = useState<WorkspaceView>("board");
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [draggedId, setDraggedId] = useState<string | number | null>(null);
  const [dropTarget, setDropTarget] = useState<ArticleStatus | null>(null);
  const [editorArticle, setEditorArticle] = useState<Partial<Article> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };
  const refresh = async () => {
    const response = await fetch("/api/admin/cms-articles");
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || "Unable to refresh");
    setArticles(payload.articles);
    setTags(payload.tags);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("studio-search")?.focus();
      }
      if (event.key === "Escape") setEditorArticle(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredArticles = useMemo(() => articles.filter((article) => {
    const haystack = `${article.title} ${article.slug} ${article.summary || ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (selectedTag === "all" || matchesTag(article, selectedTag));
  }), [articles, query, selectedTag]);
  const counts = useMemo(() => Object.fromEntries(workflow.map(({ status }) => [status, articles.filter((article) => article.status === status).length])) as Record<ArticleStatus, number>, [articles]);
  const totalViews = articles.reduce((sum, article) => sum + (article.stats?.views || 0), 0);
  const totalUseful = articles.reduce((sum, article) => sum + (article.stats?.useful || 0), 0);
  const totalNotUseful = articles.reduce((sum, article) => sum + (article.stats?.notUseful || 0), 0);
  const feedbackTotal = totalUseful + totalNotUseful;
  const usefulRate = feedbackTotal ? Math.round((totalUseful / feedbackTotal) * 100) : 100;

  const updateStatus = async (id: string | number, status: ArticleStatus) => {
    const previous = articles;
    setArticles((current) => current.map((article) => article.id === id ? { ...article, status } : article));
    try {
      const response = await fetch("/api/admin/cms-articles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error);
      notify(`已移至${statusLabel[status]}`);
    } catch {
      setArticles(previous);
      notify("狀態更新失敗，請再試一次");
    }
  };
  const saveArticle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editorArticle?.title?.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/cms-articles", {
        method: editorArticle.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editorArticle),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error);
      await refresh();
      setEditorArticle(null);
      setView("board");
      notify(editorArticle.id ? "文章已儲存" : "草稿已建立");
    } catch { notify("儲存失敗，請確認必填欄位"); }
    finally { setSaving(false); }
  };
  const deleteArticle = async (id: string | number) => {
    if (!window.confirm("確定要刪除這篇文章嗎？此操作無法復原。")) return;
    try {
      const response = await fetch(`/api/admin/cms-articles?id=${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error);
      setArticles((current) => current.filter((article) => article.id !== id));
      notify("文章已刪除");
    } catch { notify("刪除失敗，請再試一次"); }
  };

  return <div className="editorial-workspace">
    <header className="workspace-header">
      <Link href="/" className="workspace-brand"><span className="workspace-brand__mark"><BookOpen size={18} /></span><span>Mobile Pulse<small>EDITORIAL DESK</small></span></Link>
      <nav className="workspace-nav" aria-label="內容工作台">
        <WorkspaceTab active={view === "board"} onClick={() => setView("board")} icon={<LayoutDashboard size={16} />}>工作流程</WorkspaceTab>
        <WorkspaceTab active={view === "library"} onClick={() => setView("library")} icon={<LayoutList size={16} />}>文章庫</WorkspaceTab>
        <WorkspaceTab active={view === "analytics"} onClick={() => setView("analytics")} icon={<BarChart3 size={16} />}>讀者數據</WorkspaceTab>
        <WorkspaceTab active={view === "draft"} onClick={() => setView("draft")} icon={<Sparkles size={16} />}>快速建稿</WorkspaceTab>
      </nav>
      <div className="workspace-actions">
        <label className="workspace-search"><Search size={15} /><input id="studio-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋文章" /><kbd>⌘K</kbd></label>
        <Link className="workspace-icon-link" href="/" target="_blank" title="開啟前台"><ExternalLink size={16} /></Link>
        <button className="workspace-primary" type="button" onClick={() => setEditorArticle(createDraft())}><FilePlus2 size={16} />新增文章</button>
      </div>
    </header>
    <main className="workspace-main">
      <section className="workspace-title">
        <div><p>CONTENT OPERATIONS</p><h1>{view === "analytics" ? "讀者數據" : "內容工作台"}</h1><span>{view === "analytics" ? "以讀者訊號決定下一篇該優化的內容。" : "編輯、審核與發布，全部在同一張工作桌完成。"}</span></div>
        <div className="workspace-sync"><Check size={15} />資料已同步</div>
      </section>
      <section className="workspace-metrics" aria-label="內容統計">
        <Metric icon={<BookOpen size={17} />} label="文章庫存" value={articles.length} detail="全部內容" />
        <Metric icon={<Eye size={17} />} label="閱讀量" value={totalViews} detail="累積瀏覽" />
        <Metric icon={<BarChart3 size={17} />} label="有用率" value={`${usefulRate}%`} detail={`${feedbackTotal} 則回饋`} accent />
        <Metric icon={<Sparkles size={17} />} label="待處理" value={counts.idea + counts.draft + counts.review} detail="選題、草稿與審核" />
      </section>
      {view === "board" && <BoardView articles={filteredArticles} tags={tags} selectedTag={selectedTag} articleCount={articles.length} setSelectedTag={setSelectedTag} counts={counts} dropTarget={dropTarget} draggedId={draggedId} setDropTarget={setDropTarget} setDraggedId={setDraggedId} onStatusChange={updateStatus} onEdit={setEditorArticle} />}
      {view === "library" && <LibraryView articles={filteredArticles} onStatusChange={updateStatus} onEdit={setEditorArticle} onDelete={deleteArticle} />}
      {view === "analytics" && <AnalyticsView articles={articles} totalUseful={totalUseful} totalNotUseful={totalNotUseful} usefulRate={usefulRate} />}
      {view === "draft" && <section className="quick-draft"><div><p>FROM NOTE TO DRAFT</p><h2>先把值得寫的事記下來。</h2><span>建立後會直接進入草稿流程，可在同一個編輯器完成內容與預覽。</span></div><button className="workspace-primary" type="button" onClick={() => setEditorArticle(createDraft())}><FilePlus2 size={16} />建立草稿</button></section>}
    </main>
    {editorArticle && <ArticleEditor article={editorArticle} previewOpen={previewOpen} saving={saving} onChange={setEditorArticle} onClose={() => setEditorArticle(null)} onSave={saveArticle} onTogglePreview={() => setPreviewOpen((current) => !current)} />}
    {notice && <div className="workspace-notice" role="status"><Check size={16} />{notice}</div>}
  </div>;
}

function WorkspaceTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <button type="button" className={active ? "is-active" : ""} onClick={onClick}>{icon}{children}</button>; }
function Metric({ icon, label, value, detail, accent = false }: { icon: React.ReactNode; label: string; value: string | number; detail: string; accent?: boolean }) { return <div className={`workspace-metric${accent ? " is-accent" : ""}`}><span>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="workspace-empty">{children}</div>; }

function BoardView({ articles, tags, selectedTag, articleCount, setSelectedTag, counts, dropTarget, draggedId, setDropTarget, setDraggedId, onStatusChange, onEdit }: {
  articles: Article[]; tags: Tag[]; selectedTag: string; articleCount: number; setSelectedTag: (tag: string) => void; counts: Record<ArticleStatus, number>; dropTarget: ArticleStatus | null; draggedId: string | number | null; setDropTarget: (status: ArticleStatus | null) => void; setDraggedId: (id: string | number | null) => void; onStatusChange: (id: string | number, status: ArticleStatus) => void; onEdit: (article: Article) => void;
}) {
  return <><div className="workspace-filters"><span>分類</span><Filter active={selectedTag === "all"} onClick={() => setSelectedTag("all")} label="全部" count={articleCount} />{tags.map((tag) => <Filter key={tag.id} active={selectedTag === tag.tagId} onClick={() => setSelectedTag(tag.tagId)} label={tag.name} count={articles.filter((article) => matchesTag(article, tag.tagId)).length} />)}</div><section className="workflow-board" aria-label="內容流程">{workflow.map((lane) => <WorkflowLane key={lane.status} lane={lane} total={counts[lane.status]} articles={articles.filter((article) => article.status === lane.status)} isOver={dropTarget === lane.status} onDragOver={(event) => { event.preventDefault(); setDropTarget(lane.status); }} onDragLeave={() => setDropTarget(null)} onDrop={(event) => { event.preventDefault(); setDropTarget(null); if (draggedId !== null) void onStatusChange(draggedId, lane.status); setDraggedId(null); }} onDragStart={setDraggedId} onStatusChange={onStatusChange} onEdit={onEdit} />)}</section></>;
}
function Filter({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) { return <button type="button" onClick={onClick} className={active ? "is-active" : ""}>{label}<b>{count}</b></button>; }
function WorkflowLane({ lane, total, articles, isOver, onDragOver, onDragLeave, onDrop, onDragStart, onStatusChange, onEdit }: { lane: typeof workflow[number]; total: number; articles: Article[]; isOver: boolean; onDragOver: (event: React.DragEvent) => void; onDragLeave: () => void; onDrop: (event: React.DragEvent) => void; onDragStart: (id: string | number) => void; onStatusChange: (id: string | number, status: ArticleStatus) => void; onEdit: (article: Article) => void }) {
  return <section className={`workflow-lane workflow-lane--${lane.status}${isOver ? " is-over" : ""}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}><header><div><i /><h2>{lane.label}</h2></div><b>{total}</b></header><p>{lane.description}</p><div className="workflow-lane__cards">{articles.length === 0 ? <Empty>拖曳文章至此</Empty> : articles.map((article) => <ArticleCard key={article.id} article={article} onDragStart={onDragStart} onStatusChange={onStatusChange} onEdit={onEdit} />)}</div></section>;
}
function ArticleCard({ article, onDragStart, onStatusChange, onEdit }: { article: Article; onDragStart: (id: string | number) => void; onStatusChange: (id: string | number, status: ArticleStatus) => void; onEdit: (article: Article) => void }) {
  return <article className="article-card" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; onDragStart(article.id); }}><div className="article-card__meta"><span>{article.eyebrow || "技術專欄"}</span><GripVertical size={15} /></div><button type="button" onClick={() => onEdit(article)}>{article.title}</button><p>{article.summary}</p><footer><span>{displayDate(article.updatedAt || article.publishedAt)}</span><StatusSelect article={article} onChange={onStatusChange} compact /></footer></article>;
}
function StatusSelect({ article, onChange, compact = false }: { article: Article; onChange: (id: string | number, status: ArticleStatus) => void; compact?: boolean }) { return <select className={`status-select status-select--${article.status}${compact ? " is-compact" : ""}`} aria-label={`${article.title} 的狀態`} value={article.status} onChange={(event) => void onChange(article.id, event.target.value as ArticleStatus)}>{workflow.map(({ status, label }) => <option key={status} value={status}>{label}</option>)}</select>; }

function LibraryView({ articles, onStatusChange, onEdit, onDelete }: { articles: Article[]; onStatusChange: (id: string | number, status: ArticleStatus) => void; onEdit: (article: Article) => void; onDelete: (id: string | number) => void }) {
  return <section className="data-table-wrap"><table className="data-table"><thead><tr><th>文章</th><th>狀態</th><th>瀏覽</th><th>有用率</th><th aria-label="操作" /></tr></thead><tbody>{articles.map((article) => <tr key={article.id}><td><button type="button" className="data-table__title" onClick={() => onEdit(article)}>{article.title}<span>/articles/{article.slug}</span></button></td><td><StatusSelect article={article} onChange={onStatusChange} /></td><td>{article.stats?.views ?? 0}</td><td>{article.stats?.usefulRate == null ? <span className="muted">尚無回饋</span> : <span className="rate-badge">{Math.round(article.stats.usefulRate * 100)}%</span>}</td><td><div className="row-actions"><Link href={`/articles/${article.slug}`} target="_blank" title="預覽文章"><ExternalLink size={15} /></Link><button type="button" onClick={() => onEdit(article)} title="編輯文章"><Pencil size={15} /></button><button type="button" className="is-danger" onClick={() => void onDelete(article.id)} title="刪除文章"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{articles.length === 0 && <Empty>找不到符合目前篩選條件的文章。</Empty>}</section>;
}
function AnalyticsView({ articles, totalUseful, totalNotUseful, usefulRate }: { articles: Article[]; totalUseful: number; totalNotUseful: number; usefulRate: number }) {
  return <section className="analytics-page"><div className="analytics-lead"><div><p>READER SIGNALS</p><h2>閱讀不是數字，而是下一次編輯決策。</h2><span>以單篇的瀏覽與讀者回饋，找出需要加強或值得延伸的內容。</span></div><dl><div><dt>有用</dt><dd>{totalUseful}</dd></div><div><dt>待改善</dt><dd>{totalNotUseful}</dd></div><div><dt>整體有用率</dt><dd>{usefulRate}%</dd></div></dl></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>文章</th><th>瀏覽</th><th>有用 / 無用</th><th>有用率</th></tr></thead><tbody>{articles.map((article) => <tr key={article.id}><td><strong>{article.title}</strong><span className="table-subtitle">發布於 {article.publishedAt || "近期"}</span></td><td>{article.stats?.views ?? 0}</td><td>{article.stats?.useful ?? 0} / {article.stats?.notUseful ?? 0}</td><td>{article.stats?.usefulRate == null ? <span className="muted">尚無回饋</span> : <span className="rate-badge">{Math.round(article.stats.usefulRate * 100)}%</span>}</td></tr>)}</tbody></table></div></section>;
}

function ArticleEditor({ article, previewOpen, saving, onChange, onClose, onSave, onTogglePreview }: { article: Partial<Article>; previewOpen: boolean; saving: boolean; onChange: (article: Partial<Article>) => void; onClose: () => void; onSave: (event: React.FormEvent) => void; onTogglePreview: () => void }) {
  const update = <Key extends keyof Article>(key: Key, value: Article[Key]) => onChange({ ...article, [key]: value });
  return <div className="article-editor" role="dialog" aria-modal="true" aria-label="文章編輯器"><form className="article-editor__surface" onSubmit={onSave}><header><div><p>{article.id ? "EDIT ARTICLE" : "NEW ARTICLE"}</p><h2>{article.id ? "編輯文章" : "新增文章"}</h2></div><div><button type="button" className={previewOpen ? "editor-preview is-active" : "editor-preview"} onClick={onTogglePreview}>預覽</button><button type="button" className="editor-close" onClick={onClose} title="關閉編輯器"><X size={18} /></button><button type="submit" className="workspace-primary" disabled={saving}>{saving ? "儲存中" : "儲存變更"}</button></div></header><div className={`article-editor__body${previewOpen ? " has-preview" : ""}`}><div className="article-editor__fields"><div className="editor-grid"><Field label="文章標題"><input required value={article.title || ""} onChange={(event) => update("title", event.target.value)} /></Field><Field label="網址代稱"><input required value={article.slug || ""} onChange={(event) => update("slug", event.target.value)} /></Field></div><div className="editor-grid editor-grid--three"><Field label="狀態"><select value={article.status || "draft"} onChange={(event) => update("status", event.target.value as ArticleStatus)}>{workflow.map(({ status, label }) => <option key={status} value={status}>{label}</option>)}</select></Field><Field label="頂部小標"><input value={article.eyebrow || ""} onChange={(event) => update("eyebrow", event.target.value)} /></Field><Field label="作者"><input value={article.author || ""} onChange={(event) => update("author", event.target.value)} /></Field></div><Field label="摘要"><textarea required rows={3} value={article.summary || ""} onChange={(event) => update("summary", event.target.value)} /></Field><Field label="內容（Markdown）" grow><textarea value={article.contentMarkdown || ""} onChange={(event) => update("contentMarkdown", event.target.value)} /></Field></div>{previewOpen && <aside className="article-editor__preview"><p>{article.eyebrow || "技術專欄"}</p><h1>{article.title || "文章標題"}</h1><span>{article.summary || "摘要會顯示在這裡。"}</span><RichMarkdownRenderer content={article.contentMarkdown || ""} /></aside>}</div></form></div>;
}
function Field({ label, children, grow = false }: { label: string; children: React.ReactNode; grow?: boolean }) { return <label className={`editor-field${grow ? " is-grow" : ""}`}><span>{label}</span>{children}</label>; }
