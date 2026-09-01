import Link from "next/link";
import { CURRENT_AI_PULSE } from "../data/ai-pulse";

export function AiPulseFeaturedSection() {
  const pulse = CURRENT_AI_PULSE;

  return (
    <section className="ai-pulse-spotlight" aria-labelledby="ai-pulse-spotlight-title">
      <div className="ai-pulse-spotlight-header">
        <div className="ai-pulse-badge-row">
          <span className="ai-pulse-pill">⚡ 近期 AI 大小事專區</span>
          <span className="ai-pulse-daterange">{pulse.dateRange}</span>
          <span className="ai-pulse-policy">當期固定更新 · 不留歷史</span>
        </div>
        <span className="ai-pulse-readtime">{pulse.readTime}</span>
      </div>

      <div className="ai-pulse-spotlight-body">
        <h2 id="ai-pulse-spotlight-title" className="ai-pulse-spotlight-title">
          <Link href={pulse.href}>{pulse.title}</Link>
        </h2>
        <p className="ai-pulse-spotlight-subtitle">{pulse.subtitle}</p>
        <p className="ai-pulse-spotlight-summary">{pulse.summary}</p>

        <div className="ai-pulse-highlights">
          <div className="ai-pulse-highlights-title">📌 本期焦點看點</div>
          <ul className="ai-pulse-highlights-list">
            {pulse.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>

        <div className="ai-pulse-spotlight-footer">
          <Link href={pulse.href} className="ai-pulse-read-btn">
            閱讀本期 AI 大小事全文 →
          </Link>
          <div className="ai-pulse-tags">
            {pulse.tags.map((tag) => (
              <span key={tag} className="ai-pulse-tag-item">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
