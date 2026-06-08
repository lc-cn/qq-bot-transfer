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
  const res = await fetch(`${origin}/api/auth/csrf`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  }
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}
