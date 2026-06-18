# Cloudflare 部署（bots.l2cl.link）

单体架构：OpenNext + Worker 路由 + Durable Object 网关 + D1 + Queue。

## 前置

- Cloudflare 账号，域名 `l2cl.link` 已接入 Cloudflare
- GitHub OAuth App
- QQ 开放平台 Bot（Webhook 回调）

## 1. 创建 D1

```bash
pnpm exec wrangler d1 create qq-bot-transfer
```

将输出中的 `database_id` 写入 `wrangler.jsonc` 的 `d1_databases[0].database_id`（替换占位 UUID）。

## 2. 应用迁移

```bash
pnpm run db:migrate:local   # 本地 wrangler dev
pnpm run db:migrate:remote  # 生产 D1
```

## 3. Secrets / Vars

`wrangler.jsonc` 已配置 `[vars]`（PUBLIC_URL、GATEWAY_WS_URL 等）。敏感项用 secrets：

```bash
pnpm exec wrangler secret put AUTH_SECRET
pnpm exec wrangler secret put AUTH_GITHUB_ID
pnpm exec wrangler secret put AUTH_GITHUB_SECRET
pnpm exec wrangler secret put ENCRYPTION_KEY
# 可选
pnpm exec wrangler secret put HEALTH_KEY
```

生产 `ENCRYPTION_KEY` 须为 64 位 hex（32 bytes），与 Dashboard 加密 Bot secret 一致。

## 4. GitHub OAuth

- Homepage URL: `https://bots.l2cl.link`
- Callback URL: `https://bots.l2cl.link/api/auth/callback/github`

## 5. QQ Webhook

在 QQ 开放平台配置：

```
https://bots.l2cl.link/webhook/{appId}
```

SDK WebSocket 基址（由 `GATEWAY_WS_URL` 决定）：

```
wss://bots.l2cl.link/websocket/{appId}
```

## 6. DNS

- `bots.l2cl.link` → Cloudflare Worker（`wrangler deploy` 后绑定自定义域）
- 确保 **WebSockets** 已开启

## 7. 构建与部署

### 一键部署（Deploy to Cloudflare 按钮）

README 顶部的按钮会 Fork 仓库、自动创建 D1 / Queue / DO，并启用 Workers Builds。

部署时在配置页填写 Secrets 与 `PUBLIC_URL` 等变量（说明见 `package.json` → `cloudflare.bindings`）。本地 Secrets 模板：`.dev.vars.example`。

### GitHub Actions（本仓库）

配好 `CLOUDFLARE_API_TOKEN` 后推 `master` 即可，见 [DEPLOY-GITHUB-ACTIONS.md](./DEPLOY-GITHUB-ACTIONS.md)。

### 手动部署

```bash
pnpm install
pnpm run deploy   # build + D1 migrate + deploy
```

首次 deploy 前创建 Queue：

```bash
pnpm exec wrangler queues create event-persist
```

`wrangler.jsonc` 中 DO 迁移须用 `new_sqlite_classes`（Free plan）。Worker 入口为 `worker/index.ts`（custom worker：网关 → DO，其余 → OpenNext）。

当前已部署至 `https://qq-bot-transfer.zhin.workers.dev`，绑定 `bots.l2cl.link` 请在 Cloudflare Dashboard → Workers → Custom Domains 中配置。

## 8. 验证清单

| 项 | 命令 / 操作 |
|----|-------------|
| 健康检查 | `curl https://bots.l2cl.link/api/health` |
| Dashboard 登录 | GitHub OAuth 跳转正常 |
| 创建 Bot | Dashboard 新建 Bot（D1 从零开始，不迁移旧 Postgres） |
| getAppAccessToken | SDK 或 `POST /app/getAppAccessToken` 返回 token |
| WebSocket | SDK 连接后日志有 READY（op=0, t=READY, s=1） |
| Webhook 转发 | @ 机器人 → 客户端收到 `GROUP_AT_MESSAGE_CREATE`（s≥2） |
| 事件历史 | Dashboard 事件页有记录（Queue 写入，通常 <1s） |

## 本地开发

```bash
pnpm run db:migrate:local
pnpm run preview   # opennext build + wrangler dev
```

本地默认 `http://localhost:8787`，WebSocket 为 `ws://localhost:8787/websocket/{appId}`。

## 路由说明

Worker 入口 `worker/index.ts` 分流：

- `/webhook/*`、`/websocket/*`、`/gateway/*`、`/app/getAppAccessToken` → 按 `appId` 路由到 `BotGatewayDO`
- 其余 → OpenNext（Dashboard、Auth、Admin API）

## 环境变量摘要

| 变量 | 说明 |
|------|------|
| `PUBLIC_URL` | 对外 HTTPS 基址 |
| `GATEWAY_WS_URL` | WS 基址（含 `/websocket`，不含 appId） |
| `AUTH_URL` | Auth.js 基址（与 PUBLIC_URL 一致） |
| `ENCRYPTION_KEY` | Bot secret AES 密钥 |
| `WEBHOOK_EVENT_*` | 事件保留策略 |
