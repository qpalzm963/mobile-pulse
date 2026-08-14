import Link from "next/link";
import { ArticleDirectory } from "../components/ArticleDirectory";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/">
          MOBILE <i>PULSE</i>
        </Link>
        <p>APP DEVELOPMENT FIELD NOTES · EVERY WEEK</p>
        <span className="issue">ISSUE 001 / 2026</span>
      </header>

      <ArticleDirectory>
        <div className="lede">
          <p className="eyebrow">App development field notes</p>
          <h1>整理訊號，留給真正要交付產品的人</h1>
          <p>
            追蹤 App 開發現場真正值得試的技術、框架與工作流。少一點雜訊，多一點能立即帶回團隊的訊號。所有文章均附原始來源。
          </p>
        </div>
      </ArticleDirectory>

      <footer>
        <span>MOBILE PULSE</span>
        <p>為持續打造產品的人整理每週開發訊號。</p>
        <p>所有文章均附原始來源。</p>
      </footer>
    </main>
  );
}
