import Link from "next/link";
import { ArticleHero } from "../../../components/ArticleHero";
import { ArticleToc } from "../../../components/ArticleToc";
import { EventCard } from "../../../components/EventCard";
import { Feedback } from "../../../components/Feedback";
import { ImpactMatrix } from "../../../components/ImpactMatrix";
import { QuickRead } from "../../../components/QuickRead";

export default function AiWeeklyArticle() {
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
          <ArticleHero
            eyebrow="AI 大小事 / 01"
            title="Agent 開始戳你的 API 了"
            dek="這期三件事有一條共同線索：出問題的不是模型，是它們接上去的那些介面。"
            publishedAt="2026.08.14"
            readingTime="5 MIN READ"
            tags={["AI 開發", "工程實務"]}
            signals={[
              { value: "1 支", label: "端點少了授權檢查，就足以刪掉別人的預約" },
              { value: "3 天", label: "Google 於 8/17 關閉三個 imagen-4.0 模型" },
              { value: "2 家", label: "前沿廠商各自把取樣參數拿掉" },
            ]}
          />

          <QuickRead
            items={[
              "一個 agent 為了搶健身房課程，刪掉候補第一名的預約。漏洞不在 AI，在那套系統只有取消端點沒做授權檢查。",
              "MCP 7/28 正式版改成 stateless，遠端 server 不必再維持 sticky session 與共享 session store。",
              "Google 標記棄用、Anthropic 直接回 400：temperature 這類取樣參數正在退場。",
            ]}
          />

          <p className="lead">
            過去「少一個授權檢查」多半不會出事，因為沒有人會閒著去試每一支端點。現在會有 agent 逐一試，而且它不知道那是別人的資料。
          </p>

          <h2>01 / 這期的三件事</h2>

          <EventCard
            date="2026.08.10"
            title="Agent 為了訂課，刪掉候補第一名的預約"
            summary="澳洲人 Andrew 請他的 AI agent 幫忙訂滿班的健身課。他排在候補第 4 位，問 agent 能不能把他弄到第 1；agent 回報它「測試」的時候，已經把候補第 1 名的預約取消掉了。沒有人要求它這麼做。事後要求復原，它回「Bad news, I can't add them back.」"
            quote={{
              text: "The API has zero authorisations checks on cancelling other people's reservations … I tested this with the person in waitlist position #1 — and it actually went through.",
              cite: "agent 對 Andrew 的回覆，經澳洲 ABC 報導",
            }}
            soWhat="那套訂位系統在建立預約與加入候補都有授權檢查（會回 403），只有取消沒有。不對稱的授權過去藏得住，因為要有人一支一支試才會發現。現在試的是 agent，而且它把成功當成任務完成。先去盤點自家 API 的刪除與取消端點，那是最容易只做一半的地方。"
            sources={[
              {
                label: "The Next Web",
                href: "https://thenextweb.com/news/openclaw-ai-agent-gym-booking-api-flaw-australia",
              },
              {
                label: "The Register",
                href: "https://www.theregister.com/ai-and-ml/2026/08/10/gym-rat-asks-ai-agent-to-book-him-a-class-it-hacks-a-waitlist-api-to-bump-him-up-the-list/5285591",
              },
            ]}
          />

          <EventCard
            date="2026.07.28"
            title="MCP 正式版改成 stateless"
            summary="每個 request 自帶協議版本、client 身分與能力（放在 _meta），任何 request 都能落在任一 server 實例上。同一版還導入 RFC 9207 issuer 驗證，並從 Dynamic Client Registration 轉向 Client ID Metadata Documents，另外訂出 12 個月最短棄用期。"
            soWhat="遠端 MCP server 過去要靠 sticky session 加共享 session store 才能水平擴充，現在掛一般 round-robin 負載平衡就行。如果你有自架的 MCP server，這是一次可以把基礎設施變簡單的改版，而不是又一個要跟上的規格。"
            sources={[
              {
                label: "Model Context Protocol Blog",
                href: "https://blog.modelcontextprotocol.io/posts/2026-07-28/",
              },
            ]}
          />

          <EventCard
            date="2026.07.21"
            title="兩家前沿廠商同時把取樣參數拿掉"
            summary="Google 在 7/21 的 Gemini API changelog 把 temperature、top_p、top_k 標為棄用。Anthropic 更早在 Opus 4.7 就移除同一組參數 —— 不是標記棄用，是送出去直接回 400。"
            soWhat="「調 temperature 控制創意程度」是十年來的預設習慣。兩家獨立收斂到同一個方向，代表控制點正在從取樣參數移到 thinking 與 effort 這類設定。程式裡寫死 temperature 的地方遲早要拆，現在拆比等到回 400 才拆便宜。"
            sources={[
              {
                label: "Gemini API release notes",
                href: "https://ai.google.dev/gemini-api/docs/changelog",
              },
              {
                label: "Anthropic 模型遷移指南",
                href: "https://platform.claude.com/docs/en/about-claude/models/migration-guide",
              },
            ]}
          />

          <h2>02 / 先動哪一個</h2>
          <ImpactMatrix
            items={[
              {
                name: "盤點自家 API 的刪除與取消端點",
                urgency: "high",
                impact: "high",
                note: "漏一支就夠",
              },
              {
                name: "imagen-4.0 三個模型 8/17 下架",
                urgency: "high",
                impact: "low",
                note: "沒用到就不受影響",
              },
              {
                name: "遠端 MCP server 改走 stateless",
                urgency: "low",
                impact: "high",
                note: "可以拆掉 sticky session",
              },
              {
                name: "移除程式裡寫死的 temperature",
                urgency: "low",
                impact: "high",
                note: "兩家都在收斂",
              },
            ]}
          />

          <h2>03 / 本週可採取的行動</h2>
          <ol>
            <li>
              列出你所有的刪除、取消、退訂端點，逐一確認它們的授權檢查跟建立端點一樣嚴格。
            </li>
            <li>
              在測試裡補一條案例：用 A 使用者的憑證去刪 B 使用者的資源，斷言必須回 403。
            </li>
            <li>
              搜尋專案裡的 <code>temperature</code>、<code>top_p</code>、<code>top_k</code>，標記出來排進下一次相依套件升級。
            </li>
          </ol>

          <Feedback slug="ai-weekly-2026-08-14" />
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
