import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";

export async function DashboardOverview() {
  let articles: Record<string, unknown>[] = [];
  let tags: Record<string, unknown>[] = [];
  let userCount = 1;

  try {
    const payload = await getPayload({ config });
    const [articlesRes, tagsRes, usersRes] = await Promise.all([
      payload.find({ collection: "articles", limit: 100, sort: "-updatedAt" }),
      payload.find({ collection: "tags", limit: 50 }),
      payload.find({ collection: "users", limit: 10 }),
    ]);
    articles = articlesRes.docs as unknown as Record<string, unknown>[];
    tags = tagsRes.docs as unknown as Record<string, unknown>[];
    userCount = usersRes.totalDocs || usersRes.docs.length || 1;
  } catch {
    // Fallback if payload isn't ready
  }

  const ideas = articles.filter((a) => a.status === "idea");
  const drafts = articles.filter((a) => a.status === "draft");
  const reviews = articles.filter((a) => a.status === "review");
  const published = articles.filter((a) => a.status === "published");

  return (
    <div style={{ marginBottom: "36px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── 1. Hero Hub Header ────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #090e1a 0%, #0d1527 40%, #151d38 100%)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          borderRadius: "16px",
          padding: "32px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "280px",
            height: "280px",
            background: "radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(0,0,0,0) 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "24px" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(14, 165, 233, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "5px 12px",
                borderRadius: "20px",
                marginBottom: "14px",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 10px #38bdf8" }} />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", letterSpacing: "1px" }}>
                MOBILE PULSE · 編輯出版中樞
              </span>
            </div>
            <h1 style={{ margin: "0 0 10px 0", fontSize: "28px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
              App 技術週報 · 內容流水線看板
            </h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", maxWidth: "680px", lineHeight: "1.6" }}>
              結合 AI Agent 自動查證、同儕審查與 SQLite 即時動態發布。所有文章與標籤隨改即時生效。
            </p>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href="/admin/collections/articles/create"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                color: "#ffffff",
                padding: "11px 20px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                boxShadow: "0 6px 20px rgba(37, 99, 235, 0.45)",
                transition: "transform 0.15s ease",
              }}
            >
              <span>✍️ 撰寫新文章</span>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#e2e8f0",
                padding: "11px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              <span>🌐 前台首頁 ↗</span>
            </a>
            <a
              href="/stats"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#e2e8f0",
                padding: "11px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              <span>📊 讀者統計 ↗</span>
            </a>
          </div>
        </div>

        {/* ── 2. Metric Four Cards ──────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginTop: "26px",
            paddingTop: "22px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "14px 18px" }}>
            <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: "600" }}>📰 總收錄文章</span>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", marginTop: "4px" }}>
              {articles.length} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>篇</span>
            </div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "14px 18px" }}>
            <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: "600" }}>🚀 已正式發布</span>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#38bdf8", marginTop: "4px" }}>
              {published.length} <span style={{ fontSize: "12px", color: "#0284c7", fontWeight: "500" }}>篇上線</span>
            </div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "14px 18px" }}>
            <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: "600" }}>🏷️ 技術分類標籤</span>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", marginTop: "4px" }}>
              {tags.length} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>個</span>
            </div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.65)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "12px", padding: "14px 18px" }}>
            <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: "600" }}>👥 編輯部成員</span>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", marginTop: "4px" }}>
              {userCount} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>人</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Visual Content Pipeline Kanban ──────────────────────── */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📋 內容狀態流水線</span>
            <span style={{ fontSize: "12px", fontWeight: "500", color: "#64748b" }}>（即時資料庫同步）</span>
          </h2>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>點擊卡片直接進入編輯 ➔</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {/* Column 1: Idea */}
          <KanbanColumn
            title="💡 靈感 / 待查證"
            count={ideas.length}
            articles={ideas}
            accentColor="#a855f7"
            bgAccent="rgba(168, 85, 247, 0.08)"
            emptyText="目前無待查證選題"
          />

          {/* Column 2: Draft */}
          <KanbanColumn
            title="✍️ 草稿撰寫中"
            count={drafts.length}
            articles={drafts}
            accentColor="#eab308"
            bgAccent="rgba(234, 179, 8, 0.08)"
            emptyText="尚無進行中草稿"
          />

          {/* Column 3: Review */}
          <KanbanColumn
            title="🔍 同儕待審核"
            count={reviews.length}
            articles={reviews}
            accentColor="#f97316"
            bgAccent="rgba(249, 115, 22, 0.08)"
            emptyText="暫無待審核文章"
          />

          {/* Column 4: Published */}
          <KanbanColumn
            title="🚀 已發布上線"
            count={published.length}
            articles={published}
            accentColor="#38bdf8"
            bgAccent="rgba(56, 189, 248, 0.08)"
            emptyText="尚未發布文章"
          />
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  articles,
  accentColor,
  bgAccent,
  emptyText,
}: {
  title: string;
  count: number;
  articles: Record<string, unknown>[];
  accentColor: string;
  bgAccent: string;
  emptyText: string;
}) {
  return (
    <div
      style={{
        background: "#0d1322",
        border: "1px solid #1e293b",
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        minHeight: "220px",
      }}
    >
      {/* Column Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          paddingBottom: "10px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc" }}>{title}</span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: "800",
            padding: "2px 8px",
            borderRadius: "12px",
            background: bgAccent,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
          }}
        >
          {count}
        </span>
      </div>

      {/* Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {articles.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              fontSize: "12px",
              color: "#475569",
              border: "1px dashed #1e293b",
              borderRadius: "8px",
            }}
          >
            {emptyText}
          </div>
        ) : (
          articles.map((article) => (
            <Link
              key={article.id as string}
              href={`/admin/collections/articles/${article.id as string}`}
              style={{
                display: "block",
                background: "#11192d",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: "10px",
                padding: "12px 14px",
                textDecoration: "none",
                transition: "all 0.15s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", marginBottom: "6px", lineHeight: "1.4" }}>
                {article.title as string}
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "#94a3b8",
                  lineHeight: "1.4",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  marginBottom: "8px",
                }}
              >
                {article.summary as string}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10.5px", color: "#64748b" }}>
                <span>{(article.publishedAt as string) || "近期"}</span>
                <span style={{ fontFamily: "ui-monospace, monospace", color: "#38bdf8" }}>/{article.slug as string}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
