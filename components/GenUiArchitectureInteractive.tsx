"use client";

import { useState } from "react";

type ApproachKey = "tool-calling" | "code-gen" | "rsc" | "a2ui";

type ApproachData = {
  id: ApproachKey;
  tabLabel: string;
  badge?: string;
  title: string;
  summary: string;
  pipeline: {
    step: string;
    label: string;
    detail: string;
    status: "safe" | "warning" | "danger" | "success";
  }[];
  metrics: {
    name: string;
    score: number; // 1 to 5
    label: string;
  }[];
  pros: string;
  cons: string;
  idealFor: string;
};

const APPROACHES: Record<ApproachKey, ApproachData> = {
  "tool-calling": {
    id: "tool-calling",
    tabLabel: "1. 傳統 Tool Calling",
    title: "傳統 Tool Calling + 固定 Widget",
    summary: "LLM 僅填寫既定函式的 JSON 參數，Client 端依照預先寫死的情境模板顯示特定卡片。",
    pipeline: [
      {
        step: "01. 生成",
        label: "固定 Schema 參數",
        detail: "LLM 輸出預先定義的 Function Args (如 { price: 2000 })",
        status: "safe",
      },
      {
        step: "02. 傳輸",
        label: "純資料 JSON 傳遞",
        detail: "無任何介面結構資訊，僅傳送業務資料欄位",
        status: "safe",
      },
      {
        step: "03. 渲染",
        label: "寫死硬編碼模板",
        detail: "Client 根據函數名稱渲染預先寫死的靜態 Widget",
        status: "warning",
      },
      {
        step: "04. 結果",
        label: "缺乏彈性",
        detail: "無法隨對話動態增減欄位、改變佈局或調整互動",
        status: "warning",
      },
    ],
    metrics: [
      { name: "安全性", score: 5, label: "極高 (零代碼注入)" },
      { name: "組合彈性", score: 1, label: "極低 (完全寫死模板)" },
      { name: "跨端可攜性", score: 4, label: "高 (需各端各自硬刻模板)" },
      { name: "樣式一致性", score: 5, label: "完美 (由團隊原生維護)" },
    ],
    pros: "極度安全、完全掌握 UI 樣式、型別嚴格。",
    cons: "只要對話情境稍微改變（如多問一個備註欄位），就必須前端發版重刻新頁面。",
    idealFor: "結帳確認、單一固定查詢卡片（如固定天氣卡）。",
  },
  "code-gen": {
    id: "code-gen",
    tabLabel: "2. 即時代碼生成",
    badge: "高風險",
    title: "即時代碼生成 (Code Gen / eval)",
    summary: "讓 LLM 直接生成 HTML/JS 或 React/Flutter 程式碼，並在前端以 eval、WebView 或動態編譯執行。",
    pipeline: [
      {
        step: "01. 生成",
        label: "原始程式碼 (Raw Code)",
        detail: "LLM 直接寫出 JSX / HTML / Dart 語法字串",
        status: "warning",
      },
      {
        step: "02. 傳輸",
        label: "非結構化代碼字串",
        detail: "串流傳輸未經消毒的可執行程式碼片段",
        status: "danger",
      },
      {
        step: "03. 渲染",
        label: "動態 eval / innerHTML",
        detail: "Client 端即時執行外部不可信程式碼",
        status: "danger",
      },
      {
        step: "04. 結果",
        label: "💥 安全漏洞與破壞樣式",
        detail: "極高 XSS / RCE 風險，且容易因語法中斷導致白畫面",
        status: "danger",
      },
    ],
    metrics: [
      { name: "安全性", score: 1, label: "危險 (開放任意代碼執行)" },
      { name: "組合彈性", score: 5, label: "極高 (任意畫面皆可生成)" },
      { name: "跨端可攜性", score: 1, label: "極低 (各端語法完全不相容)" },
      { name: "樣式一致性", score: 1, label: "失控 (無法保證 Design System)" },
    ],
    pros: "表達力無限，能畫出任何模型能想像的排版。",
    cons: "企業生產環境無法承受的安全黑洞、破壞無障礙（a11y）、狀態管理容易失控崩潰。",
    idealFor: "僅適合受隔離的沙盒原型（如 AI 程式碼編輯器預覽）。",
  },
  rsc: {
    id: "rsc",
    tabLabel: "3. 框架級串流",
    title: "框架級串流 (如 React Server Components)",
    summary: "利用 Web 現代框架的串流協議（如 RSC / AI SDK），由後端將 Virtual DOM 節點串流至瀏覽器。",
    pipeline: [
      {
        step: "01. 生成",
        label: "後端 React Virtual DOM",
        detail: "LLM 於 Server 端驅動 React 元件樹生成",
        status: "safe",
      },
      {
        step: "02. 傳輸",
        label: "RSC Payload 串流",
        detail: "專屬的 React Server Component 線路資料串流",
        status: "safe",
      },
      {
        step: "03. 渲染",
        label: "瀏覽器 Virtual DOM 結合",
        detail: "Web 端 React Runtime 進行 hydration 與掛載",
        status: "safe",
      },
      {
        step: "04. 結果",
        label: "Web 體驗優異，跨端受阻",
        detail: "Flutter、iOS 原生 App 無法直接解析 RSC 格式",
        status: "warning",
      },
    ],
    metrics: [
      { name: "安全性", score: 4, label: "良好 (元件由 Server 編譯)" },
      { name: "組合彈性", score: 4, label: "良好 (具備元件組合力)" },
      { name: "跨端可攜性", score: 2, label: "差 (深度綁定 Web/React 生態)" },
      { name: "樣式一致性", score: 4, label: "良好 (使用 Web 元件庫)" },
    ],
    pros: "Web 開發者體驗極佳、支援局部串流、狀態管理成熟。",
    cons: "無法直接移植至 Mobile App（iOS/Android 原生、Flutter 皆無法共用）。",
    idealFor: "純 Web-based 且技術棧全為 React / Next.js 的 AI 應用。",
  },
  a2ui: {
    id: "a2ui",
    tabLabel: "4. A2UI 宣告式協定",
    badge: "推薦標準",
    title: "A2UI 宣告式標準協定 (Declarative AST)",
    summary: "Agent 僅輸出受 Catalog 白名單約束的抽象語意樹（JSON），由各端原生 Renderer 進行安全解析。",
    pipeline: [
      {
        step: "01. 生成",
        label: "宣告式 AST (JSON)",
        detail: "LLM 從 Catalog 挑選元件，輸出純結構與狀態宣告",
        status: "success",
      },
      {
        step: "02. 傳輸",
        label: "雙通道資料流",
        detail: "Surface (結構) 與 DataModel (資料) 獨立串流更新",
        status: "success",
      },
      {
        step: "03. 渲染",
        label: "原生 Widget Factory",
        detail: "Flutter/Web/iOS 原生以預編譯元件驗證並渲染",
        status: "success",
      },
      {
        step: "04. 結果",
        label: "🛡️ 零信任安全 + 100% 原生",
        detail: "零代碼注入風險，兼具跨平台可攜性與原生流暢度",
        status: "success",
      },
    ],
    metrics: [
      { name: "安全性", score: 5, label: "極高 (白名單防禦 + 零代碼注入)" },
      { name: "組合彈性", score: 4, label: "高 (在 Catalog 內自由組合)" },
      { name: "跨端可攜性", score: 5, label: "極高 (跨 Web / Flutter / 原生)" },
      { name: "樣式一致性", score: 5, label: "完美 (完全映射原生 Design System)" },
    ],
    pros: "框架無關、跨端一致、零執行期安全風險、防串流閃爍、副作用完全隔離。",
    cons: "處於標準演進早期，團隊初次需為各平台建立 Renderer 與 Catalog。",
    idealFor: "需要跨平台一致體驗、具備企業級安全要求、且重視原生質感的任務型 Agent。",
  },
};

