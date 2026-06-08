/** 与 GET /gateway/:appId 返回的 WebSocket 地址一致 */
export function buildGatewayWsUrl(
  host: string,
  proto: string,
  appId: string,
): string {
  const wsProto = proto === "https" ? "wss" : "ws";
  return `${wsProto}://${host}/websocket/${encodeURIComponent(appId)}`;
}
