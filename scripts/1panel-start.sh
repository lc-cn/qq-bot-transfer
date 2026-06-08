#!/usr/bin/env bash
# 供 1Panel「运行环境」启动命令使用：只负责启动，不在面板里 build
cd "$(dirname "$0")/.."
export NODE_ENV=production
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export CI=true
exec pnpm start