export function GenUiArchitectureInteractive() {
  const [activeTab, setActiveTab] = useState<ApproachKey>("a2ui");
  const data = APPROACHES[activeTab];

  return (
    <section className="genui-interactive" aria-labelledby="genui-interactive-title">
      <div className="genui-interactive-header">
        <p className="eyebrow">互動式架構選型模擬</p>
        <h3 id="genui-interactive-title">GenUI 四大架構運作流向與權衡對比</h3>
        <p className="genui-desc">
          點擊下方不同的技術路線，觀察資料如何從 LLM 傳遞至前端，以及各自在安全性與跨平台上的表現：
        </p>
      </div>

      {/* Tabs */}
      <div className="genui-tabs" role="tablist" aria-label="GenUI 架構方案切換">
        {(Object.keys(APPROACHES) as ApproachKey[]).map((key) => {
          const item = APPROACHES[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`genui-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <span>{item.tabLabel}</span>
              {item.badge && (
                <span className={`genui-badge ${key === "code-gen" ? "danger" : "accent"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Display Panel */}
      <div className="genui-panel">
        <div className="genui-panel-intro">
          <h4>{data.title}</h4>
          <p>{data.summary}</p>
        </div>

        {/* Animated Pipeline Flow */}
        <div className="genui-pipeline-wrap">
          <p className="genui-pipeline-label">資料流向與安全檢查節點（Pipeline）</p>
          <div className="genui-pipeline-grid">
            {data.pipeline.map((p, idx) => (
              <div key={p.step} className={`genui-pipeline-card status-${p.status}`}>
                <div className="genui-card-top">
                  <span className="genui-step-num">{p.step}</span>
                  <span className={`genui-status-pill ${p.status}`}>{p.status.toUpperCase()}</span>
                </div>
                <strong className="genui-step-label">{p.label}</strong>
                <p className="genui-step-detail">{p.detail}</p>
                {idx < data.pipeline.length - 1 && <span className="genui-arrow" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 4-Dimension Metric Bars */}
        <div className="genui-metrics-wrap">
          <p className="genui-metrics-label">多維度指標雷達</p>
          <div className="genui-metrics-grid">
            {data.metrics.map((m) => (
              <div key={m.name} className="genui-metric-item">
                <div className="genui-metric-header">
                  <span className="genui-metric-name">{m.name}</span>
                  <span className="genui-metric-val">{m.label}</span>
                </div>
                <div className="genui-bar-track">
                  <div
                    className={`genui-bar-fill score-${m.score}`}
                    style={{ width: `${(m.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tradeoffs Summary */}
        <div className="genui-tradeoff-grid">
          <div className="genui-tradeoff-box pros">
            <span className="genui-box-title">✅ 優勢亮點</span>
            <p>{data.pros}</p>
          </div>
          <div className="genui-tradeoff-box cons">
            <span className="genui-box-title">⚠️ 致命挑戰 / 成本</span>
            <p>{data.cons}</p>
          </div>
          <div className="genui-tradeoff-box ideal">
            <span className="genui-box-title">🎯 最佳適用場景</span>
            <p>{data.idealFor}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
