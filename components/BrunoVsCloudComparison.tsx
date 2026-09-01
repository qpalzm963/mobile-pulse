"use client";

import { useState } from "react";

type DiffTab = "storage" | "sync" | "security" | "cicd";

type ArchitectureComparisonData = {
  id: DiffTab;
  tabLabel: string;
  category: string;
  title: string;
  legacy: {
    badge: string;
    title: string;
    model: string;
    description: string;
    painPoint: string;
    codeOrFlow: string[];
  };
  bruno: {
    badge: string;
    title: string;
    model: string;
    description: string;
    gain: string;
    codeOrFlow: string[];
  };
};

const ARCH_COMPARISONS: Record<DiffTab, ArchitectureComparisonData> = {
  storage: {
    id: "storage",
    tabLabel: "1. 檔案與資料拓撲",
    category: "Data Topology",
    title: "資料存儲拓撲：中心化雲端庫 vs 本機檔案系統",
    legacy: {
      badge: "中心化雲端",
      title: "雲端資料庫私有格式",
      model: "Client ➔ HTTPS ➔ Postman Cloud DB (閉源儲存)",
      description: "所有 Request 存在雲端，離線功能被閹割，本機無透明檔案可查閱或手動編輯。",
      painPoint: "斷網無法除錯、專案換電腦需重新登入同步、隨時面臨廠商服務條款變更。",
      codeOrFlow: [
        "app.postman.co (中心伺服器)",
        "  └── workspace_id (封閉雲端資料庫)",
        "        └── collection.json (非透明格式)",
      ],
    },
    bruno: {
      badge: "Local-First",
      title: "透明純文字檔案系統 (.bru)",
      model: "Your Disk ➔ /api/*.bru ➔ 原生純文字檔案",
      description: "每個 Request 就是磁碟上的一個普通 .bru 檔案，可用 VS Code、Vim、Sublime 任意開啟與編輯。",
      gain: "100% 離線可用、極速讀寫、完全由作業系統檔案樹自由管理。",
      codeOrFlow: [
        "your-repo/",
        "  ├── src/ & package.json",
        "  └── api/ (Bruno Collection)",
        "        ├── environments/local.bru",
        "        └── users/get-users.bru",
      ],
    },
  },
  sync: {
    id: "sync",
    tabLabel: "2. 版本控制與協作",
    category: "Version Control",
    title: "團隊協作模型：手動匯出/雲端覆蓋 vs 原生 Git 分支",
    legacy: {
      badge: "脫節協作",
      title: "全域覆蓋或巨型 JSON 衝突",
      model: "多人共用雲端 Workspace ➔ 互相覆蓋參數 ➔ 手動匯出 2MB JSON",
      description: "API 與程式碼分支（Branch）脫鉤，改 API 容易覆蓋同事的測試 Header，或因單一巨大 JSON 無法 resolve conflict。",
      painPoint: "「誰把 staging 的 Token 改掉了？」、「發 PR 時忘記附上新的 API 規格」。",
      codeOrFlow: [
        "Dev A (修改 Header) ──┐",
        "                      ├──► 雲端 Workspace (互相覆蓋)",
        "Dev B (改測另個欄位) ─┘",
      ],
    },
    bruno: {
      badge: "Git-Native",
      title: "隨 Code 同步、行級 Diff",
      model: "Git Branch ➔ Commit .bru ➔ PR Code Review ➔ Merge",
      description: "新增 API 跟著程式碼一起發 PR，Reviewer 審查 Code 時同時驗收 API 契約；切換分支 API 即刻自動對齊。",
      gain: "行級（Line-by-line）文字 Diff，Git 自動化合併衝突，版本歷史一清二楚。",
      codeOrFlow: [
        "feature/auth 分支: + api/login.bru",
        "feature/pay  分支: + api/checkout.bru",
        "  └── Git 一鍵無痛 Merge，互不干擾",
      ],
    },
  },
  security: {
    id: "security",
    tabLabel: "3. 資安與機密防護",
    category: "Secret Security",
    title: "機密隔離策略：雲端同步洩漏風險 vs .gitignore 本機隔離",
    legacy: {
      badge: "高外洩風險",
      title: "環境變數預設同步雲端",
      model: "Bearer Token / 私密 Key ➔ 同步至外部 SaaS 伺服器",
      description: "敏感資訊一旦寫入 Environment，容易不知不覺被同步到雲端或分享給外部協作者。",
      painPoint: "違反金融/醫療資料不落第三方政策、資安審計困難、Token 遭第三方平台外洩風險。",
      codeOrFlow: [
        "[Local Client] Bearer eyJhbGciOi...",
        "       │ (Auto Sync)",
        "       ▼",
        "[Public Cloud Server] ⚠️ 存在外洩與合規風險",
      ],
    },
    bruno: {
      badge: "零信任防護",
      title: ".env / secrets.bru + .gitignore",
      model: "機密僅存在本機 .env ➔ .gitignore 阻絕 ➔ 零雲端上傳",
      description: "公共變數（如 baseUrl）納入版控，私密金鑰透過 local env 保存在本機硬碟，永不外洩。",
      gain: "完全符合企業最高資安合規（HIPAA、GDPR、金融金檢），無後顧之憂。",
      codeOrFlow: [
        "api/environments/production.bru (範本)",
        "api/environments/.env.local (真實機密)",
        "  └── .gitignore 嚴格隔離，100% 留在本機",
      ],
    },
  },
  cicd: {
    id: "cicd",
    tabLabel: "4. 自動化測試流水線",
    category: "Automation Pipeline",
    title: "CI/CD 整合成本：配額收費限制 vs 開源 CLI 自由執行",
    legacy: {
      badge: "受限收費",
      title: "API 次數限制或付費 Enterprise",
      model: "Newman / Postman CLI ➔ 依帳號配額限制呼叫次數",
      description: "在 CI/CD 大規模執行自動化整合測試時，容易觸碰 API 呼叫次數天花板，需升級高階方案。",
      painPoint: "CI 跑太多次測試收到帳單警報、測試環境需要額外配置雲端 API Key。",
      codeOrFlow: [
        "GitHub Actions",
        "  └── postman run (呼叫次數消耗計費 / 需連外驗證)",
      ],
    },
    bruno: {
      badge: "開源無界",
      title: "@usebruno/cli 無頭（Headless）極速運行",
      model: "CLI 直接讀取本機 .bru 檔案 ➔ 離線執行 ➔ 輸出 JSON/HTML 報告",
      description: "完全免費、開源、無次數限制。可在任何 Docker 容器、K8s 或 CI/CD runner 離線執行回歸測試。",
      gain: "零額外授權費用、不需連外驗證、測試速度極快。",
      codeOrFlow: [
        "GitHub Actions Runner",
        "  └── npx @usebruno/cli run api/ --env staging",
        "        └── 100% 本地解析執行，0 次數配額限制",
      ],
    },
  },
};

