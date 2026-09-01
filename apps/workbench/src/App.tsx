import React, { useEffect, useMemo, useState } from "react";
import type {
  Article,
  ArticleStatus,
  Tag,
  WorkflowColumn,
} from "@mobile-pulse/api-client";
import {
  BarChart3,
  BookOpen,
  Check,
  ExternalLink,
  Eye,
  FilePlus2,
  LayoutDashboard,
  LayoutList,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { WorkflowBoard } from "./components/WorkflowBoard";
import { ArticleLibrary } from "./components/ArticleLibrary";
import { AnalyticsView } from "./components/AnalyticsView";
import { ArticleEditor } from "./components/ArticleEditor";
import { createWorkbenchClient, defaultClient } from "./config";

type WorkspaceView = "board" | "library" | "analytics" | "draft";

const workflow: WorkflowColumn[] = [
  { status: "idea", label: "選題", description: "等待研究或確認" },
  { status: "draft", label: "草稿", description: "正在撰寫" },
  { status: "review", label: "審核", description: "等待檢查" },
  { status: "published", label: "已發布", description: "前台可讀" },
];

const statusLabel: Record<ArticleStatus, string> = {
  idea: "選題",
  draft: "草稿",
  review: "審核",
  published: "已發布",
};

const matchesTag = (article: Article, tagId: string) =>
  article.tags?.some((tag) =>
    typeof tag === "object" ? tag.tagId === tagId : String(tag) === tagId
  );

const displayDate = (value?: string) => {
  if (!value) return "尚未更新";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric" }).format(date);
};

const createInitialDraft = (): Partial<Article> => ({
  title: "",
  slug: `article-${Date.now()}`,
  summary: "",
  eyebrow: "App 開發實務",
  status: "draft",
  contentMarkdown: "# 文章標題\n\n## 重點\n\n從這裡開始撰寫內容。\n",
  author: "MOBILE PULSE 編輯部",
  readTime: "5 MIN READ",
  publishedAt: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
});

export function App() {
  const [client, setClient] = useState(defaultClient);
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [view, setView] = useState<WorkspaceView>("board");
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [editorArticle, setEditorArticle] = useState<Partial<Article> | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem("mp_api_base_url") || ""
  );
  const [apiToken, setApiToken] = useState(
    localStorage.getItem("mp_admin_token") || ""
  );

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const loadData = async (activeClient = client) => {
    try {
      setLoading(true);
      const res = await activeClient.getArticles();
      setArticles(res.articles || []);
      setTags(res.tags || []);
    } catch (err: unknown) {
      notify(`資料載入失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [client]);

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

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const haystack = `${article.title} ${article.slug} ${article.summary || ""}`.toLowerCase();
      return (
        haystack.includes(query.toLowerCase()) &&
        (selectedTag === "all" || matchesTag(article, selectedTag))
      );
    });
  }, [articles, query, selectedTag]);

  const totalViews = articles.reduce((sum, a) => sum + (a.stats?.views || 0), 0);
  const totalUseful = articles.reduce((sum, a) => sum + (a.stats?.useful || 0), 0);
  const totalNotUseful = articles.reduce((sum, a) => sum + (a.stats?.notUseful || 0), 0);
  const feedbackTotal = totalUseful + totalNotUseful;
  const usefulRate = feedbackTotal ? Math.round((totalUseful / feedbackTotal) * 100) : 100;

  const handleUpdateStatus = async (id: string | number, status: ArticleStatus) => {
    const previous = articles;
    setArticles((current) =>
      current.map((art) => (art.id === id ? { ...art, status } : art))
    );

    try {
      await client.updateArticleStatus(id, status);
      notify(`已移至${statusLabel[status]}`);
    } catch (err: unknown) {
      setArticles(previous);
      notify(`狀態更新失敗: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSaveArticle = async (data: Partial<Article>) => {
    setSaving(true);
    try {
      if (data.id) {
        await client.updateArticle(data.id, data);
        notify("文章已儲存");
      } else {
        await client.createArticle(data);
        notify("草稿已建立");
      }
      await loadData();
      setEditorArticle(null);
      setView("board");
    } catch (err: unknown) {
      notify(`儲存失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string | number) => {
    if (!window.confirm("確定要刪除這篇文章嗎？此操作無法復原。")) return;
    try {
      await client.deleteArticle(id);
      setArticles((current) => current.filter((art) => art.id !== id));
      notify("文章已刪除");
    } catch (err: unknown) {
      notify(`刪除失敗: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("mp_api_base_url", apiUrl);
    localStorage.setItem("mp_admin_token", apiToken);
    const newClient = createWorkbenchClient(apiUrl, apiToken);
    setClient(newClient);
    setConfigOpen(false);
    notify("API 連線設定已更新");
  };

  return (
    <div className="editorial-workspace">
      <header className="workspace-header">
        <div className="workspace-brand">
          <span className="workspace-brand__mark">
            <BookOpen size={18} />
          </span>
          <span>
            Mobile Pulse
            <small>EDITORIAL DESK (DECOUPLED)</small>
          </span>
        </div>

        <nav className="workspace-nav" aria-label="內容工作台">
          <button
            type="button"
            className={view === "board" ? "is-active" : ""}
            onClick={() => setView("board")}
          >
            <LayoutDashboard size={16} />
            工作流程
          </button>
          <button
            type="button"
            className={view === "library" ? "is-active" : ""}
            onClick={() => setView("library")}
          >
            <LayoutList size={16} />
            文章庫
          </button>
          <button
            type="button"
            className={view === "analytics" ? "is-active" : ""}
            onClick={() => setView("analytics")}
          >
            <BarChart3 size={16} />
            讀者數據
          </button>
          <button
            type="button"
            className={view === "draft" ? "is-active" : ""}
            onClick={() => setView("draft")}
          >
            <Sparkles size={16} />
            快速建稿
          </button>
        </nav>

        <div className="workspace-actions">
          <label className="workspace-search">
            <Search size={15} />
            <input
              id="studio-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋文章"
            />
            <kbd>⌘K</kbd>
          </label>

          <button
            className="workspace-icon-link"
            type="button"
            onClick={() => setConfigOpen(!configOpen)}
            title="API 連線設定"
          >
            <Settings size={16} />
          </button>

          <a
            className="workspace-icon-link"
            href={apiUrl || "http://localhost:3000"}
            target="_blank"
            rel="noreferrer"
            title="開啟前台"
          >
            <ExternalLink size={16} />
          </a>

          <button
            className="workspace-primary"
            type="button"
            onClick={() => setEditorArticle(createInitialDraft())}
          >
            <FilePlus2 size={16} />
            新增文章
          </button>
        </div>
      </header>

      {/* API Config Panel */}
      {configOpen && (
        <div style={{ background: "#fffefa", borderBottom: "1px solid var(--line)", padding: "16px 32px" }}>
          <form onSubmit={handleSaveConfig} style={{ display: "flex", gap: "12px", alignItems: "center", maxWidth: "900px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 700 }}>
              後端 API Base URL
              <input
                style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "3px", width: "260px" }}
                placeholder="例如 http://localhost:3000"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 700 }}>
              Admin API Token (選填)
              <input
                type="password"
                style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "3px", width: "220px" }}
                placeholder="Bearer / Admin Token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
            </label>
            <button type="submit" className="workspace-primary" style={{ marginTop: "18px" }}>
              儲存並重新連線
            </button>
          </form>
        </div>
      )}

      <main className="workspace-main">
        <section className="workspace-title">
          <div>
            <p>CONTENT OPERATIONS</p>
            <h1>{view === "analytics" ? "讀者數據" : "內容工作台"}</h1>
            <span>
              {view === "analytics"
                ? "以讀者訊號決定下一篇該優化的內容。"
                : "編輯、審核與發布，透過獨立 API 串接完成。"}
            </span>
          </div>
          <div className="workspace-sync">
            <Check size={15} />
            {loading ? "同步中..." : "API 資料已同步"}
          </div>
        </section>

        <section className="workspace-metrics" aria-label="內容統計">
          <div className="workspace-metric">
            <span>
              <BookOpen size={17} />
            </span>
            <div>
              <p>文章庫存</p>
              <strong>{articles.length}</strong>
              <small>全部內容</small>
            </div>
          </div>

          <div className="workspace-metric">
            <span>
              <Eye size={17} />
            </span>
            <div>
              <p>閱讀量</p>
              <strong>{totalViews}</strong>
              <small>累積瀏覽</small>
            </div>
          </div>

          <div className="workspace-metric is-accent">
            <span>
              <BarChart3 size={17} />
            </span>
            <div>
              <p>有用率</p>
              <strong>{usefulRate}%</strong>
              <small>{feedbackTotal} 則回饋</small>
            </div>
          </div>

          <div className="workspace-metric">
            <span>
              <Sparkles size={17} />
            </span>
            <div>
              <p>進行中草稿</p>
              <strong>{articles.filter((a) => a.status === "draft").length}</strong>
              <small>正在撰寫</small>
            </div>
          </div>
        </section>

        {view !== "analytics" && (
          <nav className="workspace-filters" aria-label="標籤篩選">
            <span>標籤：</span>
            <button
              type="button"
              className={selectedTag === "all" ? "is-active" : ""}
              onClick={() => setSelectedTag("all")}
            >
              全部<b>{articles.length}</b>
            </button>
            {tags.map((t) => {
              const count = articles.filter((a) => matchesTag(a, t.tagId)).length;
              return (
                <button
                  key={t.tagId}
                  type="button"
                  className={selectedTag === t.tagId ? "is-active" : ""}
                  onClick={() => setSelectedTag(t.tagId)}
                >
                  {t.name}
                  <b>{count}</b>
                </button>
              );
            })}
          </nav>
        )}

        {view === "board" && (
          <WorkflowBoard
            articles={filteredArticles}
            workflow={workflow}
            onSelectArticle={(art) => setEditorArticle(art)}
            onUpdateStatus={handleUpdateStatus}
            formatDate={displayDate}
          />
        )}

        {view === "library" && (
          <ArticleLibrary
            articles={filteredArticles}
            workflow={workflow}
            onSelectArticle={(art) => setEditorArticle(art)}
            onUpdateStatus={handleUpdateStatus}
            onDeleteArticle={handleDeleteArticle}
            formatDate={displayDate}
            apiBaseUrl={apiUrl}
          />
        )}

        {view === "analytics" && (
          <AnalyticsView
            articles={articles}
            totalViews={totalViews}
            usefulRate={usefulRate}
            feedbackTotal={feedbackTotal}
            onSelectArticle={(art) => setEditorArticle(art)}
          />
        )}

        {view === "draft" && (
          <div className="quick-draft">
            <div>
              <p>QUICK DRAFT</p>
              <h2>快速建立新文章草稿</h2>
              <span>
                填寫基本標題與主題大綱，即可在看板與文章庫中建立草稿並進行後續編修。
              </span>
            </div>
            <button
              type="button"
              className="workspace-primary"
              onClick={() => setEditorArticle(createInitialDraft())}
            >
              <FilePlus2 size={16} />
              開啟編輯器撰寫
            </button>
          </div>
        )}
      </main>

      {editorArticle && (
        <ArticleEditor
          article={editorArticle}
          workflow={workflow}
          saving={saving}
          onSave={handleSaveArticle}
          onClose={() => setEditorArticle(null)}
        />
      )}

      {notice && (
        <div className="workspace-notice" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
