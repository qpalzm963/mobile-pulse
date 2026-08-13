import { ArticleDirectory } from "../components/ArticleDirectory";
import { ARTICLES } from "../data/articles";

export default function Home() {
  const featured = ARTICLES.find((article) => article.featured) ?? ARTICLES[0];
  return <main>
    <header className="site-header"><a className="brand" href="/">MOBILE <i>PULSE</i></a><p>APP DEVELOPMENT FIELD NOTES · EVERY WEEK</p><span className="issue">ISSUE 001 / 2026</span></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">WEEKLY INTELLIGENCE / 32</p><h1>讓工具<br /><em>變成節奏。</em></h1><p className="hero-intro">追蹤 App 開發現場真正值得試的技術、框架與工作流。少一點雜訊，多一點能立即帶回團隊的訊號。</p><a className="primary-link" href={featured.href}>閱讀本期焦點 <span>↘</span></a></div><a className="feature-card" href={featured.href}><div className="feature-art" style={{ backgroundImage: `url(${featured.coverImage})` }} /><div className="feature-label"><p>FEATURED DISPATCH</p><h2>{featured.title}</h2><span>{featured.publishedAt} · 6 MIN READ</span></div></a></section>
    <section className="dispatches"><div className="section-heading"><p className="eyebrow">EXPLORE THE ARCHIVE</p><h2>最新文章</h2><span>依你關注的領域篩選</span></div><ArticleDirectory /></section>
    <footer><span>MOBILE PULSE</span><p>為持續打造產品的人整理每週開發訊號。</p><p>所有文章均附原始來源。</p></footer>
  </main>;
}
