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
    title: "使用者說：我要訂位",
    detail:
      "聊天裡還不知道日期和人數。agent 不用猜，而是請 App 顯示一個可填寫的訂位表單。",
    handoff: "正式名稱：產生宣告式 UI 描述",
  },
  {
    number: "02",
    role: "STREAM",
    title: "App 收到表單說明",
    detail:
      "訊息只說明要有日期、人數和送出按鈕，以及它們的初始值；傳來的是資料，不是 Dart 程式碼。",
    handoff: "正式名稱：JSONL/SSE 的 surfaceUpdate、dataModelUpdate",
  },
  {
    number: "03",
    role: "FLUTTER RENDERER",
    title: "Flutter App 自己組出 widget",
    detail:
      "renderer 像一個 WidgetFactory：只從 App 已批准的清單取出 Card、TextField、DatePicker 和 Button。遇到不認得的元件，就顯示 fallback。",
    handoff: "正式名稱：renderer 依 catalog 映射 widget tree",
  },
  {
    number: "04",
    role: "USER ACTION",
    title: "使用者按下送出",
    detail:
      "Button 的 onPressed 只回傳「使用者想送出訂位」這個事件。真正建立訂位，仍要走既有 API、登入狀態與授權檢查。",
    handoff: "正式名稱：userAction 回傳受控 action",
  },
];

/**
 * 以一次預約表單，說明 A2UI 從 agent 描述到 Flutter 操作事件的完整資料流。
 * 元件只負責呈現：實際串流、widget mapping 與 API 呼叫都不在這裡執行。
 */
export function A2uiTrace() {
  return (
    <section className="a2ui-trace" aria-labelledby="a2ui-trace-title">
      <p className="eyebrow">用 Flutter 熟悉的方式理解</p>
      <h3 id="a2ui-trace-title">一個訂位表單怎麼在 Flutter App 出現</h3>
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
