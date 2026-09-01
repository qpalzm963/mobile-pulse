"use client";

import { useState } from "react";

type WorkflowRole = "backend" | "git" | "frontend" | "cicd";

type WorkflowNode = {
  id: WorkflowRole;
  stepNumber: string;
  roleTitle: string;
  badge: string;
  action: string;
  tagline: string;
  detail: string;
  input: string;
  output: string;
  fileName: string;
  codeSnippet: string;
  benefit: string;
};

const WORKFLOW_STEPS: WorkflowNode[] = [
  {
    id: "backend",
    stepNumber: "01",
    roleTitle: "後端工程師 (Backend)",
    badge: "API 生產與宣告",
    action: "建立 / 編輯 API 請求與 Assertions",
    tagline: "在本地除錯並直接產出 .bru 宣告式檔案",
    detail:
      "後端工程師開發完 Controller / Endpoint 後，直接在 Bruno 中新增請求。設定好的 Path、Query、Headers、Body 以及期望的回應斷言（Assert），會自動以純文字 .bru 儲存在專案目錄。",
    input: "本地 API 實作 (如 POST /api/v1/orders) + 測試參數",
    output: "純文字規格檔 (api/orders/create.bru)",
    fileName: "api/orders/create.bru",
    codeSnippet: `meta {
  name: 建立訂單
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/v1/orders
  body: json
  auth: bearer
}

auth:bearer {
  token: {{authToken}}
}

body:json {
  { "productId": "p_99", "quantity": 1 }
}

assert {
  res.status: eq 201
  res.body.orderId: isDefined
}`,
    benefit: "寫 Code 的同時順手完成 API 驗收測試，不必再手動維護容易過期的外部文件。",
  },
  {
    id: "git",
    stepNumber: "02",
    roleTitle: "Git 版本控制 (Git / PR)",
    badge: "契約納入版控",
    action: "隨程式碼一同 Commit、發 PR 與 Code Review",
    tagline: "API 規格隨同業務邏輯一起被審查與版本化",
    detail:
      "所有的 .bru 檔案就存放在同一個 Git 倉庫（Repository）中。發 PR 時，Reviewer 可以在 GitHub / GitLab 的 Diff 視圖中，一併檢視業務邏輯與 API 契約的變更。",
    input: "程式碼改動 + .bru 變更檔案",
    output: "包含可執行 API 規格的 Pull Request",
    fileName: "Terminal (Git Branch)",
    codeSnippet: `git status
# Modified: src/controllers/order.ts
# New File: api/orders/create.bru

git add .
git commit -m "feat(order): 實作建立訂單端點並附帶 Bruno 測試規格"
git push origin feature/checkout-v2`,
    benefit: "徹底消除「程式碼上線了，API 文件卻停留在上個版本」的資訊斷層。",
  },
  {
    id: "frontend",
    stepNumber: "03",
    roleTitle: "前端 / App 工程師 (Frontend)",
    badge: "消費與責任除錯",
    action: "切換分支自動取得最新規格，一秒釐清責任",
    tagline: "Git Checkout 即就緒，除錯有憑有據",
    detail:
      "前端或 Mobile（iOS/Android/Flutter）工程師切換至該分支，打開 Bruno 就擁有最新的 API 集合。當畫面上資料呈現異常時，直接在 Bruno 點擊 Send，秒判是後端回傳 500 還是前端自己狀態處理錯誤。",
    input: "Git 分支切換 (git checkout feature/checkout-v2)",
    output: "最新可執行的 API 請求 + 即時 HTTP 回應狀態",
    fileName: "Developer Flow",
    codeSnippet: `# 前端切換分支
git checkout feature/checkout-v2

# 開啟 Bruno -> 選擇 [Orders] -> 點擊 [Send]
# 回應 200 OK ➔ 前端安心開始綁定 UI
# 回應 500 Error ➔ 截圖回報後端修正，責任清晰`,
    benefit: "不需等待後端私訊匯出 JSON，除錯時精確區分是 Client 渲染還是 Server 端邏輯問題。",
  },
  {
    id: "cicd",
    stepNumber: "04",
    roleTitle: "自動化流水線 (CI/CD)",
    badge: "回歸防護網",
    action: "無頭執行自動化回歸測試 (Headless)",
    tagline: "PR Merge 前的最後一道自動化守門員",
    detail:
      "利用開源無限制的 @usebruno/cli，在 GitHub Actions 或 GitLab CI 流水線中，針對 Staging / Test 環境自動跑完整個 API 集合的 Assert 斷言，確保重構或改版未破壞既有契約。",
    input: "專案中所有 .bru 檔案 + 目標環境設定",
    output: "測試通過報告 (JSON / JUnit / HTML)",
    fileName: ".github/workflows/api-test.yml",
    codeSnippet: `# GitHub Actions Pipeline 配置範例
name: API Regression Pipeline
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: 執行 Bruno API 自動化回歸測試
        run: npx @usebruno/cli run api/ --env staging`,
    benefit: "開源免授權費、無呼叫次數天花板，在程式碼合併前自動攔截壞掉的端點。",
  },
];

