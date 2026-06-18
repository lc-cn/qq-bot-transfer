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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Login card */}
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">登录</h1>
        <p className="mt-2 text-sm text-zinc-500">
          使用 GitHub 账号登录以管理 QQ Bot 网关，无需单独注册
        </p>
        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">登录失败</p>
            <p className="mt-1">{errorMsg}</p>
            {error && (
              <p className="mt-1 text-xs text-red-500">错误码：{error}</p>
            )}
          </div>
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
      </div>

      {/* Quick-start guide */}
      <div className="mt-8 w-full max-w-sm">
        <h2 className="text-center text-sm font-medium text-zinc-700">
          首次使用？
        </h2>
        <div className="mt-4 space-y-3">
          <GuideCard step="1" title="登录" desc="GitHub 授权即可开始" />
          <GuideCard step="2" title="创建 Bot" desc="在控制台添加机器人，配置 App ID 和密钥" />
          <GuideCard step="3" title="配置回调" desc="在 QQ 开放平台将 Webhook 指向本网关" />
          <GuideCard step="4" title="接入 SDK" desc="通过 WebSocket 接收 QQ 机器人事件" />
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link
            href="/guide"
            className="font-medium text-zinc-700 underline hover:text-zinc-900"
          >
            查看完整接入指引 →
          </Link>
        </p>
      </div>
    </div>
  );
}

function GuideCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
        {step}
      </span>
      <div>
        <p className="text-sm font-medium text-zinc-800">{title}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
    </div>
  );
}