export function BrunoVsCloudComparison() {
  const [activeTab, setActiveTab] = useState<DiffTab>("storage");
  const data = ARCH_COMPARISONS[activeTab];

  return (
    <section className="genui-interactive" aria-labelledby="bruno-comparison-title">
      <div className="genui-interactive-header">
        <p className="eyebrow">架構深潛對比</p>
        <h3 id="bruno-comparison-title">傳統雲端 API SaaS vs. Bruno Git-First 架構演進</h3>
        <p className="genui-desc">
          點擊不同維度切換，深入分析資料儲存、團隊協作、機密資安與自動化流水線的架構差異：
        </p>
      </div>

      {/* Dimension Tabs */}
      <div className="genui-tabs" role="tablist" aria-label="架構對比切換">
        {(Object.keys(ARCH_COMPARISONS) as DiffTab[]).map((tabKey) => {
          const item = ARCH_COMPARISONS[tabKey];
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`genui-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tabKey)}
            >
              <span>{item.tabLabel}</span>
              <span className="genui-badge accent">{item.category}</span>
            </button>
          );
        })}
      </div>

      {/* Main Comparison Panel */}
      <div className="genui-panel">
        <div className="genui-panel-intro">
          <h4>{data.title}</h4>
        </div>

        {/* Side-by-side Visual Architecture Diff */}
        <div className="genui-pipeline-wrap">
          <div className="genui-pipeline-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Legacy Cloud Box */}
            <div className="genui-pipeline-card status-danger" style={{ padding: "16px" }}>
              <div className="genui-card-top">
                <span className="genui-step-num">TRADITIONAL SAAS</span>
                <span className="genui-status-pill danger">{data.legacy.badge}</span>
              </div>
              <strong className="genui-step-label" style={{ fontSize: "15px" }}>
                {data.legacy.title}
              </strong>
              <p style={{ fontSize: "12.5px", fontFamily: "var(--mono)", color: "var(--warn)", margin: "4px 0 8px" }}>
                {data.legacy.model}
              </p>
              <p className="genui-step-detail" style={{ fontSize: "13px", lineHeight: "1.7" }}>
                {data.legacy.description}
              </p>

              <div style={{ marginTop: "12px", background: "rgba(229, 62, 62, 0.08)", padding: "10px", borderRadius: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#c53030", display: "block", marginBottom: "4px" }}>
                  ⚠️ 核心架構痛點：
                </span>
                <span style={{ fontSize: "12px", color: "#742a2a" }}>{data.legacy.painPoint}</span>
              </div>

              <div style={{ marginTop: "12px", background: "#18181b", border: "1px solid #27272a", color: "#f87171", padding: "12px 14px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--mono)", lineHeight: "1.6" }}>
                {data.legacy.codeOrFlow.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>

            {/* Bruno Git-First Box */}
            <div className="genui-pipeline-card status-success" style={{ padding: "16px", background: "#f8fcf9" }}>
              <div className="genui-card-top">
                <span className="genui-step-num">BRUNO ARCHITECTURE</span>
                <span className="genui-status-pill success">{data.bruno.badge}</span>
              </div>
              <strong className="genui-step-label" style={{ fontSize: "15px", color: "var(--accent)" }}>
                {data.bruno.title}
              </strong>
              <p style={{ fontSize: "12.5px", fontFamily: "var(--mono)", color: "var(--accent)", margin: "4px 0 8px" }}>
                {data.bruno.model}
              </p>
              <p className="genui-step-detail" style={{ fontSize: "13px", lineHeight: "1.7", color: "var(--ink)" }}>
                {data.bruno.description}
              </p>

              <div style={{ marginTop: "12px", background: "rgba(15, 92, 77, 0.08)", padding: "10px", borderRadius: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent)", display: "block", marginBottom: "4px" }}>
                  ✨ 核心架構效益：
                </span>
                <span style={{ fontSize: "12px", color: "var(--accent)" }}>{data.bruno.gain}</span>
              </div>

              <div style={{ marginTop: "12px", background: "#18181b", border: "1px solid #27272a", color: "#4ade80", padding: "12px 14px", borderRadius: "6px", fontSize: "12px", fontFamily: "var(--mono)", lineHeight: "1.6" }}>
                {data.bruno.codeOrFlow.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
