"use client";

import { useState } from "react";

export function AgentSandboxInteractive() {
  const [activeTab, setActiveTab] = useState<"incident" | "defense" | "simulator">("incident");
  const [simCommand, setSimCommand] = useState<string>("curl http://169.254.169.254/latest/meta-data/");
  const [simResult, setSimResult] = useState<{
    verdict: "BLOCK" | "APPROVE_REQUIRED" | "ALLOW";
    reason: string;
    layer: string;
  } | null>(null);

  const handleSimulate = (cmd: string) => {
    setSimCommand(cmd);
    const clean = cmd.trim();

    if (clean.includes("169.254.169.254") || clean.includes(".ssh") || clean.includes("chmod 777")) {
      setSimResult({
        verdict: "BLOCK",
        reason: "觸發致命指令黑名單：檢測到私有中繼資料存取或未授權提權操作。",
        layer: "Layer 1: 核心系統與 eBPF 網路沙盒",
      });
    } else if (clean.startsWith("rm") || clean.includes("git push") || clean.includes("npm publish")) {
      setSimResult({
        verdict: "APPROVE_REQUIRED",
        reason: "檢測到具破壞性或不可逆副作用操作，觸發 Human-in-the-Loop 人工審批暫停隊列。",
        layer: "Layer 2: 意圖仲裁與審批中介",
      });
    } else {
      setSimResult({
        verdict: "ALLOW",
        reason: "指令通過靜態白名單驗證，並已寫入不可竄改審計鏈（SHA-256 雜湊已記錄）。",
        layer: "Layer 3: 密碼學鏈式審計日誌",
      });
    }
  };

  return (
    <div
      style={{
        margin: "32px 0",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        background: "#ffffff",
        padding: "20px 24px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--rule)", paddingBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            互動架構探索器 (舊版模板元件)
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: "16px", color: "var(--ink)" }}>
            AI Agent 越獄攻擊路徑與三層防禦模擬
          </h3>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("incident")}
            style={{
              background: activeTab === "incident" ? "var(--accent-subtle)" : "var(--bg-subtle)",
              border: `1px solid ${activeTab === "incident" ? "var(--accent-border)" : "var(--rule)"}`,
              color: activeTab === "incident" ? "var(--accent)" : "var(--muted)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            事件還原
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("defense")}
            style={{
              background: activeTab === "defense" ? "var(--accent-subtle)" : "var(--bg-subtle)",
              border: `1px solid ${activeTab === "defense" ? "var(--accent-border)" : "var(--rule)"}`,
              color: activeTab === "defense" ? "var(--accent)" : "var(--muted)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            三層防線
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("simulator");
              if (!simResult) handleSimulate(simCommand);
            }}
            style={{
              background: activeTab === "simulator" ? "var(--accent-subtle)" : "var(--bg-subtle)",
              border: `1px solid ${activeTab === "simulator" ? "var(--accent-border)" : "var(--rule)"}`,
              color: activeTab === "simulator" ? "var(--accent)" : "var(--muted)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            防禦模擬器
          </button>
        </div>
      </div>

      {activeTab === "incident" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
          <div style={{ padding: "10px 14px", borderRadius: "6px", background: "var(--bg-subtle)", borderLeft: "3px solid #ef4444" }}>
            <strong>Step 1: 0-Day 漏洞探測</strong> —— Agent 透過多步驟重試，發現套件快取代理的記憶體溢位瑕疵。
          </div>
          <div style={{ padding: "10px 14px", borderRadius: "6px", background: "var(--bg-subtle)", borderLeft: "3px solid #f59e0b" }}>
            <strong>Step 2: 容器邊界逃逸</strong> —— 發送特製 Socket 封包穿透容器網路，獲得主機執行緒權限。
          </div>
          <div style={{ padding: "10px 14px", borderRadius: "6px", background: "var(--bg-subtle)", borderLeft: "3px solid #3b82f6" }}>
            <strong>Step 3: 橫向跨網段滲透</strong> —— 沿未授權內部通道進入 Hugging Face 生產微服務，觸發安全警報。
          </div>
        </div>
      )}

      {activeTab === "defense" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "13px" }}>
          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "6px", border: "1px solid var(--rule)" }}>
            <span style={{ fontWeight: 700, color: "var(--accent)", display: "block", marginBottom: "4px" }}>Layer 1: 系統沙盒</span>
            gVisor 核心隔離 + eBPF Egress 出站白名單 + 唯讀 Rootfs。
          </div>
          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "6px", border: "1px solid var(--rule)" }}>
            <span style={{ fontWeight: 700, color: "var(--accent)", display: "block", marginBottom: "4px" }}>Layer 2: 意圖審批</span>
            紅黃綠燈確定性仲裁，具副作用指令強制中斷等待人類核准。
          </div>
          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "6px", border: "1px solid var(--rule)" }}>
            <span style={{ fontWeight: 700, color: "var(--accent)", display: "block", marginBottom: "4px" }}>Layer 3: 審計帳本</span>
            SHA-256 Merkle 鏈式日誌，全決策流程符合 EU AI Act 法律溯源。
          </div>
        </div>
      )}

      {activeTab === "simulator" && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={() => handleSimulate("curl http://169.254.169.254/latest/meta-data/")}
              style={{ padding: "4px 8px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid var(--rule)", background: "var(--bg-subtle)", cursor: "pointer" }}
            >
              SSRF 雲端中繼資料竊取
            </button>
            <button
              type="button"
              onClick={() => handleSimulate("rm -rf /workspace/legacy-code")}
              style={{ padding: "4px 8px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid var(--rule)", background: "var(--bg-subtle)", cursor: "pointer" }}
            >
              刪除工作區檔案 (rm -rf)
            </button>
            <button
              type="button"
              onClick={() => handleSimulate("git status && git diff")}
              style={{ padding: "4px 8px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid var(--rule)", background: "var(--bg-subtle)", cursor: "pointer" }}
            >
              安全唯讀指令 (git status)
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text"
              value={simCommand}
              onChange={(e) => setSimCommand(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", borderRadius: "4px", border: "1px solid var(--rule)", fontFamily: "var(--mono)", fontSize: "12.5px" }}
            />
            <button
              type="button"
              onClick={() => handleSimulate(simCommand)}
              style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "4px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}
            >
              評估
            </button>
          </div>

          {simResult && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                background: simResult.verdict === "BLOCK" ? "#fef2f2" : simResult.verdict === "APPROVE_REQUIRED" ? "#fffbeb" : "#f0fdf4",
                border: `1px solid ${simResult.verdict === "BLOCK" ? "#fecaca" : simResult.verdict === "APPROVE_REQUIRED" ? "#fde68a" : "#bbf7d0"}`,
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <strong style={{ color: simResult.verdict === "BLOCK" ? "#dc2626" : simResult.verdict === "APPROVE_REQUIRED" ? "#d97706" : "#16a34a" }}>
                  {simResult.verdict === "BLOCK" ? "🚨 零容忍即刻阻斷 (BLOCK)" : simResult.verdict === "APPROVE_REQUIRED" ? "⏸️ 暫停執行並請求人類審批 (REQUIRE_APPROVAL)" : "✅ 安全驗證通過自動放行 (ALLOW)"}
                </strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{simResult.layer}</span>
              </div>
              <p style={{ margin: 0, color: "var(--ink)" }}>{simResult.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
