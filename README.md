# QQ Bot 多租户 Webhook → WebSocket 网关

在 [lemonade-lab/qq-bot](https://github.com/lemonade-lab/qq-bot) 能力基础上，增加多用户 Bot 配置、PostgreSQL 持久化与管理控制台，并通过 **GitHub OAuth** 登录（有 GitHub 账号即可，无需单独注册）。

## 功能

- **Webhook → WebSocket**：QQ 官方 Webhook 事件转发为 QQ Bot WebSocket 协议
- **按 App ID 路由**：`appId` 全局唯一，路径简洁
- **多租户**：登录用户管理自己的 Bot 列表
- **事件历史**：Webhook 事件写入数据库并可分页查看

## 快速开始

### 1. 依赖与环境

```bash
cp .env.example .env
# 编辑 DATABASE_URL、AUTH_*、ENCRYPTION_KEY、PUBLIC_URL

docker compose up -d postgres
pnpm install
pnpm db:push
```

`ENCRYPTION_KEY` 生成示例：

```bash
openssl rand -hex 32
```

### 2. GitHub OAuth App

在 [GitHub Developer settings](https://github.com/settings/developers) 新建 **OAuth App**：

- **Authorization callback URL**
  - 开发：`http://localhost:3000/api/auth/callback/github`
  - 生产：`https://<你的域名>/api/auth/callback/github`

将 **Client ID** / **Client Secret** 写入 `.env` 的 `AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`。

### 3. 运行

```bash
pnpm dev
```

访问 `http://localhost:3000`，未登录会跳转 `/login`。

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

将原 QQ SDK 的两个地址改为本网关（`APP_ID` 替换为机器人 App ID）：

```ts
const BASE = "https://<你的域名>";
const APP_ID = "1234567890";

const BOTS_API_URL = `${BASE}/app/getAppAccessToken`;
const API_URL = `${BASE}/gateway/${APP_ID}`;
// getAppAccessToken 的 POST body 与官方相同：{ appId: APP_ID, clientSecret: "..." }
```

`GET /gateway/{appId}` 与 [qq-bot](https://github.com/lemonade-lab/qq-bot) 相同，仅返回 `{ "url": "..." }`。`GET /gateway/bot/{appId}` 代理 QQ 官方，返回 `url`（换成本网关）、`shards`、`session_start_limit`。与 QQ 官方 WebSocket 能力对照见 [docs/GATEWAY-QQ-ALIGNMENT.md](docs/GATEWAY-QQ-ALIGNMENT.md)。

## QQ 开放平台配置

Webhook 回调地址：

```
https://<你的域名>/webhook/{appId}
```

## 管理端

| 路径 | 说明 |
|------|------|
| `/` | Dashboard（Bot 列表） |
| `/login` | GitHub 登录 |
| `/bots/{appId}/events` | Webhook 事件历史 |

## 本地 Docker（仅 Postgres）

```bash
docker compose up -d postgres
pnpm db:push
pnpm dev
```

## 生产部署

| 方式 | 文档 |
|------|------|
| **1Panel 运行环境 + Node（推荐）** | **[docs/DEPLOY-VPS-NODE.md](docs/DEPLOY-VPS-NODE.md)** |
| GitHub 推 `master` 自动发布 | [docs/DEPLOY-GITHUB-ACTIONS.md](docs/DEPLOY-GITHUB-ACTIONS.md) |
| 1Panel 反代 / WebSocket | [docs/DEPLOY-1PANEL.md](docs/DEPLOY-1PANEL.md) |
| PostgreSQL | [docs/DEPLOY-POSTGRES.md](docs/DEPLOY-POSTGRES.md) |

流程概要：本地 `pnpm db:push` → 1Panel 配 **Node 运行环境**（`bash scripts/1panel-start.sh`）→ GitHub Secrets `DEPLOY_*` → **push `master`** 自动 `pnpm build` → 面板 **重启** 运行环境。环境变量：[deploy/1panel.env.example](deploy/1panel.env.example)。

## 环境变量

见 [.env.example](.env.example)。

## 架构说明

- **Custom Server**（`server.ts`）：同一进程处理 WebSocket Upgrade、Webhook 与 Next.js 页面
- **水平扩展**：v1 为单实例内存 Hub；多实例部署需后续引入 Redis 广播

## License

MIT
