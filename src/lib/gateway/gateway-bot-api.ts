import {
  captureGatewayAuthorization,
  resolveGatewayWsUrl,
} from "./gateway-api";

const UPSTREAM_GATEWAY_BOT = "https://api.sgroup.qq.com/gateway/bot";

type SessionStartLimit = {
  total: number;
  remaining: number;
  reset_after: number;
  max_concurrency: number;
};

type UpstreamGatewayBot = {
  url?: string;
  shards?: number;
  session_start_limit?: SessionStartLimit;
};

export type GatewayBotApiResult =
  | { status: 401; body: { msg: string } }
  | { status: number; body: string; json: false }
  | { status: 200; body: UpstreamGatewayBot; json: true }
  | { status: 502; body: { msg: string } };

/**
 * GET /gateway/bot — 代理 QQ 官方接口，仅将 url 换成本网关地址；
 * shards / session_start_limit 原样透传，不编造。
 */
export async function getGatewayBotApiResponse(
  appId: string,
  authorization: string | undefined,
  unionAppId: string | null | undefined,
  requestHeaders?: { get(name: string): string | null },
): Promise<GatewayBotApiResult> {
  const auth = authorization?.trim() ?? "";
  if (!auth) {
    return { status: 401, body: { msg: "missing Authorization header" } };
  }

  captureGatewayAuthorization(auth, unionAppId);

  const upstream = await fetch(UPSTREAM_GATEWAY_BOT, {
    headers: { Authorization: auth },
  });
  const text = await upstream.text();

  if (!upstream.ok) {
    return { status: upstream.status, body: text, json: false };
  }

  let body: UpstreamGatewayBot;
  try {
    body = JSON.parse(text) as UpstreamGatewayBot;
  } catch {
    return {
      status: 502,
      body: { msg: "invalid upstream gateway/bot response" },
    };
  }

  body.url = resolveGatewayWsUrl(appId, requestHeaders);
  return { status: 200, body, json: true };
}
