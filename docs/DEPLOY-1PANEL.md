# 1Panel 部署指南（Supabase + Docker）

> **推荐（无 Docker）**：**[DEPLOY-VPS-NODE.md](./DEPLOY-VPS-NODE.md)** — **网站 → Node 运行环境** + GitHub Actions 只负责 `pnpm build`。  
> 推 `main` 后记得在面板 **重启运行环境**。  
> Docker 编排见本文后半「可选：Docker」；自动发布见 [DEPLOY-GITHUB-ACTIONS.md](./DEPLOY-GITHUB-ACTIONS.md)。

本项目是 **自定义 Node 服务**（`server.ts` + WebSocket）。在 1Panel 上请用 **Node 运行环境** 托管进程（或 Docker），不要用「仅 PHP/静态」站点。

数据库用 **Supabase**（不必在 1Panel 装 Postgres）。

---

## 总览

```
浏览器 / QQ SDK
    ↓ HTTPS
1Panel 网站 → 绑定 Node 运行环境（pnpm start / server.ts）
    ↓
Supabase
```

**推荐部署**（无 Docker、无 PM2）：按 **[DEPLOY-VPS-NODE.md](./DEPLOY-VPS-NODE.md)** 配置「运行环境」；GitHub Actions 只 `build`，你在面板点 **重启**。

下文 **「可选：Docker 编排」** 仅在你坚持用容器时使用。

---

## 第一步：Supabase 建表（在你电脑上做一次）

1. Supabase 控制台 → **Database → Connection string**
2. 复制两条连接串到本地 `.env`（见 [.env.example](../.env.example) 注释）：
   - **Transaction pooler :6543** → `DATABASE_URL`，末尾加 `?pgbouncer=true`
   - **Direct :5432** → `DIRECT_URL`
3. 本地执行：

```bash
pnpm install
pnpm db:push
```

表建好后，生产容器**不需要**再跑 migrate。

---

## 第二步：把代码放到服务器

任选其一：

- **Git**：1Panel「终端」里 `git clone <你的仓库> /opt/qq-bot-transfer`
- **上传**：把整个项目目录上传到服务器，例如 `/opt/qq-bot-transfer`

目录里需包含：`Dockerfile`、`docker-compose.prod.yml`、`package.json` 等。

---

## 可选：Docker 编排

### 第三步：1Panel 创建容器（Compose 编排）

1. 打开 **容器** → **编排** → **创建编排**（或「从 Compose 创建」）
2. **Compose 路径** 选项目目录下的 `docker-compose.prod.yml`
3. **工作目录** 填 `/opt/qq-bot-transfer`（你的实际路径）
4. **端口映射**：`3000:3000`（compose 里已写，确认面板里可见）
5. **环境变量**：不要只依赖服务器上的 `.env` 文件时，可在 1Panel 界面逐项添加（与下面「环境变量清单」一致）；若用 `env_file: .env`，则在项目目录创建 `.env` 后重启编排

### 环境变量清单（在 1Panel 环境变量里填写）

| 变量 | 示例 / 说明 |
|------|-------------|
| `NODE_ENV` | `production` |
| `HOSTNAME` | `0.0.0.0` |
| `PORT` | `3000` |
| `DATABASE_URL` | Supabase Transaction pooler + `?pgbouncer=true` |
| `DIRECT_URL` | Supabase Direct（与 push 时相同，Prisma 运行时需要） |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32`（64 位十六进制） |
| `AUTH_URL` | `https://bot.你的域名.com` |
| `PUBLIC_URL` | 同 `AUTH_URL` |
| `AUTH_STRICT_URL` | `true` |
| `GATEWAY_WS_URL` | `wss://bot.你的域名.com/websocket` |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Secret |

6. 点击 **构建并启动**（首次会按 `Dockerfile` 构建镜像，需几分钟）
7. 容器日志无报错后，在服务器上自测：

```bash
curl -s http://127.0.0.1:3000/api/health
# 应返回 {"status":"ok",...}
```

### 若 1Panel 没有「编排」，只有「创建容器」

- **镜像**：选「从 Dockerfile 构建」，构建上下文选项目根目录
- **端口**：宿主机 `3000` → 容器 `3000`
- **环境变量**：同上表
- **启动命令** 保持默认（`pnpm start`）

---

## 第四步：1Panel 配置网站（HTTPS + 反代）

1. **网站** → **创建网站** → 填你的域名（如 `bot.example.com`）
2. **类型**：选择 **反向代理**（不要选纯静态）
3. **代理地址**：`http://127.0.0.1:3000`
4. **开启 HTTPS**（Let's Encrypt 或已有证书）
5. **WebSocket**：在站点设置里打开「WebSocket 支持」或「代理 WebSocket」；若没有开关，在 **配置** → **自定义** 中加入：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

6. 保存并重载 OpenResty/Nginx

浏览器访问 `https://bot.你的域名.com`，应能看到登录页。

---

## 第五步：GitHub OAuth

GitHub → Settings → Developer settings → OAuth App：

- **Homepage URL**：`https://bot.你的域名.com`
- **Authorization callback URL**：`https://bot.你的域名.com/api/auth/callback/github`

与 `.env` 里 `AUTH_URL` 域名一致。

---

## 第六步：QQ 开放平台

| 用途 | 地址 |
|------|------|
| Webhook | `https://bot.你的域名.com/webhook/{appId}` |
| SDK Token | `https://bot.你的域名.com/app/getAppAccessToken/{appId}` |
| SDK Gateway | `https://bot.你的域名.com/gateway/{appId}` |

在 Dashboard 新增 Bot 后，复制页面上的 URL 即可。

---

## 常见问题（1Panel）

### 访问域名跳到登录页，但 QQ SDK 报 HTML 不是 JSON

- 检查 **middleware** 已放行 `/app/getAppAccessToken/`（本项目已配置）
- 确认 SDK 用的是 **HTTPS 域名**，不是 `localhost:3000`

### WebSocket / Live 连不上

- 1Panel 站点必须开 **WebSocket 反代**
- `GATEWAY_WS_URL` 建议显式设为 `wss://你的域名/websocket`

### 容器启动后数据库连不上

- `DATABASE_URL` 是否带 `?pgbouncer=true`（Transaction pooler）
- Supabase 是否允许当前服务器 IP（部分项目要关「仅允许 IPv6」或检查网络）
- 防火墙是否放行 **出站** 5432/6543

### 修改代码后如何更新

```bash
cd /opt/qq-bot-transfer
git pull   # 或重新上传
```

1Panel 编排界面 → **重建** / **重新构建并启动**。

`schema.prisma` 有变更时，在本地对 Supabase 再执行一次 `pnpm db:push`。

---

## 与 `docker compose` 命令的关系

在 1Panel 里用图形界面部署，**等价于**在服务器项目目录执行：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

你不需要记命令，按上面步骤在面板里点即可。更细的 Supabase 说明见 [DEPLOY-SUPABASE.md](./DEPLOY-SUPABASE.md)。
