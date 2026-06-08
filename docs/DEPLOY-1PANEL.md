# 1Panel 部署指南

> **主流程**：**[DEPLOY-VPS-NODE.md](./DEPLOY-VPS-NODE.md)**（Node 运行环境 + `pnpm build` + 面板重启）。  
> 域名示例：**[DEPLOY-bots-liucl.md](./DEPLOY-bots-liucl.md)**。  
> 自动发布：**[DEPLOY-GITHUB-ACTIONS.md](./DEPLOY-GITHUB-ACTIONS.md)**。

本项目是 **自定义 Node 服务**（`server.ts` + WebSocket）。在 1Panel 上请用 **网站 → Node 运行环境** 托管 `pnpm start`，不要用「仅 PHP/静态」站点，也不要再使用已移除的 Docker 编排。

数据库为服务器 **PostgreSQL**，见 [DEPLOY-POSTGRES.md](./DEPLOY-POSTGRES.md) 与 [.env.example](../.env.example)。

---

## 总览

```
浏览器 / QQ SDK
    ↓ HTTPS
1Panel 网站 → 绑定 Node 运行环境（pnpm start / server.ts）
    ↓
PostgreSQL（本机 / 1Panel 数据库）
```

---

## 面板操作要点

### Node 运行环境

| 配置项 | 填写 |
|--------|------|
| 运行目录 | 项目根（含 `server.ts`、`.env`） |
| Node | 22+（面板有 25 亦可） |
| 启动命令 | `bash scripts/1panel-start.sh` 或 `pnpm start` |
| 端口 | `3000`（与 `.env` 中 `PORT` 一致） |

**不要**在运行环境里执行 `pnpm build`（易卡死）；构建在 SSH 或 GitHub Actions 完成，完成后在面板 **重启** 运行环境。

### 网站（若未通过「运行环境」类型一键绑定）

- 类型：**运行环境** → 选上一步创建的 Node 环境；或 **反向代理** → `http://127.0.0.1:3000`
- **HTTPS** + **WebSocket** 必须开启

无 WebSocket 开关时，在站点 **配置 → 自定义** 加入：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

### 环境变量

在项目根 `.env` 配置即可（`server.ts` 已 `import "dotenv/config"`）。清单见 [deploy/1panel.env.example](../deploy/1panel.env.example)。

---

## GitHub OAuth

- **Homepage URL**：`https://<你的域名>`
- **Authorization callback URL**：`https://<你的域名>/api/auth/callback/github`

与 `.env` 中 `AUTH_URL`、`PUBLIC_URL` 一致。

---

## QQ 开放平台

| 用途 | 地址 |
|------|------|
| Webhook | `https://<域名>/webhook/{appId}` |
| SDK Token | `POST https://<域名>/app/getAppAccessToken`（body 含 `appId`） |
| SDK Gateway | `https://<域名>/gateway/{appId}` |

---

## 常见问题

### QQ SDK 拿到登录页 HTML

- [proxy](../src/proxy.ts) 已放行 `/app/getAppAccessToken`
- SDK 须用 **HTTPS 公网域名**，不要用内网 IP

### WebSocket / Live 连不上

- 站点开启 **WebSocket 反代**
- 建议设置 `GATEWAY_WS_URL=wss://<域名>/websocket`

### 修改代码后

1. 服务器：`git pull` + `bash scripts/deploy-node-on-server.sh`（或推 `master` 触发 Actions）  
2. 1Panel → 运行环境 → **重启**

`schema.prisma` 变更时在能连库的环境执行 `pnpm db:push`。
