import Link from "next/link";
import { ArticleHero } from "@/components/ArticleHero";
import { ArticleToc } from "@/components/ArticleToc";
import { Feedback } from "@/components/Feedback";
import { GenUiArchitectureInteractive } from "@/components/GenUiArchitectureInteractive";
import { QuickRead } from "@/components/QuickRead";

export default function GoogleA2uiAgentsSpeakUiArticle() {
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
            eyebrow="架構剖析 / GenUI"
            title="超越純文字對話：解構 A2UI 宣告式介面協定"
            dek="當 AI Agent 試圖從『問答工具』轉變為『任務執行者』，純文字已成為最大瓶頸。Google 開源的 A2UI 為生成式介面劃定了全新的安全邊界與資料模型。"
            publishedAt="2026.08.16"
            readingTime="9 MIN READ"
            tags={["AI 開發", "跨平台", "工程實務"]}
            signals={[
              { value: "雙通道", label: "介面結構 (Surface) 與資料狀態 (Data) 解耦更新" },
              { value: "零信任", label: "Agent 僅具備提案權，完全隔離副作用執行" },
              { value: "AST 哲學", label: "將 UI 視為抽象語法樹，而非純文字代碼" },
            ]}
          />

          <QuickRead
            items={[
              "文字適合發散式思考，但對高資訊密度（如多條件篩選、選位、排程）的互動效率極低。",
              "A2UI 本質上是將 UI 視為「宣告式抽象語法樹（AST）」，由 Agent 發布狀態快照，Client 負責編譯與呈現。",
              "核心創新在於 Surface 與 DataModel 的雙通道分離，解決了 LLM 串流生成時容易閃爍與結構損毀的痛點。",
            ]}
          />

          <p className="lead">
            過去兩年，AI 應用的主流介面幾乎被「一個輸入框加滾動對話串」壟斷。但只要涉及多欄位表單、即時篩選或複雜資料比對，純文字的溝通成本就會急劇上升。Google 推出的 <strong>A2UI（Agent-to-User Interface）</strong>，正是為了解決這道「互動頻寬瓶頸」所提出的開放協定。
          </p>

          <h2>01 / 文字對話的互動頻寬極限</h2>
          <p>
            圖形使用者介面（GUI）之所以歷久不衰，是因為人眼對空間佈局、顏色層級與即時操控（如拖曳滑桿、切換開關）的接收頻寬，遠高於逐行閱讀文字。
          </p>
          <p>
            當 Agent 協助使用者規劃行程時：
          </p>
          <ul>
            <li><strong>純文字模式</strong>：Agent 輸出 500 字推薦，使用者必須手動閱讀、挑出時段，再打字回覆「改約 18:30 兩位」。</li>
            <li><strong>生成式介面（GenUI）模式</strong>：Agent 直接呈現在地化時段卡片與人數調整器，使用者一指點擊即完成確認。</li>
          </ul>
          <p>
            然而，過去業界在實現 GenUI 時，常陷入「直接讓模型寫前端 Code」的誤區。這在技術架構上是極度危險且脆弱的——不僅破壞了工程團隊辛勤建立的 Design System，更為應用程式開了一扇潛在的 RCE（遠端代碼執行）後門。
          </p>

          <h2>02 / 4 種主流 GenUI 技術路線評估</h2>
          <p>
            在理解 A2UI 之前，我們必須將目前業界探索動態介面的 4 種主要路線做橫向對比：
          </p>

          {/* 互動式四大架構流程圖與多維度指標 */}
          <GenUiArchitectureInteractive />

          <h2>03 / 核心架構：雙通道資料流（Surface vs. DataModel）</h2>
          <p>
            A2UI 最深思熟慮的架構設計，在於將<strong>「介面結構（Surface）」</strong>與<strong>「資料數值（DataModel）」</strong>徹底拆成獨立通道：
          </p>

          <pre><code>{`// 通道 1：surfaceUpdate（定義樹狀結構與元件關係）
{
  "surfaceId": "filter_panel",
  "root": "container",
  "components": {
    "container": { "type": "Column", "children": ["price_range", "btn_apply"] },
    "price_range": { "type": "Slider", "props": { "min": 0, "max": 5000, "binding": "/filter/maxPrice" } },
    "btn_apply": { "type": "Button", "props": { "label": "套用篩選", "action": "apply_filter" } }
  }
}

// 通道 2：dataModelUpdate（純資料狀態變更）
{
  "filter": { "maxPrice": 2500 }
}`}</code></pre>

          <h3>為什麼要拆成雙通道？</h3>
          <ol>
            <li><strong>串流防閃爍（Anti-Flickering）</strong>：當模型還在思考或調整數值時，Client 端只需要更新 <code>dataModelUpdate</code>，既有的 UI 元件不必被重新銷毀與重建，保證動畫與焦點流暢。</li>
            <li><strong>扁平化字典（Flat ID Map）</strong>：所有元件以 ID 平鋪，容器元件僅記錄 <code>children: ["id1", "id2"]</code>。這大幅減輕了 LLM 串流生成深度嵌套 JSON 時括號錯位的問題。</li>
            <li><strong>雙向綁定與局部刷新</strong>：使用者在畫面上滑動 Slider，只會即時修改本地的 DataModel，不需重新向 Agent 請求整個 Surface。</li>
          </ol>

          <h2>04 / 零信任架構：提案權與執行權的分離</h2>
          <p>
            在企業級系統中導入 AI 時，最大的顧慮永遠是：「如果模型產生幻覺或被 Prompt 注入，會不會誤刪資料或發動未授權交易？」
          </p>
          <p>
            A2UI 在架構上落實了嚴格的<strong>零信任（Zero-Trust）原則</strong>：
          </p>
          <ul>
            <li><strong>Agent 僅具備「提案權（Proposal Authority）」</strong>：Agent 生成的 UI 按鈕，只是在畫面上標記一個意圖代碼（例如 <code>action: "approve_transfer"</code>）。</li>
            <li><strong>Client 擁有「驗證權（Validation Authority）」</strong>：Client 的 Renderer 檢驗該 Action 是否存在於團隊的 Allowlist 中，不存在則拒絕掛載。</li>
            <li><strong>後端掌握「執行權（Execution Authority）」</strong>：當使用者在 UI 上點擊按鈕，送出 Action 時，後端 API 必須依循既有的 OAuth Session、權限策略與二次確認邏輯執行操作，絕不盲目信任 Client 傳來的意圖。</li>
          </ul>

          <h2>05 / 團隊該如何評估導入時機？</h2>
          <p>
            A2UI 雖然規格清晰，但目前仍處於標準演進期（v0.8 / v0.9）。工程團隊在評估是否導入時，建議依循以下判斷準則：
          </p>

          <p><strong>適合立即採用的場景：</strong></p>
          <ul>
            <li>內部工具或輔助型 Agent（如工程日誌查詢、自訂報表生成器）。</li>
            <li>對話流程中包含大量「動態多選一」或「條件式表單」的產品。</li>
            <li>團隊已有成熟的 Design System，希望將其封裝為 Catalog 供 Agent 呼叫。</li>
          </ul>

          <p><strong>建議暫緩或維持固定 UI 的場景：</strong></p>
          <ul>
            <li>核心高頻交易路徑（如購物結帳頁、登入流程）——這些應追求極致載入速度與固定轉換率。</li>
            <li>需要高度客製化動畫或複雜手勢操作的遊戲與繪圖介面。</li>
          </ul>

          <h2>06 / 總結：邁向人機協作的下一代介面標準</h2>
          <p>
            A2UI 的出現標誌著生成式 AI 正在經歷從「玩具」到「生產力基礎設施」的質變。它證明了：我們不需要在「AI 的靈活性」與「工程的安全性」之間二選一。
          </p>
          <p>
            透過把 UI 收斂為受約束的宣告式資料契約，團隊可以在不犧牲既有架構穩定性的前提下，讓 AI Agent 具備真正自然、直覺且高效的視覺互動能力。
          </p>

          <h2>延伸資源</h2>
          <ul className="sources">
            <li>
              <a href="https://github.com/google/A2UI" target="_blank" rel="noreferrer">
                Google A2UI 官方開源專案 (GitHub) ↗
              </a>
            </li>
            <li>
              <a href="https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9/docs/a2ui_extension_specification.md" target="_blank" rel="noreferrer">
                A2UI v0.9 協定擴充規格文件 ↗
              </a>
            </li>
            <li>
              <a href="https://github.com/flutter/genui" target="_blank" rel="noreferrer">
                Flutter GenUI SDK 實驗專案 ↗
              </a>
            </li>
          </ul>

          <Feedback slug="google-a2ui-agents-speak-ui" />
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
