type Level = "high" | "low";
type Item = { name: string; urgency: Level; impact: Level; note?: string };

/**
 * 影響力矩陣。急迫度 × 影響範圍，讀者掃一眼知道先動哪個。
 *
 * 象限標題寫在每一格裡（而不是只靠外圍的座標軸文字），因為窄螢幕會把
 * 2×2 攤成單欄；只有座標軸的話，攤開後每格就失去意義。螢幕閱讀器讀到的
 * 也是同一份標題，不需要另外補 aria 說明。
 */
const QUADRANTS: { key: string; heading: string; urgency: Level; impact: Level }[] = [
  { key: "now", heading: "現在就處理", urgency: "high", impact: "high" },
  { key: "plan", heading: "排進計畫", urgency: "low", impact: "high" },
  { key: "aware", heading: "知道就好", urgency: "high", impact: "low" },
  { key: "skip", heading: "可以略過", urgency: "low", impact: "low" },
];

export function ImpactMatrix({ items }: { items: Item[] }) {
  return (
    <div className="impact-matrix">
      <p className="matrix-axis" aria-hidden="true">
        縱軸：急迫度 · 橫軸：影響範圍
      </p>
      <div className="matrix-grid">
        {QUADRANTS.map((quadrant) => {
          const matched = items.filter(
            (item) => item.urgency === quadrant.urgency && item.impact === quadrant.impact
          );
          return (
            <section className={`matrix-cell is-${quadrant.key}`} key={quadrant.key}>
              <h4>{quadrant.heading}</h4>
              {matched.length === 0 ? (
                <p className="matrix-empty">這期沒有</p>
              ) : (
                <ul>
                  {matched.map((item) => (
                    <li key={item.name}>
                      {item.name}
                      {item.note ? <span>{item.note}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
