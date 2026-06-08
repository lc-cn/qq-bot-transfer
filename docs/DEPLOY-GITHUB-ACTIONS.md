# GitHub Actions 自动发布（1Panel 运行环境）

推 **`master`** 后 SSH 到服务器，执行：

`git pull` → `pnpm install` → `prisma migrate deploy` → `prisma generate` → `pnpm build`

**不会**启动或重启进程——由 **1Panel → 网站 → 运行环境** 负责运行 `pnpm start`。

完整面板配置见 **[DEPLOY-VPS-NODE.md](./DEPLOY-VPS-NODE.md)**。  
`bots.liucl.cn` 路径示例见 **[DEPLOY-bots-liucl.md](./DEPLOY-bots-liucl.md)**。

---

## 发布流程

```
push master
  → GitHub Actions（deploy.yml）
  → SSH：scripts/deploy-node-on-server.sh（拉代码 + 构建）
  → 你：1Panel 运行环境 → 重启
```

也可在 GitHub **Actions → Deploy → Run workflow** 手动触发。

---

## Secrets（必配）

仓库 **Settings → Secrets and variables → Actions → New repository secret**：

| Secret | 说明 | 示例 |
|--------|------|------|
| `DEPLOY_HOST` | 服务器 IP 或域名 | `1.2.3.4` |
| `DEPLOY_USER` | SSH 用户 | `root` |
| `DEPLOY_SSH_KEY` | 部署私钥全文（`-----BEGIN ...`） | ed25519 私钥 |
| `DEPLOY_PATH` | 服务器项目根目录 | `/opt/1panel/www/sites/bots.liucl.cn/index` |

可选：

| Secret | 说明 | 默认 |
|--------|------|------|
| `DEPLOY_PORT` | SSH 端口 | `22` |

**注意**：不要在 workflow 的 `if` 里判断 secrets（GitHub 不支持，会导致 workflow 直接失败）。

---

## 服务器首次（SSH 一次）

```bash
cd /opt/1panel/www/sites/bots.liucl.cn/index   # 或你的 DEPLOY_PATH
git clone https://github.com/lc-cn/qq-bot-transfer.git .   # 若目录为空
cp .env.production .env   # 填 DATABASE_URL、AUTH_*、ENCRYPTION_KEY 等
bash scripts/deploy-node-on-server.sh
```

然后在 1Panel：

1. 创建 **Node 运行环境**（启动：`bash scripts/1panel-start.sh`）
2. 网站 **bots.liucl.cn** 绑定该环境 + **HTTPS** + **WebSocket**
3. 运行环境 → **启动**

配齐 GitHub Secrets 后，之后推 `master` 即可自动构建。

---

## 常见问题

### Actions 0 秒失败 / workflow file issue

旧版 `deploy.yml` 在 job 级 `if` 里用了 `secrets.*`，已移除。请 pull 最新 `master`。

### SSH 连接失败

- 服务器安全组 / 防火墙放行 `DEPLOY_PORT`
- 公钥已写入服务器 `~/.ssh/authorized_keys`（与 `DEPLOY_SSH_KEY` 成对）
- `DEPLOY_PATH` 目录存在且部署用户有读写权限

### 构建失败：Missing .env

服务器项目根必须有 `.env`（Actions 不会上传 secrets 到 `.env`，需 SSH 手动放置一次）。

### Actions 成功但线上仍是旧版

构建后必须在 1Panel 点 **重启** 运行环境（Actions 不重启进程）。

### migrate deploy 失败

检查 `.env` 里 `DATABASE_URL` 可从 VPS 连到数据库（本机 Postgres 或 Prisma Postgres）。
