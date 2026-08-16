import Link from "next/link";
import { A2uiLandscapeTable } from "../../../components/A2uiLandscapeTable";
import { A2uiTrace } from "../../../components/A2uiTrace";
import { ArticleHero } from "../../../components/ArticleHero";
import { ArticleToc } from "../../../components/ArticleToc";
import { ControlBoundary } from "../../../components/ControlBoundary";
import { Feedback } from "../../../components/Feedback";
import { FlutterConceptMap } from "../../../components/FlutterConceptMap";
import { QuickRead } from "../../../components/QuickRead";

export default function A2uiFlutterRendererArticle() {
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
            eyebrow="AI 開發 / 專題報導"
            title="當 AI Agent 學會「說 UI」：A2UI 架構與 App 落地實踐"
            dek="Google 開源新標準 A2UI，讓 Agent 用宣告式 JSON 描述介面。不用讓模型寫 Dart 或 React 程式碼，真正把元件、狀態與安全邊界留在你的 App 手中。"
            publishedAt="2026.08.16"
            readingTime="8 MIN READ"
            tags={["AI 開發", "Flutter", "跨平台", "工程實務"]}
            signals={[
              { value: "4 步", label: "把 agent 意圖轉為受控原生 UI" },
              { value: "0 行", label: "client 直接執行的不可信代碼" },
              { value: "100%", label: "符合既有原生 Design System" },
            ]}
          />

          <QuickRead
            items={[
              "A2UI 傳來的是「想顯示什麼」的 JSON，不是 Dart 原始碼；你的 Flutter App 不會下載或執行外部代碼。",
              "A2UI 的哲學是「安全如資料，表達如程式碼」：Agent 傳宣告式 JSON，Client 透過 Catalog 白名單進行原生渲染。",
              "副作用永遠隔離：UI 上的按鈕只發送事件意圖，付款、刪除與權限操作仍必須走後端既有授權驗證。",
            ]}
          />

          <p className="lead">
            今天的 AI Agent 已經會寫程式、會搜尋網路、會下 Shell 指令。但當它需要呈現結構化資訊——例如比較表格、預約時段選單或多步驟表單時，最常見的情況依然是：它只能回覆你一大段純文字或 Markdown。
          </p>

          <h2>01 / 問題：Agent 為什麼不能直接「寫程式碼」生畫面？</h2>
          <p>
            在對話中，如果使用者說：「幫我預約下週三晚上兩位」，純文字對話需要來回問答多次才能補齊資訊；若給予一個互動表單，一步就能完成。然而，業界過去嘗試讓模型「直接產生前端程式碼（HTML / React / Flutter Dart）」在生產環境遭遇了嚴重困境：
          </p>
          <ul>
            <li><strong>極大安全漏洞</strong>：在 Client 端動態載入或 <code>eval()</code> 模型生成的代碼，等同於開放任意程式碼執行（RCE）與 XSS 攻擊。</li>
            <li><strong>破壞 Design System</strong>：模型自由發揮的 CSS 或排版，無法維持團隊統一的字體、間距、圓角與無障礙（a11y）標準。</li>
            <li><strong>跨平台不可能</strong>：模型難以在同一對話中，同時精準生成一套 Flutter Widget 與一套 React Component。</li>
          </ul>

          <h2>02 / A2UI 設計哲學：安全如資料，表達如程式碼</h2>
          <p>
            Google 開源的 <strong>A2UI（Agent-to-User Interface）</strong> 提出了一個極其優雅的解法：<strong>Agent 只輸出宣告式的 JSON，用資料表達 UI 的「意圖」，而不是 UI 的「實作」。A2UI 傳遞的是 UI 結構與資料描述，不是 Dart 原始碼。</strong>
          </p>
          <pre><code>{`// Agent 輸出的極簡 A2UI 宣告範例
{
  "type": "card",
  "props": { "title": "預約確認" },
  "children": [
    { "type": "text", "content": "已為您保留 2 位座位" },
    { "type": "datePicker", "label": "選擇日期", "value": "2026-08-19" },
    { "type": "button", "label": "確認預約", "action": "submit_booking" }
  ]
}`}</code></pre>
          <p>
            Client 端（無論是 Flutter、iOS 原生還是 Web）只負責讀取這份抽象的 JSON 描述，再將它對應到本地已經編譯、已經測試過的原生元件。
          </p>

          <A2uiLandscapeTable />

          <h2>03 / 先用 Flutter 的方式理解 A2UI</h2>
          <p>
            先別把 A2UI 想成 AI 在幫你畫畫面。對 Flutter 或前端工程師而言，它更像後端傳來一份「這次畫面需要哪些欄位」的設定資料，而你的 App 裡有一個<strong>受限制的 Widget Factory</strong>。
          </p>
          <FlutterConceptMap />
          <p>
            這個工廠絕不會憑空長出未知的程式碼：它只使用團隊明確允許的 Widget（稱為 <code>Catalog</code> 白名單），也只把點擊事件接到你預先設定好的 Callback。
          </p>

          <h2>04 / 一次表單怎麼走進 App：4 步架構時序</h2>
          <p>
            A2UI 的通訊架構遵循清晰的 4 步循環：
          </p>
          <A2uiTrace />
          <p>
            協定中的 <code>surfaceUpdate</code>（介面結構更新）、<code>dataModelUpdate</code>（欄位數值更新）與 <code>userAction</code>（使用者互動事件）均為純資料交換。傳輸可走任何 Transport（如 Google A2A Protocol、WebSocket 或 SSE 串流），但核心原則不變：<strong>Client 端不執行模型產出的可執行代碼。</strong>
          </p>

          <h2>05 / Client 端必須守住的防禦邊界</h2>
          <p>
            在實作 Client 端的 Renderer 時，務必把來自 Agent 的 Payload 當作<strong>不可信輸入（Untrusted Input）</strong>來防禦。
          </p>
          <ControlBoundary />
          <p>
            具體實作上，如果 Agent 要求了一個不在 Catalog 中的未知元件，或者 Action 名稱不在白名單內，Renderer 應主動拒絕解析，並降級為友善提示（例如：「此互動元件目前不支援，請使用標準流程」），而不是嘗試猜測並硬畫出來。
          </p>

          <h2>06 / 生態想像：當 A2UI 遇上 MCP 與 Agent Teams</h2>
          <p>
            A2UI 不只適用於單一 Chatbot，它為整個 AI 生態系打開了全新可能：
          </p>
          <ul>
            <li>
              <strong>MCP（Model Context Protocol）+ A2UI</strong>：目前的 MCP Server 多半只能回傳純文字或 raw 數據。若整合 A2UI，自訂的 MCP 工具（如資料庫查詢、伺服器監控）可直接回傳結構化 UI 描述，由客戶端原生渲染出互動圖表或操作面板。
            </li>
            <li>
              <strong>Agent Teams 視覺化協作</strong>：在多 Agent 協作場景中，Code Review Agent 可以回傳原生 Diff 檢視器；Deploy Agent 可以回傳即時進度儀表板。
            </li>
            <li>
              <strong>突破終端機限制</strong>：讓 Agent 從純 CLI 終端機與對話框，自然擴展為圖形化操作介面。
            </li>
          </ul>

          <h2>07 / 快速體驗與本週行動</h2>
          <p>
            想要親自體驗 A2UI 的運作？你可以直接 clone 官方專案跑起餐廳搜尋範例：
          </p>
          <pre><code>{`# 體驗官方 A2UI 餐廳搜尋 Demo
git clone https://github.com/google/A2UI.git
cd A2UI
export GEMINI_API_KEY="your_api_key"

cd samples/agent/adk/restaurant_finder
uv run .`}</code></pre>

          <p><strong>本週可帶回團隊的 3 個落地行動：</strong></p>
          <ol>
            <li><strong>挑選低風險表單</strong>：找一個欄位常變動但出錯無重大損失的流程（如意見回饋、偏好收集），列出 5~8 個基礎元件作為最小 Catalog。</li>
            <li><strong>實作安全邊界測試</strong>：為你的 Renderer 撰寫異常處理測試（未知 Component、錯誤資料綁定、非法 Action）。</li>
            <li><strong>隔離副作用</strong>：確保所有 A2UI 觸發的敏感操作（扣款、刪除、授權）皆回到既有後端 API 進行身份驗證與冪等性檢查。</li>
          </ol>

          <h2>來源</h2>
          <ul className="sources">
            <li>
              <a href="https://github.com/google/A2UI" target="_blank" rel="noreferrer">
                A2UI 官方專案 ↗
              </a>
            </li>
            <li>
              <a href="https://github.com/flutter/genui" target="_blank" rel="noreferrer">
                Flutter GenUI SDK ↗
              </a>
            </li>
            <li>
              <a href="https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9/docs/a2ui_extension_specification.md" target="_blank" rel="noreferrer">
                A2UI v0.9 extension specification ↗
              </a>
            </li>
          </ul>

          <Feedback slug="a2ui-flutter-renderer" />
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
