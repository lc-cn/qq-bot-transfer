import type { IncomingMessage } from "node:http";

function firstHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim();
}

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("localhost") ||
    h.startsWith("127.0.0.1") ||
    h.endsWith(".local")
  );
}

/** 从反代 / ngrok 请求头推断对外访问的 origin（供网关返回 wss 等） */
export function requestBaseUrl(req: IncomingMessage): string {
  const host =
    firstHeader(req.headers["x-forwarded-host"]) ??
    firstHeader(req.headers.host);
  let proto = firstHeader(req.headers["x-forwarded-proto"]);

  if (!proto && host && !isLocalHost(host)) {
    // ngrok、Caddy 等 TLS 在边缘终结时，本地 dev 常不带 x-forwarded-proto
    proto = "https";
  }
  proto ??= "http";

  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  const fromEnv = process.env.PUBLIC_URL ?? process.env.AUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

/** 让 Auth.js / Next 在反代后识别正确的 host 与 https */
export function ensureForwardedHeaders(
  req: IncomingMessage,
  fallback: URL,
): void {
  if (!req.headers["x-forwarded-host"]) {
    req.headers["x-forwarded-host"] =
      firstHeader(req.headers.host) ?? fallback.host;
  }
  if (!req.headers["x-forwarded-proto"]) {
    const host =
      firstHeader(req.headers["x-forwarded-host"]) ??
      firstHeader(req.headers.host) ??
      "";
    req.headers["x-forwarded-proto"] = isLocalHost(host)
      ? fallback.protocol.replace(":", "")
      : "https";
  }
}
