import { cookies } from "next/headers";
import Link from "next/link";
import { AdminLogin, AdminLogout } from "../../components/AdminAuth";
import { adminSecrets } from "../../lib/admin-env";
import { SESSION_COOKIE, isValidSessionToken } from "../../lib/admin-session";
import { formatTaipei, readArticleStats } from "../../lib/analytics";

// vinext 的靜態分析看不出 cookies() 的使用（build 時會提示無法分類路由），
// 沒有這行就有被預先渲染成靜態頁的風險 —— 那會讓所有人看到同一份快取。
export const dynamic = "force-dynamic";

export const metadata = { robots: "noindex" };

function percent(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function AdminPage() {
  const secrets = adminSecrets();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const signedIn =
    secrets !== null && (await isValidSessionToken(secrets.secret, token));

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/">MOBILE <i>PULSE</i></Link>
        <p>ADMIN · 匿名統計</p>
        {signedIn ? <AdminLogout /> : null}
      </header>

      {secrets === null ? (
        <section className="admin-panel">
          <p className="eyebrow">NOT CONFIGURED</p>
          <p>
            尚未設定 <code>ADMIN_PASSWORD</code> 或{" "}
            <code>ADMIN_SESSION_SECRET</code>，管理頁一律拒絕存取。
          </p>
        </section>
      ) : signedIn ? (
        <AdminStats />
      ) : (
        <section className="admin-panel">
          <p className="eyebrow">RESTRICTED</p>
          <h1>統計後台</h1>
          <AdminLogin />
        </section>
      )}
    </main>
  );
}

async function AdminStats() {
  const articles = await readArticleStats();

  return (
    <section className="admin-panel">
      <p className="eyebrow">READER SIGNAL</p>
      <h1>統計後台</h1>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">文章</th>
              <th scope="col">瀏覽</th>
              <th scope="col">有用</th>
              <th scope="col">沒用</th>
              <th scope="col">有用率</th>
              <th scope="col">最近回饋（台北時間）</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.slug}>
                <th scope="row">
                  <a href={`/articles/${article.slug}`}>{article.title}</a>
                  <span>{article.publishedAt}</span>
                </th>
                <td>{article.views}</td>
                <td>{article.useful}</td>
                <td>{article.notUseful}</td>
                <td>{percent(article.usefulRate)}</td>
                <td>{formatTaipei(article.lastFeedbackAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="admin-note">
        匿名識別可降低重複計數，不能視為防止惡意灌票的機制。
      </p>
    </section>
  );
}
