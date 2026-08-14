export type AdminSecrets = { password: string; secret: string };

/**
 * 管理密碼與簽章金鑰只從環境變數讀取，不寫進程式碼或資料庫。
 * 本機開發放在 .env（已 gitignore），正式執行由啟動環境提供。
 *
 * 任一項缺失就回 null，呼叫端必須 fail closed。設定不完整時放行等於整個
 * 管理端沒有保護，而缺設定是部署時最容易發生的狀況。
 */
export function adminSecrets(): AdminSecrets | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (typeof password !== "string" || password.length === 0) return null;
  if (typeof secret !== "string" || secret.length === 0) return null;

  return { password, secret };
}

/** 設定缺失時的統一回應：不透露是密碼還是金鑰沒設。 */
export function misconfigured(): Response {
  console.error(
    "ADMIN_PASSWORD or ADMIN_SESSION_SECRET is not configured; refusing all admin access"
  );
  return new Response(null, { status: 503 });
}
