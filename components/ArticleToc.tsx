"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string };

/**
 * 文章目錄。掃描已渲染的 .article-body h2 自動產生，並在缺 id 時補上。
 *
 * 刻意不要求作者在每個 h2 手寫 id：文章是一篇一個手寫 TSX，任何
 * 「每篇要記得加」的步驟都會被漏掉，漏掉的那篇目錄就會少一段。
 *
 * 找不到任何 h2 就整個不渲染，不留一塊空欄位。
 */
export function ArticleToc() {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    // 等一幀再讀，確保文章內容已經上畫面。
    const frame = requestAnimationFrame(() => {
      const found: Heading[] = [];
      document
        .querySelectorAll<HTMLHeadingElement>(".article-body h2")
        .forEach((heading, index) => {
          // 回饋區也在 .article-body 裡，但它的標題不是文章章節。
          if (heading.closest(".feedback")) return;
          if (!heading.id) heading.id = `section-${index + 1}`;
          const text = heading.textContent?.trim();
          if (text) found.push({ id: heading.id, text });
        });
      setHeadings(found);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="toc" aria-label="本頁內容">
      <p>本頁內容</p>
      {headings.map((heading) => (
        <a href={`#${heading.id}`} key={heading.id}>
          {heading.text}
        </a>
      ))}
    </nav>
  );
}
