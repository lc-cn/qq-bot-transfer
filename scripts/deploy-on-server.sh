#!/usr/bin/env bash
# 在 1Panel 服务器上执行：拉取 GHCR 镜像并重启容器
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/qq-bot-transfer}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ghcr.yml}"

if [[ -z "${APP_IMAGE:-}" ]]; then
  echo "APP_IMAGE is required (e.g. ghcr.io/owner/qq-bot-transfer:main)" >&2
  exit 1
fi

cd "$DEPLOY_PATH"

if [[ ! -f .env ]]; then
  echo "Missing .env in $DEPLOY_PATH — create from deploy/1panel.env.example" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing $COMPOSE_FILE in $DEPLOY_PATH" >&2
  exit 1
fi

export APP_IMAGE

docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d
docker image prune -f

echo "Deployed $APP_IMAGE"
