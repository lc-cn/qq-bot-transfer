# GitHub Actions 自动发布（1Panel 运行环境）

推 **`main`** 后 SSH 到服务器，执行：

`git pull` → `pnpm install` → `prisma generate` → `pnpm build`

**不会**启动或重启进程——由 **1Panel → 网站 → 运行环境** 负责运行 `pnpm start`。

完整面板配置见 **[DEPLOY-VPS-NODE.md](./DEPLOY-VPS-NODE.md)**。

---

## 发布流程

```
push main
  → GitHub Actions（deploy.yml）
  → SSH：scripts/deploy-node-on-server.sh（仅构建）
  → 你：1Panel 运行环境 → 重启
```

---

## Secrets

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | 服务器 IP |
| `DEPLOY_USER` | SSH 用户 |
| `DEPLOY_SSH_KEY` | SSH 私钥 |
| `DEPLOY_PATH` | 项目路径，如 `/opt/qq-bot-transfer` |

---

## 服务器首次

1. 克隆仓库，配置 `.env`  
2. `bash scripts/deploy-node-on-server.sh`  
3. 1Panel 创建 **Node 运行环境**（启动：`bash scripts/1panel-start.sh`）  
4. 网站绑定该运行环境 + HTTPS + WebSocket  
5. 配置 GitHub Secrets，之后推 `main` 即可  

可选 Docker：手动运行 **Deploy (Docker)** workflow。
