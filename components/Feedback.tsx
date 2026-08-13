"use client";

import { useEffect, useState } from "react";

type Reaction = "useful" | "not-useful" | null;
const key = "mobile-pulse-feedback";

function readFeedback(slug: string): Reaction {
  try {
    const all = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, Reaction>;
    return all[slug] ?? null;
  } catch {
    return null;
  }
}

export function Feedback({ slug }: { slug: string }) {
  const [reaction, setReaction] = useState<Reaction>(null);

  useEffect(() => setReaction(readFeedback(slug)), [slug]);

  function choose(next: Exclude<Reaction, null>) {
    const selected = reaction === next ? null : next;
    setReaction(selected);
    try {
      const all = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, Reaction>;
      if (selected) all[slug] = selected;
      else delete all[slug];
      window.localStorage.setItem(key, JSON.stringify(all));
    } catch {
      // The current page remains usable when storage is unavailable.
    }
  }

  return (
    <section className="feedback" aria-labelledby="feedback-title">
      <div>
        <p className="eyebrow">READER SIGNAL</p>
        <h2 id="feedback-title">這篇週報有幫助嗎？</h2>
      </div>
      <div className="feedback-actions">
        <button className={reaction === "useful" ? "selected useful" : ""} type="button" aria-pressed={reaction === "useful"} onClick={() => choose("useful")}>♥ 有用</button>
        <button className={reaction === "not-useful" ? "selected not-useful" : ""} type="button" aria-pressed={reaction === "not-useful"} onClick={() => choose("not-useful")}>↓ 沒用</button>
      </div>
      <p className="feedback-note">你的選擇只會保存在這台裝置，可再次點擊取消或改選。</p>
    </section>
  );
}
