import { adminSecrets, misconfigured } from "../../../../lib/admin-env";
import {
  createSessionToken,
  sessionCookieHeader,
  verifyPassword,
} from "../../../../lib/admin-session";
import { readJson } from "../../../../lib/request";

/**
 * 這個端點沒有應用層節流。防暴力破解靠 Cloudflare 邊緣的 Rate Limiting 規則
 * （見 README），那樣不需要儲存任何 IP，與規格的隱私限制不衝突。
 */
export async function POST(request: Request) {
  const secrets = adminSecrets();
  if (!secrets) return misconfigured();

  const body = await readJson(request);
  const password = (body as { password?: unknown } | null)?.password;

  if (!(await verifyPassword(secrets.secret, secrets.password, password))) {
    return new Response(null, { status: 401 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "set-cookie": sessionCookieHeader(await createSessionToken(secrets.secret)),
    },
  });
}
