/**
 * XPostCard — Server Component
 * 直接抓 X/Twitter 貼文頁面的 schema.org 結構化資料解析，
 * 取得完整內文、頭貼、互動數字，渲染成本站 social-post-card 樣式。
 * 完全不依賴 Twitter widget.js，也不需要 API key。
 *
 * 用法：
 *   <XPostCard url="https://x.com/ilyasut/status/1790517455628198322" />
 */

type ParsedTweet = {
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  avatarUrl: string;
  body: string;
  date: string;
  tweetUrl: string;
  likes: string;
  retweets: string;
  replies: string;
  views: string;
};

/** 把大數字格式化成 1.2K / 5.9M 形式 */
function formatCount(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num)) return "";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
}

/** 從 HTML 字串裡抓出 itemProp 的 content 或文字 */
function extractItemProp(html: string, prop: string): string {
  // <meta itemProp="xxx" content="yyy"/>
  const metaMatch = html.match(
    new RegExp(`<meta[^>]+itemProp="${prop}"[^>]+content="([^"]*)"`, "i")
  );
  if (metaMatch) return metaMatch[1];
  // <span itemProp="xxx">yyy</span>
  const spanMatch = html.match(
    new RegExp(`itemProp="${prop}"[^>]*>([^<]*)`, "i")
  );
  if (spanMatch) return spanMatch[1].trim();
  return "";
}

/** 從 InteractionCounter 區塊抓互動數字 */
function extractInteraction(html: string, type: string): string {
  const block = html.match(
    new RegExp(
      `interactionType[^>]*content="https://schema\\.org/${type}"[\\s\\S]{0,300}?userInteractionCount"[^>]*content="([0-9]+)"`,
      "i"
    )
  );
  return block ? block[1] : "";
}

/** 去除 HTML 標籤，保留 @mention 文字 */
function stripHtml(html: string): string {
  return html
    .replace(/<a[^>]*>(@[^<]*)<\/a>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTweet(url: string): Promise<ParsedTweet | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // 推文內文：<div itemProp="articleBody" ...>
    const bodyMatch = html.match(/itemProp="articleBody"[^>]*>([\s\S]*?)<\/div>/);
    const body = bodyMatch ? stripHtml(bodyMatch[1]) : "";

    // 作者頭貼
    const avatarMatch = html.match(/itemProp="image"[^>]+src="([^"]+)"/);
    const avatarUrl = avatarMatch ? avatarMatch[1] : "";

    // 作者名稱
    const authorName = extractItemProp(html, "name");

    // @handle：從 itemProp="alternateName"
    const handleMatch = html.match(/itemProp="alternateName"[^>]*>([^<]*)/);
    const authorHandle = handleMatch ? `@${handleMatch[1].trim()}` : "";

    // 作者主頁連結
    const authorUrlMatch = html.match(/itemProp="url"[^>]+href="(https:\/\/x\.com\/[^"]+)"/);
    const authorUrl = authorUrlMatch ? authorUrlMatch[1] : url;

    // 發文時間：<time itemProp="datePublished" dateTime="...">May 14</time>
    const timeMatch = html.match(/itemProp="datePublished"[^>]+>([^<]+)/);
    const date = timeMatch ? timeMatch[1].trim() : "";

    return {
      authorName,
      authorHandle,
      authorUrl,
      avatarUrl,
      body,
      date,
      tweetUrl: url,
      likes: formatCount(extractInteraction(html, "LikeAction")),
      retweets: formatCount(extractInteraction(html, "ShareAction")),
      replies: formatCount(extractInteraction(html, "ReplyAction")),
      views: formatCount(extractInteraction(html, "ViewAction")),
    };
  } catch {
    return null;
  }
}

export async function XPostCard({ url }: { url: string }) {
  const tweet = await fetchTweet(url);

  // Fallback
  if (!tweet || !tweet.body) {
    return (
      <div className="social-post-card">
        <div className="social-post-body">⚠️ 無法載入推文內容。</div>
        <div className="social-post-footer">
          <a href={url} target="_blank" rel="noreferrer">
            查看原推文 →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="social-post-card">
      <div className="social-post-header">
        <div className="social-post-avatar">
          {tweet.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={tweet.avatarUrl}
              alt={tweet.authorName}
              style={{ width: "100%", height: "100%", borderRadius: "9999px", objectFit: "cover" }}
            />
          ) : (
            tweet.authorName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div>
          <div className="social-post-author-name">{tweet.authorName}</div>
          <div className="social-post-author-handle">{tweet.authorHandle}</div>
        </div>
        <span className="social-post-platform">𝕏 (Twitter)</span>
      </div>

      <div className="social-post-body">{tweet.body}</div>

      <div className="social-post-footer">
        {tweet.date && <span>{tweet.date}</span>}
        {tweet.replies && <span>💬 {tweet.replies}</span>}
        {tweet.retweets && <span>🔄 {tweet.retweets}</span>}
        {tweet.likes && <span>🤍 {tweet.likes}</span>}
        {tweet.views && <span>👁 {tweet.views}</span>}
        <a href={tweet.tweetUrl} target="_blank" rel="noreferrer">
          查看原推文 →
        </a>
      </div>
    </div>
  );
}
