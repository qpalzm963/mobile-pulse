import { ArticleToc } from "@/components/ArticleToc";
import { Feedback } from "@/components/Feedback";

export default function WeeklyArticle() {
  return (
    <main className="article-page">
      <header className="site-header">
        <a className="brand" href="/">
          MOBILE <i>PULSE</i>
        </a>
        <a className="back-link" href="/">
          ← 所有文章
        </a>
      </header>

      <div className="article-shell">
        <article className="article-body">
          <div className="article-intro">
            <p className="eyebrow">Weekly intelligence / 32</p>
            <h1>本週 App 開發新技術與工具週報</h1>
            <p className="dek">
              Android、Apple、Flutter 與 AI 開發工具，這週哪些更新值得放進你的開發流程？
            </p>
            <p className="article-date">
              <span>2026.08.13</span>
              <span>6 MIN READ</span>
            </p>
            <div className="article-tags">
              <span>AI 開發</span>
              <span>Android</span>
              <span>iOS</span>
              <span>跨平台</span>
            </div>
          </div>

          <img
            className="article-cover"
            src="/weekly-cover.png"
            alt="手機介面、跨平台開發與 AI 輔助開發的抽象插圖"
          />

          <p className="lead">
            這一期的共同訊號很清楚：行動開發的競爭重心，正在由「選哪個框架」移到「怎麼把 AI、IDE 與測試流程接成更快的迴路」。
          </p>

          <h2>01 / Android：IDE 與 AI 更靠近實作現場</h2>
          <p>
            Android Studio 的更新持續把生成式能力放進日常開發節點。值得留意的不是單一功能，而是它開始涵蓋設計、程式、測試與問題定位；團隊可優先挑一個重複性高的流程做小範圍驗證。
          </p>
          <blockquote>
            <p>先量測「從 issue 到可測試改動」的時間，再決定 AI 工具是否真的值得進團隊流程。</p>
          </blockquote>
          <img src="/ai-workflow.svg" alt="AI 輔助 App 開發工作流：需求到觀測迴路" />

          <h2>02 / 跨平台：框架選擇回到產品約束</h2>
          <p>
            Flutter、原生 Android 與原生 iOS 並沒有單一勝者。需要快速試錯、共用互動與設計系統時，跨平台仍有效；需要平台最前沿能力或精準效能控制時，原生路線依然穩固。
          </p>
          <img src="/framework-matrix.svg" alt="原生與跨平台開發選擇比較矩陣" />

          <h2>03 / 本週可採取的行動</h2>
          <ol>
            <li>挑一個小型功能，讓 AI 協助產出測試案例與邊界條件。</li>
            <li>在 release 前新增一項可觀測指標，例如啟動時間或 crash-free sessions。</li>
            <li>把新工具是否節省時間，寫成可被團隊檢視的兩週實驗假設。</li>
          </ol>

          <h2>來源</h2>
          <ul className="sources">
            <li>
              <a
                href="https://developer.android.com/latest-updates"
                target="_blank"
                rel="noreferrer"
              >
                Android Developers — Latest updates ↗
              </a>
            </li>
            <li>
              <a
                href="https://developer.apple.com/documentation/Updates"
                target="_blank"
                rel="noreferrer"
              >
                Apple Developer — Documentation updates ↗
              </a>
            </li>
            <li>
              <a
                href="https://docs.flutter.dev/release/archive"
                target="_blank"
                rel="noreferrer"
              >
                Flutter — Release archive ↗
              </a>
            </li>
          </ul>

          <Feedback slug="app-dev-weekly-2026-08-13" />
        </article>

        <ArticleToc />
      </div>

      <footer>
        <span>MOBILE PULSE</span>
        <p>整理訊號，留給真正要交付產品的人。</p>
      </footer>
    </main>
  );
}
