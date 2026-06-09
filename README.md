# QQ Bot 多租户 Webhook → WebSocket 网关

在 [lemonade-lab/qq-bot](https://github.com/lemonade-lab/qq-bot) 能力基础上，增加多用户 Bot 配置、事件持久化与管理控制台，并通过 **GitHub OAuth** 登录。

**在线实例**：<https://bots.l2cl.link>

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lc-cn/qq-bot-transfer)

## 功能

- **Webhook → WebSocket**：QQ 官方 Webhook 事件转发为 QQ Bot WebSocket 协议
- **按 App ID 路由**：`appId` 全局唯一，路径简洁
- **多租户**：登录用户管理自己的 Bot 列表
- **事件历史**：Webhook 事件经 Queue 异步写入 D1，Dashboard 可分页查看

## 架构（Cloudflare 单体）

```
QQ 开放平台 Webhook
        ↓
Worker (worker/index.ts)
  ├─ /webhook、/websocket、/gateway、/app/getAppAccessToken → BotGatewayDO（每 appId 一个）
  └─ Dashboard / Admin API → OpenNext (Next.js)
        ↓
D1（User / Bot / WebhookEvent）  +  Queue（异步写事件）
```

| 组件 | 说明 |
|------|------|
| **Worker + OpenNext** | 单体部署，自定义域 + WebSocket |
| **Durable Object** | 每 Bot 独立网关：验签、WS 广播、Token 代理 |
| **D1 + Drizzle** | 用户、Bot 配置、事件历史 |
| **Queue** | Webhook 事件异步持久化 |

---

## 使用指南（配置 Bot）

适用于在 **bots.l2cl.link** 上使用网关，或自建后接入 SDK。

### 1. 登录 Dashboard

1. 打开 <https://bots.l2cl.link/login>
2. 使用 **GitHub OAuth** 登录（需仓库管理员预先配置 OAuth App，见下方「部署」）

### 2. 在 Dashboard 创建 Bot

进入 **Bots → 新建 Bot**，填写：

| 字段 | 说明 |
|------|------|
| **App ID** | QQ 开放平台机器人 `appId`（创建后不可改） |
| **Client Secret** | QQ 开放平台 `clientSecret`（加密存 D1，仅用于换 access_token） |
| **名称** | 显示用，会出现在 WS READY 的 `username` |
| **QQ 号** | Bot 的 QQ 号（可选，会出现在 READY 的 `user.id`） |

保存后可在 Bot 详情页复制 **Webhook 地址** 与各 API 路径。

### 3. 在 QQ 开放平台配置 Webhook

在机器人 **开发设置 → 事件订阅** 中：

- 订阅方式：**Webhook**
- 回调地址：`https://bots.l2cl.link/webhook/{appId}`（将 `{appId}` 换成你的 App ID）

示例：`https://bots.l2cl.link/webhook/102005927`

### 4. SDK / 客户端接入

