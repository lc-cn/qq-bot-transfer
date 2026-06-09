import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies, headers } from "next/headers";
import { originFromHeaderGet } from "@/lib/http-origin";

/** 获取 Auth.js CSRF token，供登录表单 POST /api/auth/signin/github 使用 */
export async function getAuthCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  const hdrs = await headers();
  const origin = originFromHeaderGet((n) => hdrs.get(n));
  const host = new URL(origin).host;

  const requestHeaders = new Headers();
  if (cookieHeader) requestHeaders.set("cookie", cookieHeader);
  requestHeaders.set("host", host);
  requestHeaders.set("x-forwarded-host", host);
  requestHeaders.set("x-forwarded-proto", "https");

  let res: Response;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const selfRef = env.WORKER_SELF_REFERENCE;
    if (selfRef) {
      // Worker 经公网域名自请求会 522，走 Service Binding 回环
      res = await selfRef.fetch(
        new Request("https://internal/api/auth/csrf", {
          headers: requestHeaders,
        }),
      );
    } else {
      res = await fetch(`${origin}/api/auth/csrf`, {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
        cache: "no-store",
      });
    }
  } catch {
    res = await fetch(`${origin}/api/auth/csrf`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  }
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}
