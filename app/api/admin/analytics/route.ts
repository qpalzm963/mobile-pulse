import { adminSecrets, misconfigured } from "../../../../lib/admin-env";
import {
  isValidSessionToken,
  readSessionToken,
} from "../../../../lib/admin-session";
import { readArticleStats } from "../../../../lib/analytics";

export async function GET(request: Request) {
  const secrets = adminSecrets();
  if (!secrets) return misconfigured();

  const valid = await isValidSessionToken(
    secrets.secret,
    readSessionToken(request)
  );
  if (!valid) return new Response(null, { status: 401 });

  try {
    return Response.json(
      { articles: await readArticleStats() },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    console.error("failed to read analytics", error);
    return new Response(null, { status: 500 });
  }
}
