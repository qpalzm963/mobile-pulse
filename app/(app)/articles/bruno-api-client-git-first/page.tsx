import Link from "next/link";
import { ArticleToc } from "@/components/ArticleToc";
import { BrunoVsCloudComparison } from "@/components/BrunoVsCloudComparison";
import { BrunoWorkflowDiagram } from "@/components/BrunoWorkflowDiagram";
import { Feedback } from "@/components/Feedback";

export default function BrunoApiClientArticle() {
  return (
    <main className="article-page">
      <header className="site-header">
        <Link className="brand" href="/">
          MOBILE <i>PULSE</i>
        </Link>
        <Link className="back-link" href="/">
          ← 所有文章
        </Link>
      </header>

      <div className="article-shell">
        <article className="article-body">
          <div className="article-intro">
            <span className="eyebrow">開發工具 / 工程實務</span>
            <h1>我們為什麼受夠了 Postman？—— 談談 Bruno 如何把 API 控制權還給前後端工程師</h1>
            <p className="dek">
              切換分支 API 沒同步、測 API 被迫先登入、隨手戳測試卻擔心 Token 外洩？Bruno 把 API 集合回歸純文字與 Git，打破前後端協作的斷層。
            </p>
            <p className="article-date">
              <span>2026.08.16</span>
              <span>•</span>
              <span>5 MIN READ</span>
              <span>•</span>
              <span>MOBILE PULSE 編輯部</span>
            </p>
          </div>

          <p className="lead">
            後端剛發 PR，前端拉下來測試卻噴 500。前端問：「新欄位格式是怎樣？」後端回：「我忘記把 Postman 匯出給你了，等我一下。」
          </p>

          <p>
            或者更常見的：你只想在本地戳一下 <code>localhost:8080</code>，打開工具卻跳出全螢幕登入提示與方案升級通知，連隨手存的 Scratch Pad 都不見蹤影。
          </p>

          <p>
            工具本該加速開發，很多時候我們卻花了大把時間在「服侍工具」。這也是開源、離線優先的 <strong>Bruno</strong> 迅速受到工程師歡迎的原因。
          </p>

          <h2>API 工具，本來就不該是個封閉的「雲端 SaaS」</h2>

          <p>
            程式碼有 Git、相依套件有 <code>package.json</code>、環境變數有 <code>.env</code>。為什麼「API 怎麼呼叫」這件事，過去十幾年我們卻習慣丟進封閉的第三方雲端？
          </p>

          <p>
            當 API 集合脫離了程式碼倉庫，三個嚴重的痛點就必然發生：
          </p>

          <ul>
            <li><strong>分支與 API 永遠脫節</strong>：你在跑 <code>feature/checkout-v2</code>，前端在跑 <code>main</code>。大家在同一個雲端 Workspace 互相覆蓋參數，最後專案充斥數十個過期的個人測試集合。</li>
            <li><strong>機密外洩與資安隱憂</strong>：測試用 Bearer Token 與內部 Key 被預設同步到第三方伺服器，對資安審查與隱私合規是個風險。</li>
            <li><strong>手動同步成本高</strong>：改 API ➔ 匯出 JSON ➔ 傳通訊軟體 ➔ 手動匯入覆蓋。在 CI/CD 自動化普及的今天，這個流程極度原始。</li>
          </ul>

          <BrunoVsCloudComparison />

          <h2>核心本質：API 就是檔案，檔案就歸 Git 管</h2>

          <p>
            Bruno 沒有中心化伺服器，也不強迫登入。
          </p>

          <p>
            在 Bruno 建立 API 集合，本質上就是在專案資料夾裡建立 <code>.bru</code> 純文字檔案：
          </p>

          <div className="terminal-block">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="dot-red"></span>
                <span className="dot-yellow"></span>
                <span className="dot-green"></span>
              </div>
              <span>api/orders/create.bru</span>
              <span>BRU</span>
            </div>
            <pre><code>{`meta {
  name: 建立訂單
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/api/v1/orders
  body: json
  auth: bearer
}

auth:bearer {
  token: {{authToken}}
}

body:json {
  {
    "productId": "prod_123",
    "quantity": 2
  }
}

assert {
  res.status: eq 201
  res.body.orderId: isDefined
}`}</code></pre>
          </div>

          <p>
            <strong>這帶來三個關鍵轉變：</strong>
          </p>

          <ul>
            <li><strong>發 PR 即交付 API 規格</strong>：後端在專案的 <code>/api</code> 新增 <code>.bru</code> 檔，跟著程式碼一起 commit。Reviewer 審查 Code 時一併驗收 API 契約與 Assert 條件。</li>
            <li><strong>切換分支，API 自動切換</strong>：前端切換 Git 分支，Bruno 畫面上的 API 集合隨之切換，永遠不會拿到過期規格。</li>
            <li><strong>行級 Diff 與 Git Merge 友善</strong>：純文字結構讓多人協作時能自動合併，不再因為巨大 JSON 衝突而報銷。</li>
          </ul>

          <h2>前後端與 CI/CD 協作流</h2>

          <BrunoWorkflowDiagram />

          <p>
            Bruno 不只是個人的除錯器，更是前後端之間的「可執行契約」：
          </p>

          <ul>
            <li><strong>後端與 CI 守門員</strong>：本機秒開除錯，並可透過 <code>bru run</code> 將集合無縫整合進 GitHub Actions，每次 push 自動跑端點回歸測試。</li>
            <li><strong>前端與 App 開發者鏡頭</strong>：畫面未如預期時，點開 Bruno 戳一次——回傳 500 代表後端異常，回傳 200 代表前端狀態處理問題，秒速釐清責任邊界。</li>
          </ul>

          <h2>總結：把簡單的事情做對</h2>

          <p>
            記錄幾行 HTTP 請求本不需要龐大臃腫的訂閱制軟體。Bruno 只是做對了一件事：<strong>把資料的所有權與版本控制，重新還給工程師的本機與 Git 倉庫。</strong>
          </p>

          <h2>延伸資源</h2>
          <ul className="sources">
            <li>
              <a href="https://www.usebruno.com/" target="_blank" rel="noreferrer">
                Bruno 官方網站 ↗
              </a>
            </li>
            <li>
              <a href="https://github.com/usebruno/bruno" target="_blank" rel="noreferrer">
                Bruno GitHub 開源倉庫 ↗
              </a>
            </li>
          </ul>

          <Feedback slug="bruno-api-client-git-first" />
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
