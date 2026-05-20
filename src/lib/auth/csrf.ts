import { cookies, headers } from "next/headers";

/** 获取 Auth.js CSRF token，供登录表单 POST /api/auth/signin/github 使用 */
export async function getAuthCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3001";
  let proto = hdrs.get("x-forwarded-proto");
  if (!proto && host) {
    const h = host.toLowerCase();
    proto =
      h.includes("localhost") || h.startsWith("127.0.0.1") ? "http" : "https";
  }
  proto ??= "http";
  const res = await fetch(`${proto}://${host}/api/auth/csrf`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  }
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}
