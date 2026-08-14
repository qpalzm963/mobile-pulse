"use client";

import { useEffect, useState } from "react";
import { readOrCreateVisitorId } from "../lib/visitor-id";

type Reaction = "useful" | "not_useful";

// 樣式表用連字號的 .not-useful，API 用底線的 not_useful。
// 在這裡做一次映射，app/globals.css 不必動。
const CLASS_NAME: Record<Reaction, string> = {
  useful: "useful",
  not_useful: "not-useful",
};

function visitorId() {
  if (typeof window === "undefined") return null;
  return readOrCreateVisitorId(window.localStorage);
}

export function Feedback({ slug }: { slug: string }) {
  const [reaction, setReaction] = useState<Reaction | null>(null);

  // 瀏覽記錄掛在這裡而不是各篇文章頁：文章是一篇一個手寫 TSX，
  // 任何「每篇要記得加」的步驟都會被漏掉。
  useEffect(() => {
    const id = visitorId();
    if (!id) return; // storage 不可用：不記錄瀏覽，回饋僅存在於當前畫面

    void fetch(`/api/articles/${slug}/view`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId: id }),
    }).catch(() => {
      // fire-and-forget：統計失敗不能影響閱讀
    });

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/articles/${slug}/feedback`, {
          headers: { "x-visitor-id": id },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { reaction: Reaction | null };
        if (!cancelled) setReaction(data.reaction);
      } catch {
        // 讀不到就維持未選取，讀者仍可重新選擇
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function choose(next: Reaction) {
    const previous = reaction;
    const selected = previous === next ? null : next;
    setReaction(selected);

    const id = visitorId();
    if (!id) return;

    try {
      const response = await fetch(`/api/articles/${slug}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitorId: id, reaction: selected ?? "clear" }),
      });
      if (!response.ok) throw new Error(`feedback failed: ${response.status}`);
      const data = (await response.json()) as { reaction: Reaction | null };
      setReaction(data.reaction);
    } catch {
      // 寫入失敗就回捲。顯示一個其實沒存進去的選擇，比顯示未選取更糟。
      setReaction(previous);
    }
  }

  function buttonClass(value: Reaction) {
    return reaction === value ? `selected ${CLASS_NAME[value]}` : "";
  }

  return (
    <section className="feedback" aria-labelledby="feedback-title">
      <div>
        <p className="eyebrow">READER SIGNAL</p>
        <h2 id="feedback-title">這篇週報有幫助嗎？</h2>
      </div>
      <div className="feedback-actions">
        <button className={buttonClass("useful")} type="button" aria-pressed={reaction === "useful"} onClick={() => void choose("useful")}>♥ 有用</button>
        <button className={buttonClass("not_useful")} type="button" aria-pressed={reaction === "not_useful"} onClick={() => void choose("not_useful")}>↓ 沒用</button>
      </div>
      <p className="feedback-note">你的選擇會匿名保存，可再次點擊取消或改選。</p>
    </section>
  );
}