export function BrunoWorkflowDiagram() {
  const [selectedRole, setSelectedRole] = useState<WorkflowRole>("backend");
  const current = WORKFLOW_STEPS.find((s) => s.id === selectedRole) || WORKFLOW_STEPS[0];

  return (
    <section className="genui-interactive" aria-labelledby="bruno-workflow-title">
      <div className="genui-interactive-header">
        <p className="eyebrow">全流程閉環工作流</p>
        <h3 id="bruno-workflow-title">從後端定義到前端消費與 CI/CD 的協作閉環</h3>
        <p className="genui-desc">
          點擊下方工作流步驟，查看該階段的具體輸入、輸出、代碼範例與核心效益：
        </p>
      </div>

      {/* 4 Interactive Process Steps */}
      <div className="genui-pipeline-grid" style={{ marginBottom: "20px" }}>
        {WORKFLOW_STEPS.map((s, idx) => {
          const isCurrent = selectedRole === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={`genui-pipeline-card status-${isCurrent ? "success" : "safe"}`}
              style={{
                cursor: "pointer",
                textAlign: "left",
                background: isCurrent ? "#fff" : "var(--wash)",
                border: isCurrent ? "2px solid var(--accent)" : "1px solid var(--rule)",
                transform: isCurrent ? "translateY(-2px)" : "none",
                boxShadow: isCurrent ? "0 4px 12px rgba(15, 92, 77, 0.12)" : "none",
              }}
              onClick={() => setSelectedRole(s.id)}
            >
              <div className="genui-card-top">
                <span className="genui-step-num">STAGE {s.stepNumber}</span>
                <span className={`genui-status-pill ${isCurrent ? "success" : "safe"}`}>
                  {isCurrent ? "ACTIVE" : "READY"}
                </span>
              </div>
              <strong className="genui-step-label" style={{ color: isCurrent ? "var(--accent)" : "var(--ink)", fontSize: "14px", marginTop: "4px" }}>
                {s.roleTitle.split(" ")[0]}
              </strong>
              <p className="genui-step-detail" style={{ fontSize: "12px", marginTop: "2px" }}>
                {s.action}
              </p>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <span className="genui-arrow" aria-hidden="true">→</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Flow Stage Display */}
      <div className="genui-panel">
        <div className="genui-panel-intro">
          <h4>{current.roleTitle}：{current.action}</h4>
          <p style={{ color: "var(--accent)", fontWeight: "500", marginTop: "2px" }}>
            {current.tagline}
          </p>
          <p style={{ marginTop: "6px" }}>{current.detail}</p>
        </div>

        {/* IO Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ background: "var(--wash)", border: "1px solid var(--rule)", padding: "12px 14px", borderRadius: "4px" }}>
            <span style={{ font: "600 11px var(--mono)", color: "var(--muted)", textTransform: "uppercase" }}>
              📥 階段輸入 (Input)
            </span>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--ink)", fontWeight: "500" }}>
              {current.input}
            </p>
          </div>
          <div style={{ background: "var(--wash)", border: "1px solid var(--rule)", padding: "12px 14px", borderRadius: "4px" }}>
            <span style={{ font: "600 11px var(--mono)", color: "var(--muted)", textTransform: "uppercase" }}>
              📤 階段產出 (Output)
            </span>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--accent)", fontWeight: "500" }}>
              {current.output}
            </p>
          </div>
        </div>

        {/* Code Snippet & Benefit Card (高對比清楚代碼框) */}
        <div className="genui-tradeoff-grid">
          <div className="genui-tradeoff-box pros" style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="genui-box-title">📄 實體檔案 / 指令呈現</span>
              <span style={{ font: "500 10.5px var(--mono)", color: "var(--accent)", background: "var(--wash)", padding: "2px 6px", borderRadius: "3px" }}>
                {current.fileName}
              </span>
            </div>
            <pre style={{
              margin: "10px 0 0 0",
              padding: "14px 16px",
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "6px",
              overflowX: "auto"
            }}>
              <code style={{
                fontFamily: "var(--mono)",
                fontSize: "12.5px",
                lineHeight: "1.7",
                color: "#e4e4e7",
                display: "block",
                background: "transparent",
                padding: 0
              }}>
                {current.codeSnippet}
              </code>
            </pre>
          </div>
          <div className="genui-tradeoff-box ideal">
            <span className="genui-box-title">✨ 核心價值與收益</span>
            <p style={{ marginTop: "8px", fontSize: "13px", lineHeight: "1.7" }}>
              {current.benefit}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
