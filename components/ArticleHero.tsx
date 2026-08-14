type Signal = { value: string; label: string };

/**
 * 焦點封面。品質標準要求首屏同時有標題、短摘要，以及至少一組數字或標籤。
 *
 * 數字（signals）是這個模組存在的理由：標題和摘要每篇都會寫，但「這期到底
 * 有多急」只有數字講得出來。做成必填陣列而不是選填，是為了讓漏掉它變成
 * 型別錯誤，而不是上線後才發現首屏少一塊。
 */
export function ArticleHero({
  eyebrow,
  title,
  dek,
  publishedAt,
  readingTime,
  tags,
  signals,
}: {
  eyebrow: string;
  title: string;
  dek: string;
  publishedAt: string;
  readingTime: string;
  tags: string[];
  signals: Signal[];
}) {
  return (
    <div className="article-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="dek">{dek}</p>
      <p className="article-date">
        <span>{publishedAt}</span>
        <span>{readingTime}</span>
      </p>
      <dl className="hero-signals">
        {signals.map((signal) => (
          <div key={signal.label}>
            <dt>{signal.value}</dt>
            <dd>{signal.label}</dd>
          </div>
        ))}
      </dl>
      <div className="article-tags">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </div>
  );
}
