import { headers } from "next/headers";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { guideEndpoints } from "@/lib/guide-urls";
import { originFromHeaderGet } from "@/lib/http-origin";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  );
}

function UrlRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-zinc-800">
          {url}
        </code>
        <CopyButton text={url} />
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export default async function GuidePage() {
  const hdrs = await headers();
  const origin = originFromHeaderGet((n) => hdrs.get(n));
  const urls = guideEndpoints(origin);
  const appId = "YOUR_APP_ID";

  const sdkSnippet = `const BASE = "${urls.origin}";
const APP_ID = "${appId}";

// 1. 换取 access_token
const BOTS_API_URL = \`\${BASE}/app/getAppAccessToken\`;

// 2. 获取 WebSocket 接入点（二选一）
const API_URL = \`\${BASE}/gateway/\${APP_ID}\`;
// const API_URL = \`\${BASE}/gateway/bot/\${APP_ID}\`;

// 3. WebSocket 直连
const WS_URL = \`${urls.websocket}\`;`;

  const toc = [
    { id: "overview", label: "概述" },
    { id: "deploy", label: "部署（自建）" },
    { id: "login", label: "登录控制台" },
    { id: "create-bot", label: "创建 Bot" },
    { id: "qq-platform", label: "QQ 开放平台" },
    { id: "sdk", label: "SDK 接入" },
    { id: "verify", label: "验证清单" },
    { id: "faq", label: "常见问题" },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">接入指引</h1>
        <p className="mt-2 text-sm text-zinc-500">
          从零开始部署网关、配置 QQ 机器人，并用 SDK 接收 WebSocket 事件。以下地址均基于当前域名{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
            {origin}
          </code>
          生成。
        </p>
      </div>

      <nav className="mb-10 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          目录
        </p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          {toc.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-sm text-zinc-700 hover:text-zinc-900 hover:underline"
              >
                {i + 1}. {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        <Section id="overview" title="1. 概述">
          <p>
            本网关将 QQ 官方 <strong>Webhook</strong> 事件转发为{" "}
            <strong>WebSocket</strong> 协议，兼容{" "}
            <a
              href="https://github.com/lemonade-lab/qq-bot"
              className="text-zinc-900 underline"
              target="_blank"
              rel="noreferrer"
            >
              qq-bot
            </a>{" "}
            等客户端 SDK。每个 Bot 按 <code className="font-mono">appId</code>{" "}
            独立路由，多用户通过 GitHub 登录管理自己的机器人。
          </p>
          <p>典型数据流：</p>
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-700">
            QQ 平台 Webhook → 本网关验签 → WebSocket 广播 → 你的 Bot 程序
          </p>
        </Section>

        <Section id="deploy" title="2. 部署（自建实例）">
          <p>
            若你使用他人托管的实例，可跳过本节，直接从「登录控制台」开始。自建有三种方式：
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>一键部署</strong>：GitHub README 中的 Deploy to Cloudflare
              按钮，自动创建 D1 / Queue / Worker
            </li>
            <li>
              <strong>GitHub Actions</strong>：配置{" "}
              <code className="font-mono">CLOUDFLARE_API_TOKEN</code> 后推{" "}
              <code className="font-mono">master</code> 自动部署
            </li>
            <li>
              <strong>本地手动</strong>：<code className="font-mono">pnpm run deploy</code>
            </li>
          </ul>
          <p>部署后须配置 Worker Secrets：</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <code className="font-mono">AUTH_SECRET</code>、
              <code className="font-mono">AUTH_GITHUB_ID</code>、
              <code className="font-mono">AUTH_GITHUB_SECRET</code>
            </li>
            <li>
              <code className="font-mono">ENCRYPTION_KEY</code>（64 位 hex，加密
              Bot secret）
            </li>
            <li>
              <code className="font-mono">PUBLIC_URL</code>、
              <code className="font-mono">GATEWAY_WS_URL</code>、
              <code className="font-mono">AUTH_URL</code> 改为你的域名
            </li>
          </ul>
          <p>
            详细步骤见仓库{" "}
            <a
              href="https://github.com/lc-cn/qq-bot-transfer/blob/master/docs/DEPLOY-CLOUDFLARE.md"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              DEPLOY-CLOUDFLARE.md
            </a>
            。
          </p>
        </Section>

        <Section id="login" title="3. 登录控制台">
          <p>
            打开{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline">
              登录页
            </Link>
            ，使用 GitHub 账号登录。首次使用需在 GitHub 创建 OAuth App：
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Homepage URL：<code className="font-mono">{urls.origin}</code>
            </li>
            <li>Authorization callback URL（见下方）</li>
          </ul>
          <UrlRow label="GitHub OAuth Callback" url={urls.oauthCallback} />
        </Section>

        <Section id="create-bot" title="4. 在控制台创建 Bot">
          <p>
            登录后进入{" "}
            <Link href="/" className="font-medium text-zinc-900 underline">
              控制台
            </Link>
            ，点击「新增 Bot」，填写：
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>App ID</strong>：QQ 开放平台机器人 ID（创建后不可修改）
            </li>
            <li>
              <strong>Client Secret</strong>：开放平台密钥（加密存储，用于换
              access_token）
            </li>
            <li>
              <strong>名称 / QQ 号</strong>：显示用，会出现在 WebSocket READY
              中
            </li>
          </ul>
          <p>
            保存后可在 Bot 详情页复制各端点地址，并使用内置 WebSocket
            调试查看实时事件。
          </p>
        </Section>

        <Section id="qq-platform" title="5. QQ 开放平台配置">
          <p>
            在{" "}
            <a
              href="https://q.qq.com/"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              QQ 开放平台
            </a>{" "}
            → 你的机器人 → <strong>开发设置 → 事件订阅</strong>：
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>订阅方式选择 <strong>Webhook</strong></li>
            <li>将回调地址设为下方 URL（把 YOUR_APP_ID 换成真实 App ID）</li>
          </ul>
          <UrlRow label="Webhook 回调地址" url={urls.webhook} />
          <p className="text-xs text-zinc-500">
            示例：若 App ID 为 <code className="font-mono">102005927</code>，则
            回调为{" "}
            <code className="font-mono">
              {urls.webhook.replace(appId, "102005927")}
            </code>
          </p>
        </Section>

        <Section id="sdk" title="6. SDK / 客户端接入">
          <p>将 SDK 的 HTTP 基址指向本网关，流程为：</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <code className="font-mono">POST /app/getAppAccessToken</code>{" "}
              换取 token
            </li>
            <li>
              <code className="font-mono">GET /gateway/{"{appId}"}</code> 获取
              WebSocket URL
            </li>
            <li>
              连接 WebSocket，发送 Identify（
              <code className="font-mono">token: QQBot {"{access_token}"}</code>
              ）
            </li>
            <li>收到 READY 后等待 Webhook 转发的事件</li>
          </ol>

          <UrlRow label="Token API" url={urls.auth} />
          <UrlRow label="Gateway API" url={urls.gateway} />
          <UrlRow label="Gateway Bot API（含分片信息）" url={urls.gatewayBot} />
          <UrlRow label="WebSocket" url={urls.websocket} />

          <p className="pt-1">TypeScript 配置示例（将 YOUR_APP_ID 替换为真实值）：</p>
          <CodeBlock>{sdkSnippet}</CodeBlock>
          <div className="flex justify-end">
            <CopyButton text={sdkSnippet} label="复制代码" />
          </div>

          <p className="text-xs text-zinc-500">
            协议细节与官方差异见{" "}
            <a
              href="https://github.com/lc-cn/qq-bot-transfer/blob/master/docs/GATEWAY-QQ-ALIGNMENT.md"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              GATEWAY-QQ-ALIGNMENT.md
            </a>
            。断线后 SDK 可发 Resume (op=6) 重连。
          </p>
        </Section>

        <Section id="verify" title="7. 验证清单">
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-zinc-400">□</span>
              <span>
                健康检查：{" "}
                <code className="font-mono">curl {urls.health}</code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-400">□</span>
              <span>Dashboard 能 GitHub 登录并创建 Bot</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-400">□</span>
              <span>SDK 日志出现 READY（op=0, t=READY）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-400">□</span>
              <span>群内 @ 机器人后客户端收到 GROUP_AT_MESSAGE_CREATE</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-400">□</span>
              <span>Dashboard 事件页有 Webhook 记录</span>
            </li>
          </ul>
        </Section>

        <Section id="faq" title="8. 常见问题">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-zinc-800">
                登录页报 Configuration / OAuth 错误？
              </p>
              <p className="mt-1">
                检查 Worker Secrets 中的 AUTH_GITHUB_* 是否正确，且 GitHub
                OAuth Callback 与上方地址完全一致（含 https）。
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-800">
                WebSocket 断线后「无效的会话」？
              </p>
              <p className="mt-1">
                确保网关已更新到支持 Resume 的版本；重启 Bot SDK
                后应能自动重连。若仍失败，检查 access_token 是否过期。
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-800">
                getAppAccessToken 返回错误？
              </p>
              <p className="mt-1">
                确认 Dashboard 中 Bot 的 clientSecret 与 QQ 开放平台一致；或在
                SDK 请求中直接携带 appId + clientSecret。
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-800">收不到 Webhook 事件？</p>
              <p className="mt-1">
                核对 QQ 开放平台回调 URL、事件订阅是否已开启，以及机器人是否已被
                @ 或触发对应事件类型。
              </p>
            </div>
          </div>
        </Section>
      </div>

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400">
        需要管理 Bot？{" "}
        <Link href="/login" className="underline hover:text-zinc-600">
          登录控制台
        </Link>
      </footer>
    </main>
  );
}
