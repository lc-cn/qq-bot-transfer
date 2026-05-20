/** 与 GET /gateway/:appId 返回的 WebSocket 地址一致 */
export function buildGatewayWsUrl(
  host: string,
  proto: string,
  appId: string,
): string {
  const wsProto = proto === "https" ? "wss" : "ws";
  return `${wsProto}://${host}/websocket/${encodeURIComponent(appId)}`;
}

export function forwardedFromHeaders(headers: {
  get(name: string): string | null;
}): { host: string; proto: string } {
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headers.get("host")?.split(",")[0]?.trim();
  if (!host) throw new Error("missing Host header");
  let proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (!proto) {
    const h = host.toLowerCase();
    proto =
      h.includes("localhost") || h.startsWith("127.0.0.1") ? "http" : "https";
  }
  return { host, proto };
}
