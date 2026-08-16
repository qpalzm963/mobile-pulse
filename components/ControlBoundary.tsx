const RENDERER_GUARANTEES = [
  "只渲染 catalog 已註冊的 Flutter widget 與 props。",
  "收到未知 component、失效 binding 或不相容 catalog 時顯示受控 fallback。",
  "將 userAction 以既有 callback／API 流程回送並記錄事件。",
];

const AGENT_LIMITS = [
  "不能產生或執行任意 Dart 程式碼。",
  "不能直接讀取 token、裝置能力或 app 私有狀態。",
  "不能跳過確認與授權，直接付款、刪除資料或修改權限。",
];

/**
 * 對照 renderer 的責任與 agent 的權限限制，讓 A2UI 的控制邊界可被快速掃讀。
 * 內容刻意採用清單，而非互動控制項，避免把教學示意誤認成可執行權限設定。
 */
export function ControlBoundary() {
  return (
    <section className="control-boundary" aria-label="A2UI 的控制邊界">
      <section className="control-boundary-renderer" aria-labelledby="renderer-guarantees-title">
        <p className="eyebrow" id="renderer-guarantees-title">
          Flutter renderer 必須保證
        </p>
        <ul>
          {RENDERER_GUARANTEES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="control-boundary-agent" aria-labelledby="agent-limits-title">
        <p className="eyebrow" id="agent-limits-title">
          Agent 不應決定
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
