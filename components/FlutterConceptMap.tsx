const CONCEPTS = [
  {
    a2ui: "UI 描述 JSON",
    flutter: "遠端 UI 設定，不是 Dart",
    detail: "後端傳來的是「顯示日期欄位與送出按鈕」的資料；你的 App 不會下載或執行新的 Dart 程式碼。",
  },
  {
    a2ui: "Renderer",
    flutter: "受限制的 widget factory",
    detail: "它讀取 UI 設定，並只用你已經寫好的 Flutter widget 組出畫面。",
  },
  {
    a2ui: "Catalog",
    flutter: "Widget allowlist",
    detail: "這是 App 明確允許 renderer 使用的 widget 清單；清單外的元件不會被畫出來。",
  },
  {
    a2ui: "User action",
    flutter: "onPressed 回傳事件",
    detail: "使用者點按後，App 回傳一個受控事件；既有的驗證、授權與 API 流程仍由 App 處理。",
  },
] as const;

/**
 * 以 Flutter 已知概念對照 A2UI 名詞，協助初次接觸協定的讀者建立心智模型。
 * 表格只描述責任分工，沒有執行遠端 UI 或處理任何互動狀態。
 */
export function FlutterConceptMap() {
  return (
    <section className="flutter-concept-map" aria-labelledby="flutter-concept-map-title">
      <p className="eyebrow">先用 Flutter 的語言理解</p>
      <h3 id="flutter-concept-map-title">A2UI 其實像四個你熟悉的角色</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">A2UI 名詞</th>
            <th scope="col">Flutter 的直覺</th>
          </tr>
        </thead>
        <tbody>
          {CONCEPTS.map((concept) => (
            <tr key={concept.a2ui}>
              <th scope="row">{concept.a2ui}</th>
              <td>
                <strong>{concept.flutter}</strong>
                <span>{concept.detail}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
