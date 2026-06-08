import { decryptSecret } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db";
import { globalHub } from "./bot-runtime";

const AUTH_URL = "https://bots.qq.com/app/getAppAccessToken";

export type AuthProxyResult =
  | { status: 400; body: { msg: string } }
  | { status: 404; body: { msg: string } }
  | { status: number; body: string; json: false }
  | { status: 502; body: string; json: false }
  | { status: 200; body: string; json: false };

export async function getAuthProxyResponse(
  rawBody: string,
): Promise<AuthProxyResult> {
  let body: { appId?: string; clientSecret?: string };
  try {
    body = JSON.parse(rawBody) as { appId?: string; clientSecret?: string };
  } catch {
    return { status: 400, body: { msg: "invalid request body" } };
  }

  const appId = body.appId;
  if (!appId) {
    return { status: 400, body: { msg: "appId required in request body" } };
  }

  const dbBot = await prisma.bot.findUnique({ where: { appId } });
  if (!dbBot) {
    return { status: 404, body: { msg: "bot not found" } };
  }

  const secret = body.clientSecret ?? decryptSecret(dbBot.secretEnc);
  const proxyBody = JSON.stringify({
    appId,
    clientSecret: secret,
  });

  const upstream = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: proxyBody,
  });
  const respBody = await upstream.text();

  if (!upstream.ok) {
    return { status: upstream.status, body: respBody, json: false };
  }

  let authResp: { access_token?: string; expires_in?: number | string };
  try {
    authResp = JSON.parse(respBody) as typeof authResp;
  } catch {
    return { status: 502, body: respBody, json: false };
  }

  if (!authResp.access_token) {
    return { status: upstream.status, body: respBody, json: false };
  }

  const expiresIn =
    typeof authResp.expires_in === "string"
      ? parseInt(authResp.expires_in, 10)
      : (authResp.expires_in ?? 7200);

  await globalHub.registerFromAuth(
    appId,
    dbBot.id,
    secret,
    authResp.access_token,
    expiresIn,
  );

  console.log(`[auth-proxy] bot=${appId} registered`);
  return { status: 200, body: respBody, json: false };
}
