/** Build WSS URL from explicit host/proto (used client-side in botUrls) */
export function buildGatewayWsUrl(
  host: string,
  proto: string,
  appId: string,
): string {
  const wsProto = proto === "https" ? "wss" : "ws";
  return `${wsProto}://${host}/websocket/${encodeURIComponent(appId)}`;
}

/** Resolve WSS URL from server-side env vars with fallback chain */
export function resolveGatewayWsUrl(
  appId: string,
  env: { GATEWAY_WS_URL?: string; PUBLIC_URL?: string },
  requestUrl?: URL,
): string {
  const base = env.GATEWAY_WS_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${encodeURIComponent(appId)}`;
  }
  if (requestUrl) {
    const wsProto = requestUrl.protocol === "https:" ? "wss" : "ws";
    return `${wsProto}://${requestUrl.host}/websocket/${encodeURIComponent(appId)}`;
  }
  const publicUrl = env.PUBLIC_URL;
  if (publicUrl) {
    const u = new URL(publicUrl);
    const wsProto = u.protocol === "https:" ? "wss" : "ws";
    return `${wsProto}://${u.host}/websocket/${encodeURIComponent(appId)}`;
  }
  return `ws://localhost:8787/websocket/${encodeURIComponent(appId)}`;
}
