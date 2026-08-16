import Link from "next/link";
import { A2uiTrace } from "../../../components/A2uiTrace";
import { ArticleHero } from "../../../components/ArticleHero";
import { ArticleToc } from "../../../components/ArticleToc";
import { ControlBoundary } from "../../../components/ControlBoundary";
import { Feedback } from "../../../components/Feedback";
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
            eyebrow="AI 開發 / Flutter 01"
            title="一個表單怎麼從 agent 走進你的 Flutter App"
            dek="A2UI 不是讓模型寫 widget；它讓 agent 描述介面，再由你的 Flutter renderer 決定哪些元件真的能出現。"
            publishedAt="2026.08.16"
            readingTime="7 MIN READ"
            tags={["AI 開發", "Flutter", "工程實務"]}
            signals={[
              { value: "4 步", label: "把 agent 的描述變成受控的 Flutter 互動" },
              { value: "1 份", label: "catalog 決定 agent 能要求哪些 widget" },
              { value: "0 段", label: "agent 直接執行的 Dart 程式碼" },
            ]}
          />

          <QuickRead
            items={[
              "A2UI 傳的是宣告式 JSON：它說明想呈現什麼，不是把 Dart 原始碼送進你的 App。",
              "Flutter renderer 以本地 catalog 將抽象 component 映射為你已寫好、已測試的 widget。",
              "第一次導入應選摘要卡或資料收集表單；付款、刪除與權限異動仍走既有確認與授權流程。",
            ]}
          />

          <p className="lead">
            想像使用者在聊天裡說：「幫我預約下週三晚上兩位。」agent 知道自己還缺時間與人數，於是需要一個表單。問題不是它能不能把表單畫出來，而是：它能不能把任意 widget、任意行為塞進你的 Flutter App？A2UI 的答案是不能。
          </p>

          <h2>01 / A2UI 不是讓 agent 寫 widget</h2>
          <p>
            A2UI（Agent-to-User Interface）把介面生成與介面執行拆開。agent 回傳一份描述 UI 結構、資料與互動意圖的 declarative JSON；client 端的 renderer 再把它轉為真正的原生元件。對 Flutter 工程師而言，這更像把遠端資料餵給一個受限制的 widget factory，而不是把模型產出的 Dart 拿去編譯或執行。
          </p>
          <p>
            因此 agent 可以要求「一個有日期欄位與送出按鈕的預約介面」，但不能自帶 <code>Widget</code> 實作，更不能呼叫你的私有 service、讀 token，或略過既有的登入與權限檢查。是否支援某個 component、它有哪些 props、按下按鈕後接到哪個 callback，始終由 App 端決定。
          </p>

          <h2>02 / 一次表單怎麼走進 Flutter App</h2>
          <p>
            從資料流看會比較直覺：agent 先判斷文字不足以完成任務，再逐步送出 UI 描述；Flutter 接到後只負責解析、驗證與渲染。使用者操作則回到你既有的 application flow。
          </p>
          <A2uiTrace />
          <p>
            這裡最容易誤會的是第 2 步。像 <code>surfaceUpdate</code>、<code>dataModelUpdate</code> 與 <code>userAction</code> 這類協定訊息是資料交換；傳輸可隨整合方式採用串流或其他 transport，但它們不會使 client 執行 agent 提供的 Dart。真正的副作用，例如建立預約，仍應由你在收到 action 後呼叫既有 API，並在 server 端再次驗證身分、可用名額與權限。
          </p>

          <h2>03 / Catalog 是你的 widget allowlist</h2>
          <p>
            catalog 是 A2UI 最重要的心智模型：它不是「目前有哪些元件可以秀」，而是允許清單。你可把 <code>TextField</code>、<code>DatePicker</code>、<code>Card</code>、<code>Button</code> 等抽象類型，映射到團隊設計系統中已審核的 Flutter widget；agent 只能引用這些名稱與你明定可接受的欄位。
          </p>
          <p>
            這個邊界也讓跨平台變得務實。同一份 A2UI 描述可在不同 client 使用各自的原生實作：Flutter 選 Material 或自家 Design System，Web 選自己的 component library。共同的是資料契約，不是畫面像素或程式碼。Flutter 的 GenUI SDK 則是可用來探索這種 renderer 模式的實作選項之一。
          </p>

          <h2>04 / Renderer 要守住哪些邊界</h2>
          <p>
            把 renderer 當成不可信輸入的入口來設計。它的工作不是盡力把任何 payload 畫出來，而是只把符合 catalog 與資料契約的部分畫出來；不符合時，讓使用者得到安全、可理解的 fallback，也讓團隊得到可追查的紀錄。
          </p>
          <ControlBoundary />
          <p>
            實作上，unknown component、binding 找不到資料、schema 版本不相容與 action 名稱不在 allowlist，都應是可觀測的拒絕情況。畫面可以退回「這個互動目前無法顯示，請改用一般流程」，而不是猜測如何執行。這不是犧牲 agent 體驗；這是讓它能在產品裡被維護與稽核的前提。
          </p>

          <h2>05 / 第一個 prototype 怎麼選</h2>
          <p>
            選一個「agent 知道要問什麼，但 UI 的最佳組合會隨對話改變」的低風險 surface。例如旅遊偏好收集、客服案件補充資料，或依條件出現的預約表單。先準備 5 到 8 個 widget 的小 catalog，讓 agent 在明確範圍內組合。
          </p>
          <p>
            不要從付款、刪除資料、調整權限開始。這些流程即使由固定 Flutter 畫面處理，也需要確認、冪等性與 server-side authorization；換成 A2UI 並不會減少這些要求。若確實要讓 agent 引導這類流程，就把它限制在蒐集資料與呈現確認頁，最後一步仍交給既有的受保護 action。
          </p>

          <h2>06 / 本週可採取的行動</h2>
          <ol>
            <li>挑一個低風險表單，寫下它需要的 component、props 與 action；先把它變成最小 catalog。</li>
            <li>為 renderer 補四個測試：未知 component、錯誤 binding、不支援的 action，以及合法表單能正確回傳 action。</li>
            <li>在 action 回送處記錄 catalog 版本、component ID 與拒絕原因，讓出問題時能重現而不是只看模型輸出。</li>
          </ol>

          <h2>來源</h2>
          <ul className="sources">
            <li>
              <a href="https://github.com/a2ui-project/a2ui" target="_blank" rel="noreferrer">
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
