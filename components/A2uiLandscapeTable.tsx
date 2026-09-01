const COMPARISONS = [
  {
    name: "A2UI (Google)",
    pros: "安全優先、框架無關、開放標準、型別與目錄約束",
    cons: "處於早期階段 (v0.8/v0.9)，需建立本地 Renderer",
    highlight: true,
  },
  {
    name: "AG UI",
    pros: "即時串流、React 整合度高",
    cons: "與 React 生態系強耦合，難以原生跨平台",
    highlight: false,
  },
  {
    name: "直接生成 HTML / Dart",
    pros: "最大彈性、無需預先定義元件",
    cons: "極大安全漏洞 (XSS/任意代碼執行)、破壞 Design System",
    highlight: false,
  },
  {
    name: "純 Markdown",
    pros: "極簡、通用、零實作門檻",
    cons: "無互動能力 (缺乏日期選擇、滑桿、多步驟表單)",
    highlight: false,
  },
] as const;

export function A2uiLandscapeTable() {
  return (
    <section className="flutter-concept-map" aria-labelledby="a2ui-landscape-title">
      <p className="eyebrow">4 種 GenUI 方案橫向比較</p>
      <h3 id="a2ui-landscape-title">為什麼 A2UI 押注「安全 + 可攜性」？</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">生成方案</th>
            <th scope="col">優勢 vs. 侷限</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISONS.map((row) => (
            <tr key={row.name} style={row.highlight ? { background: "var(--card)" } : undefined}>
              <th scope="row">
                {row.name}
                {row.highlight && (
                  <span style={{ display: "inline-block", marginLeft: "6px", fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: "var(--accent)", color: "#fff" }}>
                    推薦
                  </span>
                )}
              </th>
              <td>
                <strong style={{ color: "var(--ink)" }}>優點：{row.pros}</strong>
                <span style={{ color: "var(--muted)", marginTop: "4px" }}>缺點：{row.cons}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
