# 部署到 liucl 服务器（1Panel + bots.liucl.cn）

| 地址 | 用途 |
|------|------|
| https://1pl.liucl.cn/ | **1Panel 管理后台**（配运行环境、看日志） |
| https://bots.liucl.cn | **QQ 网关对外域名**（QQ SDK / Webhook / 登录） |

`.env.production` 已按 `bots.liucl.cn` 配置；部署时复制为服务器上的 `.env`。

---

## 一、服务器准备（SSH 或 1Panel 终端）

```bash
# 示例路径
cd /opt/1panel/www/sites/bots.liucl.cn/index
git pull origin master

# 用生产配置（勿提交到 git）
cp .env.production .env

# 首次：迁移 + 构建
pnpm install
bash scripts/deploy-node-on-server.sh
```

确认本机 Postgres 已运行且账号密码与 `.env.production` 里 `DATABASE_URL` 一致。

---

## 二、1Panel（浏览器打开 https://1pl.liucl.cn/）

### 1. Node 运行环境

| 项 | 值 |
|----|-----|
| 运行目录 | `/opt/1panel/www/sites/bots.liucl.cn/index` |
| Node | 22 |
| 启动命令 | `bash scripts/1panel-start.sh` |

环境变量：一般读项目根目录 `.env`（`server.ts` 已 `dotenv/config`），无需在面板重复填一遍。

### 2. 网站

- 域名：**bots.liucl.cn**（不是 1pl.liucl.cn）
- 绑定上一步 **Node 运行环境**
- **HTTPS** 证书
- **WebSocket** 开启

### 3. 启动 / 发布

- 首次：运行环境 → **启动**
- 以后：GitHub Actions 构建后 → 运行环境 → **重启**

---

## 三、GitHub OAuth

OAuth App 回调必须是业务域名：

```
https://bots.liucl.cn/api/auth/callback/github
```

与 `.env.production` 中 `AUTH_URL` 一致。

---

## 四、验证

```bash
curl -s https://bots.liucl.cn/api/health
curl -sI https://bots.liucl.cn/login
```

QQ 配置 Webhook：`https://bots.liucl.cn/webhook/{appId}`

---

## 五、GitHub Actions（可选）

仓库 Settings → Secrets：

| Secret | 值 |
|--------|-----|
| `DEPLOY_HOST` | 服务器 IP |
| `DEPLOY_USER` | SSH 用户 |
| `DEPLOY_SSH_KEY` | 部署私钥 |
| `DEPLOY_PATH` | `/opt/1panel/www/sites/bots.liucl.cn/index` |

推 `master` 后 Actions 自动 SSH 构建；再到 1Panel **重启** 运行环境。详见 [DEPLOY-GITHUB-ACTIONS.md](./DEPLOY-GITHUB-ACTIONS.md)。

---

## 安全提醒

`.env.production` 含密钥，勿提交 git。若曾在聊天/截图中泄露 `AUTH_GITHUB_SECRET`，请在 GitHub 轮换 Client Secret。