与官方 [qq-bot](https://github.com/lemonade-lab/qq-bot) 类似，把 HTTP 基址和 Gateway 指到本网关即可：

```ts
const BASE = "https://bots.l2cl.link"; // 自建则换成你的域名
const APP_ID = "102005927";

// 换 access_token（body 需带 appId + clientSecret，或由 Dashboard 预存 secret 后仅传 appId）
const BOTS_API_URL = `${BASE}/app/getAppAccessToken`;

// 获取 WebSocket 接入点（二选一）
const API_URL = `${BASE}/gateway/${APP_ID}`;
// 或带分片信息：GET ${BASE}/gateway/bot/${APP_ID}

// WebSocket 直连地址
const WS_URL = `wss://bots.l2cl.link/websocket/${APP_ID}`;
```

**连接流程**：`POST getAppAccessToken` → `GET /gateway/{appId}` 取 `url` → WebSocket Identify（`token: QQBot {access_token}`）→ 收到 READY → 等待 Webhook 转发的事件。

协议细节与官方差异见 [docs/GATEWAY-QQ-ALIGNMENT.md](docs/GATEWAY-QQ-ALIGNMENT.md)。

### 5. 验证是否接通

| 检查项 | 预期 |
|--------|------|
| `curl https://bots.l2cl.link/api/health` | 返回健康状态 |
| SDK 日志 | 出现 `READY`（op=0, t=READY） |
| 群内 @ 机器人 | 客户端收到 `GROUP_AT_MESSAGE_CREATE` 等事件 |
| Dashboard 事件页 | 有 Webhook 记录（通常 1 秒内） |

Dashboard Bot 详情页还提供 **实时 WebSocket 调试**（无需在本地跑 SDK 即可看事件流）。

---

## 部署指南

### 方式 A：一键部署到 Cloudflare（最快）

点击 README 顶部的 **Deploy to Cloudflare** 按钮，Cloudflare 会：

1. Fork 仓库到你的 GitHub
2. 自动创建 D1、Queue、Durable Object 等资源
3. 配置 Workers Builds，后续 push 自动部署

**部署配置页需填写**（`package.json` 里已有说明）：

| 项 | 说明 |
|----|------|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `PUBLIC_URL` / `AUTH_URL` | 你的 `*.workers.dev` 或自定义域 |
| `GATEWAY_WS_URL` | `wss://<域名>/websocket` |

**部署后还需**：

1. GitHub OAuth Callback → `https://<你的域名>/api/auth/callback/github`
2. （可选）Workers → Custom Domains 绑定自己的域名，并同步更新上述三个 URL
3. QQ 开放平台 Webhook → `https://<域名>/webhook/{appId}`

> Worker 名称若改了，请确保 `wrangler.toml` 里 `[[services]]` 的 `service` 与 `name` 一致（自引用 Service Binding）。

### 方式 B：GitHub Actions 自动部署（本仓库维护者）

推 **`master`** 后自动：typecheck → 构建 → D1 迁移 → 部署。

**一次性配置**：

1. 按 [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md) 完成 Cloudflare D1、Queue、Secrets、自定义域
2. 在 GitHub 仓库 Secrets 添加 `CLOUDFLARE_API_TOKEN`（Workers + D1 写权限）
3. 推代码到 `master`，或在 Actions → **Deploy** → Run workflow

详见 [docs/DEPLOY-GITHUB-ACTIONS.md](docs/DEPLOY-GITHUB-ACTIONS.md)。

```bash
# 也可本地用 gh 写入 Secret（Token 勿提交 git）
grep '^CLOUDFLARE_API_TOKEN=' .env.production | cut -d= -f2- | gh secret set CLOUDFLARE_API_TOKEN
```

### 方式 C：本地手动部署

```bash
pnpm install
pnpm run deploy   # build + D1 migrate + deploy
```

### 首次部署清单（自建实例）

| 步骤 | 说明 |
|------|------|
| D1 | `pnpm exec wrangler d1 create qq-bot-transfer`，`database_id` 写入 `wrangler.toml` |
| Queue | `pnpm exec wrangler queues create event-persist` |
| Secrets | `wrangler secret put` → `AUTH_SECRET`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`、`ENCRYPTION_KEY` |
| Vars | `wrangler.toml` 中 `PUBLIC_URL`、`GATEWAY_WS_URL`、`AUTH_URL` 改为你的域名 |
| GitHub OAuth | Callback：`https://你的域名/api/auth/callback/github` |
| 自定义域 | Cloudflare Dashboard → Workers → Custom Domains |

完整步骤：[docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md)

### Legacy：VPS Node

旧版 1Panel + Postgres 部署见 [docs/DEPLOY-VPS-NODE.md](docs/DEPLOY-VPS-NODE.md)（已不再推荐）。

---

## 本地开发

```bash
cp .env.example .env
# 编辑 AUTH_*、ENCRYPTION_KEY 等

pnpm install
pnpm run db:migrate:local
pnpm run preview   # OpenNext build + wrangler dev → http://localhost:8787
```

**GitHub OAuth 本地回调**：`http://localhost:8787/api/auth/callback/github`

**本地 WebSocket**：`ws://localhost:8787/websocket/{appId}`

`ENCRYPTION_KEY` 生成：

```bash
openssl rand -hex 32
```

---

## 网关 API（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/webhook/{appId}` | QQ 平台 Webhook 回调 |
| POST | `/app/getAppAccessToken` | 换取 access_token |
| GET | `/gateway/{appId}` | 返回 `{ url }` 指向本网关 WS |
| GET | `/gateway/bot/{appId}` | 代理官方 gateway/bot，url 换成本网关 |
| WS | `/websocket/{appId}` | WebSocket 事件流 |
| GET | `/api/health` | 健康检查 |

---

## 环境变量

| 变量 | 说明 |
|------|------|
| `PUBLIC_URL` | 对外 HTTPS 基址 |
| `GATEWAY_WS_URL` | WS 基址（含 `/websocket`，不含 appId） |
| `AUTH_URL` | Auth.js 基址（与 PUBLIC_URL 一致） |
| `ENCRYPTION_KEY` | Bot clientSecret AES 密钥（64 位 hex） |
| `AUTH_SECRET` / `AUTH_GITHUB_*` | Auth.js + GitHub OAuth |
| `WEBHOOK_EVENT_*` | 事件保留天数、每 Bot 上限 |

本地见 [.env.example](.env.example) 与 [.dev.vars.example](.dev.vars.example)；生产敏感项用 `wrangler secret put`，非敏感项在 `wrangler.toml` `[vars]`。

---

## 常用命令

```bash
pnpm run dev          # wrangler dev（仅 Worker 路由）
pnpm run preview      # OpenNext + wrangler dev（完整应用）
pnpm run typecheck    # TypeScript 检查
pnpm run build:cf     # 构建 Cloudflare bundle
pnpm run deploy       # 构建并部署
pnpm run db:migrate:local   # 本地 D1 迁移
pnpm run db:migrate:remote  # 生产 D1 迁移
```

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md) | Cloudflare 首次部署、Secrets、验证清单 |
| [docs/DEPLOY-GITHUB-ACTIONS.md](docs/DEPLOY-GITHUB-ACTIONS.md) | CI/CD 自动部署 |
| [docs/GATEWAY-QQ-ALIGNMENT.md](docs/GATEWAY-QQ-ALIGNMENT.md) | 与 QQ 官方 WebSocket 协议对照 |
| [docs/DEPLOY-VPS-NODE.md](docs/DEPLOY-VPS-NODE.md) | Legacy VPS 部署 |

## License

MIT
