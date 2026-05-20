# 生产部署（Supabase + Docker）

> **使用 1Panel？** 请直接看 **[DEPLOY-1PANEL.md](./DEPLOY-1PANEL.md)**（面板点选步骤 + 反代 WebSocket）。

本网关含 **WebSocket 长连接**，须部署在支持 TCP/WebSocket 的平台（VPS、1Panel、Railway、Fly.io 等），**不能**仅用 Vercel 无状态函数。

## 1. Supabase 建库

1. [Supabase](https://supabase.com) 新建项目，记下数据库密码。
2. **Project Settings → Database → Connection string**：
   - **Transaction pooler（端口 6543）** → 用作 `DATABASE_URL`，末尾加上 `?pgbouncer=true`（Prisma 需要）。
   - **Direct connection（`db.xxx.supabase.co:5432`）** → 用作 `DIRECT_URL`，仅用于 `pnpm db:push`。
3. 本地一次性同步表结构（在能访问 Supabase 的机器上）：

```bash
cp .env.example .env
# 填入 DATABASE_URL、DIRECT_URL、ENCRYPTION_KEY、AUTH_*、GITHUB_*、PUBLIC_URL

pnpm install
pnpm db:push
```

`db:push` 会走 `DIRECT_URL`；应用运行时走 `DATABASE_URL` 连接池。

## 2. 环境变量（生产）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Supabase **Transaction pooler** + `?pgbouncer=true` |
| `DIRECT_URL` | Supabase **直连**（仅 push 时需要；容器运行时也要配，可与 push 时相同） |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32`，**生产单独生成**，用于加密 Bot Secret |
| `AUTH_URL` | 公网 HTTPS 根地址，如 `https://bot.example.com` |
| `PUBLIC_URL` | 与 `AUTH_URL` 相同 |
| `AUTH_STRICT_URL` | 建议 `true`，避免反代 Host 与配置不一致 |
| `GATEWAY_WS_URL` | 建议 `wss://bot.example.com/websocket` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App |
| `PORT` | 容器内一般为 `3000` |
| `NODE_ENV` | `production` |

## 3. GitHub OAuth

OAuth App → **Authorization callback URL**：

```
https://<你的域名>/api/auth/callback/github
```

## 4. Docker 部署

```bash
# .env 已配置 Supabase 与上述变量
docker compose -f docker-compose.prod.yml up -d --build
```

首次或 `schema.prisma` 变更后，在部署前于本机执行 `pnpm db:push`（不要依赖容器内自动迁移）。

## 5. 反向代理（Nginx 示例）

须支持 WebSocket Upgrade：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}
```

## 6. QQ 开放平台

- Webhook：`https://<域名>/webhook/{appId}`
- SDK：`https://<域名>/app/getAppAccessToken/{appId}`、`https://<域名>/gateway/{appId}`

## 7. 健康检查

```bash
curl -s https://<域名>/api/health
# 可选：curl -H "X-Health-Key: $HEALTH_KEY" ...
```

## 8. 注意

- **单实例**：v1 网关 Hub 在进程内存，多副本需后续 Redis 广播。
- **勿提交** `.env`；Supabase 密码、ENCRYPTION_KEY 泄露后需轮换。
- 本地开发仍可用 `docker compose up -d postgres` + 本地 `DATABASE_URL` / `DIRECT_URL`。
