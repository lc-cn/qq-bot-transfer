export type GatewayRoute =
  | { kind: "webhook"; appId: string }
  | { kind: "websocket"; appId: string }
  | { kind: "gateway"; appId: string }
  | { kind: "gateway_bot"; appId: string }
  | { kind: "auth"; appId: null };

const APP_ID = "([^/]+)";

export function parseGatewayRoute(url: URL): GatewayRoute | null {
  const path = url.pathname.replace(/\/$/, "") || "/";

  let m = path.match(new RegExp(`^/webhook/${APP_ID}$`));
  if (m) return { kind: "webhook", appId: decodeURIComponent(m[1]) };

  m = path.match(new RegExp(`^/websocket/${APP_ID}$`));
  if (m) return { kind: "websocket", appId: decodeURIComponent(m[1]) };

  m = path.match(new RegExp(`^/gateway/bot/${APP_ID}$`));
  if (m) return { kind: "gateway_bot", appId: decodeURIComponent(m[1]) };

  m = path.match(new RegExp(`^/gateway/${APP_ID}$`));
  if (m) return { kind: "gateway", appId: decodeURIComponent(m[1]) };

  if (path === "/app/getAppAccessToken") {
    return { kind: "auth", appId: null };
  }

  return null;
}

export function gatewayAppId(route: GatewayRoute): string | null {
  return route.appId;
}
