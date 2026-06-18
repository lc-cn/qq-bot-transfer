import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/auth";
import { getAuthCsrfToken } from "@/lib/auth/csrf";
import { normalizeCallbackUrl } from "@/lib/auth/resolve-request-url";
import { originFromHeaderGet } from "@/lib/http-origin";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "GitHub OAuth 配置有误。请检查 AUTH_GITHUB_ID、AUTH_GITHUB_SECRET 与回调地址。",
  AccessDenied: "登录被拒绝。",
  Verification:
    "登录验证失败：请清除 localhost 全部 Cookie 后重试（勿混用 3000/3001 端口）。",
  OAuthSignin: "无法连接 GitHub。",
  OAuthCallback: "GitHub 回调失败。",
  OAuthAccountNotLinked: "该 GitHub 账号已关联其他登录方式。",
  Default: "登录失败，请重试。",
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;
  const hdrs = await headers();
  const publicOrigin = originFromHeaderGet((n) => hdrs.get(n));
  const target = normalizeCallbackUrl(callbackUrl, publicOrigin);

  if (session?.user?.id) {
    redirect(target);
  }
  const csrfToken = await getAuthCsrfToken();
  const errorMsg = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">登录</h1>
        <p className="mt-2 text-sm text-zinc-500">
          使用 GitHub 账号登录以管理 QQ Bot 网关，无需单独注册
        </p>
        {errorMsg && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
            {error && (
              <span className="mt-1 block text-xs text-red-500">
                错误码：{error}
              </span>
            )}
          </p>
        )}
        <form
          className="mt-6"
          action="/api/auth/signin/github"
          method="POST"
        >
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="callbackUrl" value={target} />
          <Button type="submit" className="w-full">
            使用 GitHub 登录
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/guide" className="text-zinc-600 underline hover:text-zinc-900">
            首次使用？查看接入指引
          </Link>
        </p>
      </div>
    </div>
  );
}
