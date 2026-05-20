# 1Panel 运行环境部署（无 Docker、无 PM2）

用 1Panel 自带的 **网站 → 运行环境（Node）** 托管进程；**GitHub Actions** 只负责 `git pull` + `pnpm build`，启动/重启在面板里完成。

数据库：**Supabase**（`DATABASE_URL` + `DIRECT_URL`）。

---

## 分工

| 谁来做 | 做什么 |
|--------|--------|
| **1Panel 运行环境** | 常驻进程、开机自启、日志、启动/重启/停止 |
| **GitHub Actions** | SSH → `pnpm install` → `prisma generate` → `pnpm build` |
| **你（一次性）** | 配运行环境、`.env`、HTTPS、WebSocket |
| **Supabase** | 数据表（本地 `pnpm db:push` 一次） |

**不要**在 1Panel 运行命令里写 `pnpm build`（面板里编译易卡死、失败会反复重试）。构建交给 Actions 或 SSH 手动脚本。

---

## 一、一次性配置

### 1. 代码与 `.env`

```bash
git clone https://github.com/<你>/<仓库>.git /opt/qq-bot-transfer
cd /opt/qq-bot-transfer
cp deploy/1panel.env.example .env
# 编辑 .env：Supabase、AUTH_URL、PUBLIC_URL、GITHUB OAuth、ENCRYPTION_KEY、GATEWAY_WS_URL
```

本地对 Supabase 建表一次：`pnpm db:push`（用 `DIRECT_URL`）。

首次在服务器构建：

```bash
bash scripts/deploy-node-on-server.sh
```

### 2. 1Panel 创建 Node 运行环境

路径以官方文档为准：**网站** 相关菜单 → **运行环境** → **创建**（名称可能为「Node 运行环境」）。

| 配置项 | 填写 |
|--------|------|
| **Node 版本** | **22**（若无 22，先在面板或终端安装 Node 22，再选最接近的版本） |
| **源码 / 运行目录** | `/opt/qq-bot-transfer`（项目根，含 `server.ts`、`.env`） |
| **启动命令** | `bash scripts/1panel-start.sh` 或 `pnpm start` |
| **运行用户** | 对项目目录有读权限的用户 |

说明：

- 必须用 **`pnpm start`**（内部是 `tsx server.ts`），**不要**填 `next start`（没有 WebSocket 网关）。
- `.env` 在项目根目录，`server.ts` 已 `import "dotenv/config"`，一般无需在面板重复填变量；若面板有「环境变量」页，也可把 `.env` 里生产项抄一份。

### 3. 1Panel 创建网站并绑定运行环境

**网站** → **创建网站**：

- 填域名，开启 **HTTPS**
- 类型选 **Node 运行环境** / 绑定上一步创建的运行环境（**不要**再单独建一条「反向代理到 3000」除非文档要求二选一）
- 开启 **WebSocket**（站点设置或自定义 Nginx 里 `Upgrade` 头，见 [DEPLOY-1PANEL.md](./DEPLOY-1PANEL.md)）

确认 `.env` 中：

```env
PORT=3000
HOSTNAME=0.0.0.0
```

与运行环境监听一致。

### 4. 在面板启动

运行环境列表 → **启动** → 查看 **日志**，应看到 `Listening on http://0.0.0.0:3000`。

```bash
curl -s http://127.0.0.1:3000/api/health
```

---

## 二、GitHub 自动发布

配置 Secrets：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_PATH`（如 `/opt/qq-bot-transfer`）。

推 **`main`** → 工作流 **Deploy** 执行 `scripts/deploy-node-on-server.sh`（只构建）。

**构建完成后**到 1Panel → **运行环境 → 重启**（Actions 不会代替面板重启进程）。

---

## 三、日常操作

| 操作 | 位置 |
|------|------|
| 看日志 | 1Panel → 运行环境 → 日志 |
| 重启 | 1Panel → 运行环境 → 重启 |
| 停服 | 运行环境 → 停止 |
| 手动构建 | SSH：`bash scripts/deploy-node-on-server.sh` 后再面板重启 |

---

## 四、GitHub OAuth

回调：`https://<你的域名>/api/auth/callback/github`  
与 `.env` 的 `AUTH_URL` / `PUBLIC_URL` 一致。

---

## 五、常见问题

### 面板里 `pnpm build` 一直转圈

不要在运行环境写 build；只用 `scripts/deploy-node-on-server.sh` 或 Actions 构建。

### 没有 WebSocket

检查网站是否绑定 Node 环境、是否开启 WebSocket；`GATEWAY_WS_URL=wss://域名/websocket`。

### Actions 成功但线上仍是旧版

构建后必须在 1Panel 点 **重启** 运行环境。

### QQ SDK 拿到登录页 HTML

确认 [middleware](../src/middleware.ts) 已放行 `/app/getAppAccessToken/`，且访问的是公网域名而非内网 IP。

---

## 六、与 Docker / PM2

- **Docker**：可选，见 `deploy-docker.yml`。
- **PM2**：不需要；1Panel 运行环境已做进程托管。  
  仓库里的 `ecosystem.config.cjs` 仅作非 1Panel 机器时的可选参考，可忽略。
