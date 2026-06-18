/** 接入指引页用的端点 URL（基于当前访问域名） */
export function guideEndpoints(origin: string, appId = "YOUR_APP_ID") {
  const base = origin.replace(/\/$/, "");
  const host = new URL(base).host;
  const wsProto = base.startsWith("https") ? "wss" : "ws";
  return {
    origin: base,
    oauthCallback: `${base}/api/auth/callback/github`,
    webhook: `${base}/webhook/${appId}`,
    gateway: `${base}/gateway/${appId}`,
    gatewayBot: `${base}/gateway/bot/${appId}`,
    auth: `${base}/app/getAppAccessToken`,
    websocket: `${wsProto}://${host}/websocket/${appId}`,
    health: `${base}/api/health`,
  };
}
