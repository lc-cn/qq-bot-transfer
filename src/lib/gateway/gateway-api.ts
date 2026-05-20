import { buildGatewayWsUrl, forwardedFromHeaders } from "./gateway-url";
import { globalHub } from "./bot-runtime";

/**
 * 与 qq-bot 的 GATEWAY_WS_URL 一致；多租户时在路径上带 appId：
 * 例如 GATEWAY_WS_URL=wss://example.com/websocket → wss://example.com/websocket/{appId}
 */
export function resolveGatewayWsUrl(
  appId: string,
  requestHeaders?: { get(name: string): string | null },
): string {
  const fromEnv = process.env.GATEWAY_WS_URL?.replace(/\/$/, "");
  if (fromEnv) {
    if (fromEnv.endsWith(`/${appId}`)) return fromEnv;
    if (fromEnv.endsWith("/websocket")) return `${fromEnv}/${appId}`;
    return `${fromEnv}/websocket/${appId}`;
  }

  if (requestHeaders) {
    try {
      const { host, proto } = forwardedFromHeaders(requestHeaders);
      return buildGatewayWsUrl(host, proto, appId);
    } catch {
      /* fall through */
    }
  }

  const fromEnvUrl = process.env.PUBLIC_URL ?? process.env.AUTH_URL;
  if (fromEnvUrl) {
    const u = new URL(fromEnvUrl);
    const proto = u.protocol.replace(":", "");
    return buildGatewayWsUrl(u.host, proto, appId);
  }

  const port = process.env.PORT ?? "3000";
  return buildGatewayWsUrl(`localhost:${port}`, "http", appId);
}

/** 与 qq-bot HandleGatewayAPI：记录 Authorization 中的 token 映射 */
export function captureGatewayAuthorization(
  authorization: string,
  unionAppId?: string | null,
): void {
  const auth = authorization.trim();
  if (auth.startsWith("QQBot ")) {
    const accessToken = auth.slice("QQBot ".length).trim();
    if (unionAppId && accessToken) {
      globalHub.storeTokenMapping(unionAppId, accessToken);
    }
  } else if (auth.startsWith("Bot ")) {
    const parts = auth.slice("Bot ".length).trim().split(".", 2);
    if (parts.length === 2 && parts[0]) {
      globalHub.storeTokenMapping(parts[0], parts[1]);
    }
  }
}

export type GatewayApiResult =
  | { status: 401; body: { msg: string } }
  | { status: 200; body: { url: string } };

export function getGatewayApiResponse(
  appId: string,
  authorization: string | undefined,
  unionAppId: string | null | undefined,
  requestHeaders?: { get(name: string): string | null },
): GatewayApiResult {
  const auth = authorization?.trim() ?? "";
  if (!auth) {
    return { status: 401, body: { msg: "missing Authorization header" } };
  }

  captureGatewayAuthorization(auth, unionAppId);

  const url = resolveGatewayWsUrl(appId, requestHeaders);
  console.log(`[gateway] returning ws url: ${url}`);
  return { status: 200, body: { url } };
}
