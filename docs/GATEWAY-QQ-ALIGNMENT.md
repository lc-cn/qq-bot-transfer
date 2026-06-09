# 与 QQ 官方 WebSocket 文档的对照

参考：[事件订阅与通知 - WebSocket 方式](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html#websocket%E6%96%B9%E5%BC%8F)、[获取带分片 WSS 接入点](https://bot.q.qq.com/wiki/develop/api-v2/openapi/wss/shard_url_get.html)

本网关是 **Webhook → WebSocket 转发**，不是直连 `api.sgroup.qq.com` 的长连接，部分能力与官方一致，部分无法等价。

## HTTP 接口

| 官方 | 本项目 | 说明 |
|------|--------|------|
| `GET /gateway` | `GET /gateway/{appId}` | 仅返回 `{ url }`（与 [qq-bot](https://github.com/lemonade-lab/qq-bot) 一致），`url` 指向本网关 `wss://…/websocket/{appId}` |
| `GET /gateway/bot` | `GET /gateway/bot/{appId}` | **代理**官方接口：`shards`、`session_start_limit` 透传 QQ 返回值，只把 `url` 换成本网关地址 |
| `POST /app/getAppAccessToken` | `POST /app/getAppAccessToken`（body 含 `appId`） | 与官方路径一致 |

## WebSocket 连接流程

| 步骤 | 官方 | 本项目 | 状态 |
|------|------|--------|------|
| Op 10 Hello | `heartbeat_interval` | 同 | ✅ |
| Op 2 Identify | `token`、`intents`、`shard`、`properties` | 校验 `token`；接受 `shard`（默认 `[0,1]`）；`intents` / `properties` 不用于过滤（事件来自 Webhook，非 QQ 推送通道） | ⚠️ 部分 |
| Op 0 READY | `version`、`session_id`、`user`、`shard` | `version`、`session_id`、`shard`、`app_id`；`user.id` 为 Bot QQ；`user.username` 为 Bot 名称 | ⚠️ 部分 |
| Op 1 心跳 | `d` 为最新序列号 `s` | 接收并记录客户端上报的 `d`；回 Op 11 | ✅ |
| Op 0 事件 | `id`、`op`、`d`、`s`、`t` | Webhook 转发时保留 `id`、`t`、`d`；无 `s` 时网关递增分配 | ✅ |
| Op 6 Resume | 断线补发遗漏事件 | **接受 Resume 并重发 READY**（不补发历史事件，Webhook 实时流无缓存） | ⚠️ 部分 |
| Op 7 Reconnect | 服务端要求重连 | 未主动下发 | — |
| 分片 `shard` | QQ 按 guild 哈希分片 | 单 Webhook 入口，**不做**官方分片负载；`shard` 仅回显客户端 Identify | ❌ 架构不同 |

## 无法补齐（勿编造）

- **READY.user**：`id` / `username` 来自本系统 Bot 的 `qq` / `name` 字段，非 QQ 开放平台实时拉取；未填 QQ 时 `id` 回退为 `appId`。
- **Resume / 事件补发**：Resume 可重连并收到新 READY，但**不会**补发断线期间遗漏的事件（仅 Webhook 实时流）。
- **intents 过滤**：官方在 Gateway 侧按位订阅；本网关接收平台 Webhook 已筛选后的 op=0 事件，无法在 WS 层再按 intents 过滤。
- **真实分片**：官方 `GET /gateway/bot` 的 `shards` 用于多连接负载；本网关多租户路径为 `/websocket/{appId}`，事件由 Webhook 广播到该 Bot 下所有 WS 客户端。

## 本次代码补齐

- Webhook / WS 转发 Payload 增加字段 `s`
- READY 增加 `version`、`shard`（及 `s: 1`）
- 心跳按官方携带 / 记录 `d`（序列号）
- 支持 Op 6 Resume（重连 READY，无事件补发）
- 新增 `GET /gateway/bot/{appId}` 代理官方
