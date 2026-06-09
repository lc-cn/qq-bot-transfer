import { NextRequest } from "next/server";
import { isLocalHost, originFromRequest } from "@/lib/http-origin";

export { originFromRequest };

/** ngrok 到本地时 req.nextUrl 常为 localhost，需按 Host 头重建 */
export function rebuildRequestFromForwardedHeaders(req: NextRequest): NextRequest {
  const origin = originFromRequest(req);
  const { pathname, search } = req.nextUrl;
  const href = `${origin}${pathname}${search}`;
  if (new URL(href).origin === req.nextUrl.origin) return req;
  return new NextRequest(href, req);
}

function shouldUnsetCanonicalAuthUrl(req: NextRequest): boolean {
  if (process.env.AUTH_STRICT_URL === "1" || process.env.AUTH_STRICT_URL === "true") {
    return false;
  }
  const canonical = process.env.AUTH_URL;
  if (!canonical) return false;
  const reqHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host")?.split(",")[0]?.trim();
  if (!reqHost) return false;
  return reqHost !== new URL(canonical).host;
}

/**
 * NextAuth 内部 reqWithEnvURL 会读 AUTH_URL 覆盖 origin。
 * 隧道 Host 与 AUTH_URL 不一致时，临时去掉 AUTH_URL 让 trustHost 生效。
 */
export async function runAuthHandler(
  req: NextRequest,
  handler: (request: NextRequest) => Promise<Response>,
): Promise<Response> {
  const request = rebuildRequestFromForwardedHeaders(req);
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev || !shouldUnsetCanonicalAuthUrl(request)) {
    return handler(request);
  }
  const env = process.env as Record<string, string | undefined>;
  const savedAuth = env.AUTH_URL;
  delete env.AUTH_URL;
  try {
    return await handler(request);
  } finally {
    if (savedAuth !== undefined) env.AUTH_URL = savedAuth;
  }
}

/** 登录后 redirect：避免 cookie 里残留的 localhost 绝对地址 */
export function normalizeCallbackUrl(
  callbackUrl: string | undefined,
  currentOrigin: string,
): string {
  if (!callbackUrl) return "/";
  if (callbackUrl.startsWith("/")) return callbackUrl;
  try {
    const target = new URL(callbackUrl);
    if (isLocalHost(target.hostname)) {
      return `${target.pathname}${target.search}${target.hash}` || "/";
    }
    const current = new URL(currentOrigin);
    if (target.origin === current.origin) {
      return `${target.pathname}${target.search}${target.hash}` || "/";
    }
  } catch {
    return "/";
  }
  return "/";
}
