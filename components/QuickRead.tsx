/**
 * 快讀清單。給沒空看完整篇的人掃三行就走。
 *
 * 放在文章開頭而不是結尾：讀者決定要不要往下讀是在首屏發生的，
 * 放結尾等於只服務已經讀完的人。
 *
 * 沒有做成可摺疊：摺疊需要 client component 與鍵盤處理，而三行字
 * 本來就不佔版面，收起來省下的空間不值得那些程式碼。
 */
export function QuickRead({ items }: { items: string[] }) {
  return (
    <section className="quick-read" aria-labelledby="quick-read-title">
      <p className="eyebrow" id="quick-read-title">
        30 秒快讀
      </p>
      <ol>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}
