const RENDERER_GUARANTEES = [
  "catalog 沒列出的 widget 不渲染；它不是 agent 想要就能出現。",
  "收到未知元件時顯示 fallback，不要硬畫出一個看似可用的介面。",
  "binding 對不上時不要猜資料要放哪裡，改顯示 fallback 並記錄問題。",
  "onPressed 只回傳 allowlist 裡的 action，再由既有 callback／API 流程處理。",
];

const AGENT_LIMITS = [
  "不能產生或執行任意 Dart 程式碼。",
  "不能讀取 token、裝置能力或 App 的私有狀態。",
  "不能跳過付款確認或 authorization，直接付款、刪除資料或修改權限。",
];

/**
 * 對照 renderer 的責任與 agent 的權限限制，讓 A2UI 的控制邊界可被快速掃讀。
 * 內容刻意採用清單，而非互動控制項，避免把教學示意誤認成可執行權限設定。
 */
export function ControlBoundary() {
  return (
    <section className="control-boundary" aria-label="Flutter App 與 agent 的控制邊界">
      <section className="control-boundary-renderer" aria-labelledby="renderer-guarantees-title">
        <p className="eyebrow" id="renderer-guarantees-title">
          Flutter App 要守住的規則
        </p>
        <ul>
          {RENDERER_GUARANTEES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="control-boundary-agent" aria-labelledby="agent-limits-title">
        <p className="eyebrow" id="agent-limits-title">
          Agent 做不到的事
        </p>
        <ul>
          {AGENT_LIMITS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
