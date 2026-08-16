type TraceStep = {
  number: string;
  role: string;
  title: string;
  detail: string;
  handoff: string;
};

const STEPS: TraceStep[] = [
  {
    number: "01",
    role: "AGENT",
    title: "判斷文字不夠用",
    detail:
      "使用者要預約，日期與人數不能只靠一句聊天文字安全地猜。agent 決定請 client 顯示一個表單。",
    handoff: "輸出：宣告式 UI 描述",
  },
  {
    number: "02",
    role: "STREAM",
    title: "送出元件與資料",
    detail:
      "surfaceUpdate 與 dataModelUpdate 以 JSONL/SSE 逐筆送達；這些訊息是資料，不是 Dart 程式碼。",
    handoff: "輸出：component IDs、binding 與初始值",
  },
  {
    number: "03",
    role: "FLUTTER RENDERER",
    title: "映射為已批准的 widget",
    detail:
      "renderer 只從 app 的 catalog 取出已實作的 Card、TextField、DatePicker 與 Button；未知元件一律 fallback。",
    handoff: "輸出：使用者看得到、可操作的 Flutter UI",
  },
  {
    number: "04",
    role: "USER ACTION",
    title: "操作回到既有後端流程",
    detail:
      "使用者送出後，client 回傳 userAction；真正的預約仍由既有 API、登入狀態與授權檢查執行。",
    handoff: "輸出：受控事件，不是直接副作用",
  },
];

/**
 * 以一次預約表單，說明 A2UI 從 agent 描述到 Flutter 操作事件的完整資料流。
 * 元件只負責呈現：實際串流、widget mapping 與 API 呼叫都不在這裡執行。
 */
export function A2uiTrace() {
  return (
    <section className="a2ui-trace" aria-labelledby="a2ui-trace-title">
      <p className="eyebrow">一次表單的資料流</p>
      <h3 id="a2ui-trace-title">Agent → stream → Flutter renderer → action</h3>
      <ol>
        {STEPS.map((step) => (
          <li key={step.number}>
            <span className="a2ui-trace-number" aria-hidden="true">
              {step.number}
            </span>
            <div>
              <p className="a2ui-trace-role">{step.role}</p>
              <h4>{step.title}</h4>
              <p>{step.detail}</p>
              <span className="a2ui-trace-handoff">{step.handoff}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
