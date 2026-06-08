import { forwardedFromHeaders } from "@/lib/http-origin";
import { buildGatewayWsUrl } from "./gateway-url";
import { globalHub } from "./bot-runtime";

/** GATEWAY_WS_URL 须为 WebSocket 基址，如 wss://example.com/websocket（不含 appId） */
export function resolveGatewayWsUrl(
  appId: string,
  requestHeaders?: { get(name: string): string | null },
): string {
  const base = process.env.GATEWAY_WS_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${encodeURIComponent(appId)}`;
  }

  if (requestHeaders) {
    const { host, proto } = forwardedFromHeaders(requestHeaders);
    return buildGatewayWsUrl(host, proto, appId);
  }

  const publicUrl = process.env.PUBLIC_URL;
  if (publicUrl) {
    const u = new URL(publicUrl);
    return buildGatewayWsUrl(u.host, u.protocol.replace(":", ""), appId);
  }

  const port = process.env.PORT ?? "3000";
  return buildGatewayWsUrl(`localhost:${port}`, "http", appId);
}

/** 记录 GET /gateway 时 Authorization 中的 access_token 映射 */
export function captureGatewayAuthorization(
  authorization: string,
  unionAppId?: string | null,
): void {
  const auth = authorization.trim();
  if (!auth.startsWith("QQBot ")) return;
  const accessToken = auth.slice("QQBot ".length).trim();
  if (unionAppId && accessToken) {
    globalHub.storeTokenMapping(unionAppId, accessToken);
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
