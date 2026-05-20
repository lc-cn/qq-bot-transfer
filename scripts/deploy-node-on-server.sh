#!/usr/bin/env bash
# VPS：仅安装依赖 + 构建；进程由 1Panel「网站 → 运行环境」托管（不用 PM2 / Docker）
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/qq-bot-transfer}"
cd "$DEPLOY_PATH"

if [[ ! -f .env ]]; then
  echo "Missing .env in $DEPLOY_PATH — copy from deploy/1panel.env.example" >&2
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  corepack enable 2>/dev/null || true
  corepack prepare pnpm@latest --activate
fi

echo "==> pnpm install"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "==> prisma generate"
pnpm exec prisma generate

echo "==> next build"
pnpm build

echo "==> Build done."
echo "    请在 1Panel：网站 → 对应站点 → 运行环境 → 点击「重启」使新代码生效。"
