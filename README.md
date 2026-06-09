# QQ Bot 多租户 Webhook → WebSocket 网关

在 [lemonade-lab/qq-bot](https://github.com/lemonade-lab/qq-bot) 能力基础上，增加多用户 Bot 配置、事件持久化与管理控制台，并通过 **GitHub OAuth** 登录。

## 功能

- **Webhook → WebSocket**：QQ 官方 Webhook 事件转发为 QQ Bot WebSocket 协议
- **按 App ID 路由**：`appId` 全局唯一，路径简洁
- **多租户**：登录用户管理自己的 Bot 列表
- **事件历史**：Webhook 事件经 Queue 异步写入 D1，Dashboard 可分页查看

## 架构（Cloudflare 单体）

- **Worker**（`worker/index.ts`）：网关路径 → 按 `appId` 路由到 **Durable Object**；其余 → **OpenNext**（Dashboard + Admin API）
- **D1 + Drizzle**：User / Bot / WebhookEvent
- **Queue**：异步持久化 Webhook 事件

生产域名：**`https://bots.l2cl.link`**

## 快速开始（本地）

```bash
cp .env.example .env
# 编辑 AUTH_*、ENCRYPTION_KEY 等

pnpm install
pnpm run db:migrate:local
pnpm run preview   # opennext build + wrangler dev → http://localhost:8787
```

`ENCRYPTION_KEY` 生成：

```bash
openssl rand -hex 32
```

### GitHub OAuth App

- 本地回调：`http://localhost:8787/api/auth/callback/github`
- 生产回调：`https://bots.l2cl.link/api/auth/callback/github`

## 网关路径（无需登录）

| 方法 | 路径 |
|------|------|
| POST | `/webhook/{appId}` |
| POST | `/app/getAppAccessToken` |
| GET | `/gateway/{appId}` |
| GET | `/gateway/bot/{appId}` |
| WS | `/websocket/{appId}` |
| GET | `/api/health` |

## SDK 接入

```ts
const BASE = "https://bots.l2cl.link";
const APP_ID = "1234567890";

const BOTS_API_URL = `${BASE}/app/getAppAccessToken`;
const API_URL = `${BASE}/gateway/${APP_ID}`;
```

与 QQ 官方 WebSocket 能力对照见 [docs/GATEWAY-QQ-ALIGNMENT.md](docs/GATEWAY-QQ-ALIGNMENT.md)。

## 生产部署

| 方式 | 文档 |
|------|------|
| **Cloudflare（推荐）** | **[docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md)** |
| VPS Node（legacy） | [docs/DEPLOY-VPS-NODE.md](docs/DEPLOY-VPS-NODE.md) |

常用命令：

```bash
pnpm run build:cf      # OpenNext + Worker bundle
pnpm run deploy        # 构建并 wrangler deploy
pnpm run db:migrate:remote
```

## 环境变量

见 [.env.example](.env.example) 与 [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md)。

## License

MIT
