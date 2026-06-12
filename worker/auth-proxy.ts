import { eq } from "drizzle-orm";
import { decryptSecret } from "../src/lib/crypto/secrets";
import { bots } from "@drizzle/schema";
import type { AppDatabase } from "../src/lib/db/drizzle";

const AUTH_URL = "https://bots.qq.com/app/getAppAccessToken";

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export type AuthProxyResult = {
  response: Response;
  appId?: string;
  accessToken?: string;
};

/**
 * Handle the /app/getAppAccessToken proxy request.
 * Returns the upstream response and any discovered access token for caching.
 */
export async function proxyAuthRequest(
  request: Request,
  db: AppDatabase,
  encryptionKey: string,
): Promise<AuthProxyResult> {
  let body: { appId?: string; clientSecret?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { response: jsonResponse({ msg: "invalid request body" }, 400) };
  }

  const appId = body.appId;
  if (!appId) {
    return { response: jsonResponse({ msg: "appId required in request body" }, 400) };
  }

  const [row] = await db
    .select()
    .from(bots)
    .where(eq(bots.appId, appId))
    .limit(1);

  let secret: string;
  if (body.clientSecret) {
    secret = body.clientSecret;
  } else {
    if (!row) {
      return { response: jsonResponse({ msg: "bot not found" }, 404) };
    }
    try {
      secret = decryptSecret(row.secretEnc, encryptionKey);
    } catch {
      return { response: jsonResponse({ msg: "failed to decrypt bot secret" }, 500) };
    }
  }

  const upstream = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, clientSecret: secret }),
  });
  const respBody = await upstream.text();
  if (!upstream.ok) {
    return {
      response: new Response(respBody, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  let accessToken: string | undefined;
  try {
    const authResp = JSON.parse(respBody) as { access_token?: string };
    accessToken = authResp.access_token;
  } catch {
    return { response: new Response(respBody, { status: 502 }) };
  }

  return {
    appId,
    response: new Response(respBody, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
    accessToken,
  };
}
