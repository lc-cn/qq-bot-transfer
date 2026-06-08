import type { IncomingMessage } from "node:http";
import type { NextRequest } from "next/server";

export function firstHeader(
  value: string | string[] | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim();
}

export function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("localhost") ||
    h.startsWith("127.0.0.1") ||
    h.endsWith(".local")
  );
}

type HeaderGet = (name: string) => string | null;

function resolveHostProto(
  get: HeaderGet,
): { host: string; proto: string } | null {
  const host =
    firstHeader(get("x-forwarded-host")) ?? firstHeader(get("host"));
  if (!host) return null;
  let proto = firstHeader(get("x-forwarded-proto"));
  if (!proto) {
    proto = isLocalHost(host) ? "http" : "https";
  }
  return { host, proto };
}

/** 从反代头解析对外 origin；无 Host 时用 fallbackOrigin 或 PUBLIC_URL */
export function originFromHeaderGet(
  get: HeaderGet,
  fallbackOrigin?: string,
): string {
  const hp = resolveHostProto(get);
  if (hp) return `${hp.proto}://${hp.host}`.replace(/\/$/, "");
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  const fromEnv = process.env.PUBLIC_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

/** 中间件 / 登录：从 NextRequest 反代头得到对外 origin */
export function originFromRequest(req: NextRequest): string {
  return originFromHeaderGet((n) => req.headers.get(n), req.nextUrl.origin);
}

export function forwardedFromHeaders(headers: {
  get(name: string): string | null;
}): { host: string; proto: string } {
  const hp = resolveHostProto((n) => headers.get(n));
  if (!hp) throw new Error("missing Host header");
  return hp;
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
