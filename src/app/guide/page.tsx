import { headers } from "next/headers";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import {
  guideEndpoints,
  qqOfficialBotEnvExample,
  qqOfficialBotExample,
} from "@/lib/guide-urls";
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
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  );
}

function UrlCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <div className="mt-1 flex items-center gap-2">
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

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
        {num}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

export default async function GuidePage() {
  const hdrs = await headers();
  const origin = originFromHeaderGet((n) => hdrs.get(n));
  const urls = guideEndpoints(origin);
  const appId = "YOUR_APP_ID";

  const botExample = qqOfficialBotExample(origin, appId);
  const envExample = qqOfficialBotEnvExample(origin, appId);

  const toc = [
    { id: "overview", label: "概览" },
    { id: "login", label: "1. 登录" },
    { id: "create-bot", label: "2. 创建 Bot" },
    { id: "qq-platform", label: "3. QQ 开放平台" },
    { id: "qq-official-bot", label: "4. 配置 qq-official-bot" },
    { id: "verify", label: "验证" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          接入指引
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          使用{" "}
          <a
            href="https://zhinjs.github.io/qq-official-bot/"
            className="font-medium text-zinc-800 underline"
            target="_blank"
            rel="noreferrer"
          >
            qq-official-bot
          </a>{" "}
          接入本网关：QQ 平台 Webhook → 网关转发 → 你的 Node 程序 WebSocket 收事件。
          以下地址基于{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-700">
            {origin}
          </code>
          。
        </p>
      </div>

      {/* TOC */}
      <nav className="mb-10 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
          目录
        </p>
        <ol className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {toc.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                {i > 0 && item.label.match(/^\d\./) ? "" : null}
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12">
        {/* Overview */}
        <section id="overview" className="scroll-mt-20">
          <p className="text-sm leading-relaxed text-zinc-600">
            本网关接收 QQ 开放平台推送的 <strong>Webhook</strong> 事件，验证签名后通过{" "}
            <strong>WebSocket</strong> 广播给已连接的客户端程序。每个 Bot 按{" "}
            <code className="font-mono text-xs">appId</code> 独立路由，多用户通过
            GitHub 登录管理各自的机器人。
          </p>
          <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-center font-mono text-xs text-zinc-600">
            QQ Webhook → 网关验签 → WebSocket 广播 → 你的 Bot 程序
          </div>
        </section>

        {/* Flow steps */}
        <div className="space-y-8">
          <Section id="login" title="1. 登录控制台">
            <Step num={1} title="GitHub 登录">
              <p>
                打开{" "}
                <Link href="/login" className="font-medium text-zinc-900 underline">
                  登录页
                </Link>
                ，使用 GitHub 账号授权即可使用，无需单独注册。
              </p>
            </Step>
            <Step num={2} title="创建 GitHub OAuth App">
              <p className="text-xs text-zinc-500">
                如果是首次部署，需在 GitHub 设置中创建 OAuth App，回调地址为：
              </p>
              <UrlCard label="GitHub OAuth Callback URL" url={urls.oauthCallback} />
            </Step>
          </Section>

          <Section id="create-bot" title="2. 在控制台创建 Bot">
            <p>
              登录后进入{" "}
              <Link href="/" className="font-medium text-zinc-900 underline">
                控制台
              </Link>
              ，点击「新增 Bot」，填写以下信息：
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold text-zinc-800">App ID</p>
                <p className="mt-1 text-xs text-zinc-500">
                  QQ 开放平台的机器人 ID，创建后不可修改
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold text-zinc-800">Client Secret</p>
                <p className="mt-1 text-xs text-zinc-500">
                  开放平台密钥，加密存储，用于换取 access_token
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold text-zinc-800">名称 / QQ</p>
                <p className="mt-1 text-xs text-zinc-500">
                  显示用，会出现在 WebSocket READY 消息中
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              保存后在 Bot 详情页可查看 Webhook、Gateway、WebSocket 等端点地址。
              使用「事件」页的「实时」模式可直接观察 WebSocket 事件流。
            </p>
          </Section>

          <Section id="qq-platform" title="3. 配置 QQ 开放平台">
            <p>
              进入{" "}
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
            <ol className="ml-5 list-decimal space-y-3">
              <li>订阅方式选择 <strong>Webhook</strong></li>
              <li>
                将回调地址设为下方 URL（将 <code className="font-mono text-xs">YOUR_APP_ID</code> 替换为真实值）
              </li>
            </ol>
            <UrlCard label="Webhook 回调地址" url={urls.webhook} />
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <strong>提示：</strong>若 App ID 为{" "}
              <code className="font-mono">102005927</code>，则回调地址为{" "}
              <code className="font-mono break-all">
                {urls.webhook.replace(appId, "102005927")}
              </code>
            </div>
          </Section>

          <Section id="qq-official-bot" title="4. 配置 qq-official-bot">
            <p>
              推荐用{" "}
              <a
                href="https://www.npmjs.com/package/qq-official-bot"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                qq-official-bot
              </a>{" "}
              作为客户端 SDK。安装后只需改两个网关地址，即可从 WebSocket 收事件（无需在本地再起 Webhook 服务）。
            </p>

            <CodeBlock>{`npm install qq-official-bot
# 或
pnpm add qq-official-bot`}</CodeBlock>

            <p className="font-medium text-zinc-800">关键配置项</p>
            <p className="text-xs text-zinc-500">
              WebSocket 模式通过 <code className="font-mono">accessTokenUrl</code> 和{" "}
              <code className="font-mono">gatewayUrl</code> 覆盖默认官方地址。详见{" "}
              <a
                href="https://zhinjs.github.io/qq-official-bot/config.html"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                qq-official-bot 配置文档
              </a>
              。
            </p>

            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Bot 字段</th>
                    <th className="px-3 py-2 font-medium">本网关地址</th>
                    <th className="px-3 py-2 font-medium">说明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white text-zinc-700">
                  <tr>
                    <td className="px-3 py-2 font-mono">accessTokenUrl</td>
                    <td className="px-3 py-2">
                      <code className="break-all font-mono">{urls.auth}</code>
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      完整 URL；POST body 仍为{" "}
                      <code className="font-mono">{`{ appId, clientSecret }`}</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">gatewayUrl</td>
                    <td className="px-3 py-2">
                      <code className="break-all font-mono">{urls.gatewayBot}</code>
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      须含 <code className="font-mono">appId</code>；响应里的{" "}
                      <code className="font-mono">url</code> 即 WebSocket 地址
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">appid / secret</td>
                    <td className="px-3 py-2 text-zinc-500">—</td>
                    <td className="px-3 py-2 text-zinc-500">
                      与 QQ 开放平台一致；<code className="font-mono">secret</code> 勿提交 git
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">mode</td>
                    <td className="px-3 py-2 font-mono">ReceiverMode.WEBSOCKET</td>
                    <td className="px-3 py-2 text-zinc-500">
                      收事件走 WebSocket；QQ 平台 Webhook 仍配在网关（上一步）
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <UrlCard label="accessTokenUrl" url={urls.auth} />
              <UrlCard label="gatewayUrl（含 appId）" url={urls.gatewayBot} />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              <strong>注意：</strong>本网关是多租户路由，{" "}
              <code className="font-mono">gatewayUrl</code> 必须是{" "}
              <code className="font-mono">/gateway/bot/YOUR_APP_ID</code>，不能只写{" "}
              <code className="font-mono">/gateway/bot</code>。将{" "}
              <code className="font-mono">YOUR_APP_ID</code> 换成你的 App ID。
            </div>

            <p className="font-medium text-zinc-800">完整示例</p>
            <CodeBlock>{botExample}</CodeBlock>
            <div className="flex justify-end">
              <CopyButton text={botExample} label="复制代码" />
            </div>

            <p className="font-medium text-zinc-800">推荐 .env</p>
            <CodeBlock>{envExample}</CodeBlock>
            <div className="flex justify-end">
              <CopyButton text={envExample} label="复制 .env" />
            </div>

            <p className="text-xs text-zinc-500">SDK 内部连接流程：</p>
            <ol className="ml-5 list-decimal space-y-1.5 text-xs text-zinc-600">
              <li>
                <code className="font-mono">POST accessTokenUrl</code> 换取 access_token
              </li>
              <li>
                <code className="font-mono">GET gatewayUrl</code> 取 WebSocket 接入点
              </li>
              <li>自动连接 WebSocket，Identify 后收到 READY，开始收事件</li>
            </ol>

            <p className="text-xs text-zinc-500">
              群机器人常用 intents：<code className="font-mono">GROUP_AND_C2C_EVENT</code>、
              <code className="font-mono">GROUP_MEMBER</code>；频道机器人见{" "}
              <a
                href="https://zhinjs.github.io/qq-official-bot/config.html"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                官方 intents 列表
              </a>
              。启动后执行 <code className="font-mono">bot.start()</code>，日志出现 READY 即表示接通。
            </p>

            <details className="rounded-lg border border-zinc-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 hover:text-zinc-900">
                协议差异 / 断线重连
              </summary>
              <div className="border-t border-zinc-100 px-4 pb-3 pt-2 text-xs text-zinc-500">
                <p>
                  本网关 WebSocket 与 QQ 官方基本一致，差异见{" "}
                  <a
                    href="https://github.com/lc-cn/qq-bot-transfer/blob/master/docs/GATEWAY-QQ-ALIGNMENT.md"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GATEWAY-QQ-ALIGNMENT.md
                  </a>
                  。qq-official-bot 断线后会自动 Resume 重连；若报「无效的会话」，重启{" "}
                  <code className="font-mono">bot.start()</code> 即可。
                </p>
              </div>
            </details>
          </Section>
        </div>

        {/* Verify */}
        <section id="verify" className="scroll-mt-20 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">验证清单</h2>
          <ul className="mt-4 space-y-3 text-sm text-zinc-600">
            {[
              ["健康检查", <>运行 <code className="font-mono text-xs">curl {urls.health}</code> 返回 200</>],
              ["登录", "Dashboard 能使用 GitHub 登录并创建 Bot"],
              ["连接", "qq-official-bot 日志出现 READY"],
              ["事件", "群内 @ 机器人后 bot.on('message') 收到消息"],
              ["记录", "Dashboard 事件页有 Webhook 历史记录"],
            ].map(([label, desc]) => (
              <li key={label as string} className="flex items-start gap-3">
                <span className="mt-0.5 text-zinc-300">✓</span>
                <div>
                  <span className="font-medium text-zinc-700">{label as string}</span>
                  <span className="ml-2">{desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <h2 className="text-xl font-semibold text-zinc-900">常见问题</h2>
          <div className="mt-4 space-y-4">
            {[
              [
                "登录报 Configuration / OAuth 错误？",
                "检查 AUTH_GITHUB_ID 和 AUTH_GITHUB_SECRET 是否正确，GitHub OAuth Callback 与上方的绝对一致（含 https）。",
              ],
              [
                "gatewayUrl 填了 /gateway/bot 连不上？",
                "本网关必须在路径末尾带上 appId，例如 gatewayUrl 设为上方的 /gateway/bot/YOUR_APP_ID，不能只写官方默认的 /gateway/bot。",
              ],
              [
                "WebSocket 断线后「无效的会话」？",
                "重启 bot.start()；qq-official-bot 会尝试 Resume 重连。确认 accessTokenUrl / gatewayUrl 指向本网关。",
              ],
              [
                "getAppAccessToken 返回错误？",
                "确认控制台中 Bot 的 clientSecret 与 QQ 开放平台一致；或在请求中直接携带 appId + clientSecret。",
              ],
              [
                "收不到 Webhook 事件？",
                "核对 QQ 开放平台的回调 URL 是否完整、事件订阅是否已开启、机器人是否已被 @ 或触发了对应事件类型。",
              ],
            ].map(([q, a]) => (
              <details key={q as string} className="rounded-lg border border-zinc-200 bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 hover:text-zinc-900">
                  {q as string}
                </summary>
                <div className="border-t border-zinc-100 px-4 pb-3 pt-2 text-xs text-zinc-500">
                  {a as string}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400">
        需要管理 Bot？{" "}
        <Link href="/login" className="underline hover:text-zinc-600">
          登录控制台
        </Link>
      </footer>
    </main>
  );
}
