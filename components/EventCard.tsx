type Source = { label: string; href: string };

/**
 * 事件卡。一張卡一件事，來源掛在卡上。
 *
 * 來源之所以是必填而且長在卡片裡，是因為文章尾端那種集中式來源清單擋不住
 * 真正的錯誤：清單裡每個連結都是真的，卻沒有任何一條對應到某個主張，
 * 寫錯的那句話照樣過關。綁在卡上，改哪張卡就得面對它的出處。
 *
 * soWhat 也是必填：只講發生什麼事的卡片是新聞稿，不是這個站要的東西。
 *
 * sources 是陣列而非單一來源：跨廠商的主張（「兩家都把某參數拿掉」）需要
 * 兩邊各自的出處，只留一個等於有一半沒有依據。
 */
export function EventCard({
  date,
  title,
  summary,
  soWhat,
  sources,
  quote,
}: {
  date: string;
  title: string;
  summary: string;
  soWhat: string;
  sources: Source[];
  quote?: { text: string; cite: string };
}) {
  return (
    <article className="event-card">
      <p className="event-date">{date}</p>
      <h3>{title}</h3>
      <p className="event-summary">{summary}</p>
      {quote ? (
        <blockquote className="event-quote">
          <p>{quote.text}</p>
          <cite>{quote.cite}</cite>
        </blockquote>
      ) : null}
      <p className="event-sowhat">
        <strong>為什麼重要</strong>
        {soWhat}
      </p>
      <p className="event-sources">
        {sources.map((source) => (
          <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
            {source.label} ↗
          </a>
        ))}
      </p>
    </article>
  );
}
