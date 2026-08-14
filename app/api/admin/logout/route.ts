import {
  clearedSessionCookieHeader,
  shouldUseSecureCookie,
} from "../../../../lib/admin-session";

/** 一律成功：登出不需要先證明自己已登入。 */
export async function POST(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      "set-cookie": clearedSessionCookieHeader(shouldUseSecureCookie(request)),
    },
  });
}
