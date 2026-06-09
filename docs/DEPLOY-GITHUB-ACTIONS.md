# GitHub Actions 自动部署（Cloudflare）

推 **`master`** 后自动：

1. `typecheck`
2. D1 远程迁移（`migrations/` 中有未应用变更时才会执行）
3. `opennextjs-cloudflare build` + `deploy` 到 `qq-bot-transfer` Worker

也可在 GitHub **Actions → Deploy → Run workflow** 手动触发。

Worker Secrets（`AUTH_SECRET`、`ENCRYPTION_KEY` 等）**只在 Cloudflare 配置一次**，CI 不会覆盖；见 [DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md) 第 3 节。

---

## 发布流程

```
push master
  → GitHub Actions（deploy.yml）
  → typecheck → D1 migrate → build:cf → wrangler deploy
  → https://bots.l2cl.link 自动更新
```

PR 仅跑 **CI**（`.github/workflows/ci.yml`：typecheck + build），不部署。

---

## 一次性配置

### 1. 创建 Cloudflare API Token

[Cloudflare Dashboard → My Profile → API Tokens → Create Token](https://dash.cloudflare.com/profile/api-tokens)

推荐 **Edit Cloudflare Workers** 模板，或自定义权限至少包含：

| 权限 | 级别 |
|------|------|
| Account → Workers Scripts | Edit |
| Account → D1 | Edit |
| Account → Account Settings | Read |

Account Resources 选 **admin@liucl.dev**（或你的账号）。

### 2. 添加 GitHub Secret

仓库 **Settings → Secrets and variables → Actions → New repository secret**：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | 上一步创建的 Token 全文 |

`account_id` 已写在 `wrangler.toml`，无需再配 `CLOUDFLARE_ACCOUNT_ID`。

### 3. 确认 Cloudflare Secrets 已就绪

若从未在生产写入过，本地执行一次（仅需一次）：

```bash
pnpm exec wrangler secret put AUTH_SECRET
pnpm exec wrangler secret put AUTH_GITHUB_ID
pnpm exec wrangler secret put AUTH_GITHUB_SECRET
pnpm exec wrangler secret put ENCRYPTION_KEY
```

---

## 验证

1. 推一个 commit 到 `master`，或手动 Run workflow
2. Actions 里 **Deploy** 全绿
3. `curl https://bots.l2cl.link/api/health` 正常

---

## 常见问题

### Actions 失败：Authentication error

- 检查 `CLOUDFLARE_API_TOKEN` 是否过期或被撤销
- Token 需包含 Workers + D1 写权限

### migrate 失败

- 确认 `wrangler.toml` 里 `database_id` 与生产 D1 一致
- 本地 `pnpm run db:migrate:remote` 复现并修复 SQL

### 部署成功但行为未变

- Worker 已更新；若改的是 Bot 客户端逻辑，需重启本地 QQ Bot SDK
- Durable Object 实例可能仍持有旧连接，WS 断线重连后会走新代码

---

## Legacy：VPS + 1Panel

旧版 SSH 部署说明见 [DEPLOY-VPS-NODE.md](./DEPLOY-VPS-NODE.md)。当前推荐 Cloudflare 单体部署。
