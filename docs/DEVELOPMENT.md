# 开发者指南

本指南面向需要在本地开发、调试或贡献代码的开发者。

## 环境要求

- **Node.js** >= 22
- **pnpm** >= 10
- **Wrangler CLI**（随 `pnpm install` 安装）

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/lc-cn/qq-bot-transfer.git
cd qq-bot-transfer

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入真实值（见下方「环境变量」）

# 4. 初始化本地 D1 数据库
pnpm run db:migrate:local

# 5. 启动开发服务器
pnpm dev
# 访问 http://localhost:8787
```

## 项目结构

```
├── worker/                    # Cloudflare Worker 入口层
│   ├── index.ts               # Worker fetch 入口，路由 gateway 请求 vs Next.js
│   ├── bot-gateway-do.ts      # Durable Object 核心类（Webhook、WebSocket、Token 代理）
│   ├── auth-proxy.ts          # /app/getAppAccessToken 代理逻辑
│   ├── ws-handler.ts          # WebSocket 消息构造与解析
│   ├── routes.ts              # Gateway 路由解析器
│   ├── event-persist.ts       # Queue Consumer：事件持久化到 D1
│   └── env.ts                 # Env 类型定义
│
├── src/
│   ├── app/                   # Next.js App Router（管理面 UI + API）
│   │   ├── (dashboard)/       # Dashboard 页面路由组
│   │   ├── api/               # API 路由（Bot CRUD、事件查询、健康检查）
│   │   └── login/             # GitHub OAuth 登录页
│   │
│   ├── components/            # React 组件
│   │   └── ui/                # 基础 UI 组件（Button、Input、Label）
│   │
│   ├── hooks/                 # 自定义 React Hooks
│   │
│   ├── lib/
│   │   ├── auth/              # 认证工具（Session、CSRF、代理 URL 解析）
│   │   ├── crypto/            # 加密工具（Ed25519、AES-256-GCM）
│   │   ├── db/                # Drizzle ORM D1 连接
│   │   ├── gateway/           # 网关协议实现
│   │   │   ├── core/          # 核心：序列号、签名验证、Webhook 处理
│   │   │   └── token/         # Token 管理：获取、刷新、DO 注册
│   │   ├── http-origin.ts     # 反向代理 Origin 解析
│   │   ├── utils.ts           # 通用工具函数
│   │   └── validators/        # Zod 校验 Schema
│   │
│   ├── middleware.ts           # Next.js 中间件（路由保护）
│   └── types/                 # 共享类型定义
│
├── drizzle/
│   └── schema.ts              # 数据库 Schema（User、Bot、WebhookEvent）
│
├── migrations/                # D1 SQL 迁移文件
├── docs/                      # 部署和协议文档
└── vitest.config.ts           # 测试配置
```

## 架构概述

系统分为两个独立的运行时层，通过 Cloudflare Service Binding 通信：

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                      │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │   Next.js (OpenNext) │  │   Gateway (Data Plane)   │ │
│  │   ─ 管理面           │  │   ─ Webhook 接收         │ │
│  │   ─ Dashboard UI     │  │   ─ WebSocket 转发       │ │
│  │   ─ Bot CRUD API     │  │   ─ Token 代理           │ │
│  │   ─ GitHub OAuth     │  │   ─ 签名验证             │ │
│  └──────────┬───────────┘  └────────────┬─────────────┘ │
│             │  Service Binding           │               │
│             └────────────┬───────────────┘               │
│                          │                               │
│              ┌───────────┴───────────┐                  │
│              │    Cloudflare D1      │                  │
│              │   (SQLite 数据库)      │                  │
│              └───────────────────────┘                  │
│                                                          │
│              ┌───────────────────────┐                  │
│              │   Cloudflare Queues   │                  │
│              │  (异步事件持久化)       │                  │
│              └───────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

**请求流向：**
- Dashboard 请求 → Worker → OpenNext (Next.js) → D1
- Webhook 请求 → Worker → BotGatewayDO (Durable Object) → 验证签名 → 广播到 WS 客户端 + 入队
- WebSocket 连接 → Worker → BotGatewayDO → Hello → Identify → READY → 事件转发

## 关键模块

### Durable Object (`worker/bot-gateway-do.ts`)

每个 Bot 的 `appId` 对应一个 Durable Object 实例，维护：
- Ed25519 签名材料（从加密 secret 派生）
- 有效 Access Token 集合
- WebSocket 客户端连接
- 事件序列号

辅助模块：
- `ws-handler.ts` — WS 消息构造（Hello、READY、InvalidSession）
- `auth-proxy.ts` — QQ 平台 Token 获取代理

### 加密 (`src/lib/crypto/`)

- **ed25519.ts** — 从 Bot Secret 派生 Ed25519 密钥对，用于 Webhook 签名验证和 Challenge 响应
- **secrets.ts** — AES-256-GCM 加密/解密 Bot Secret，密钥来自 `ENCRYPTION_KEY` 环境变量

### 网关协议 (`src/lib/gateway/`)

- **core/webhook-process.ts** — Webhook 处理核心：签名验证、Challenge 响应（op=13）、Dispatch 转发（op=0）
- **core/gateway-seq.ts** — 单调递增序列号管理
- **token/** — QQ 平台 Token 获取、自动刷新、DO 注册
- **gateway-url.ts** — WebSocket URL 解析（支持多环境回退链）
- **ws-protocol.ts** — QQ 网关 OpCode 常量和类型定义

### 数据库 (`drizzle/schema.ts`)

三张表：
- `User` — GitHub OAuth 用户
- `Bot` — Bot 配置（appId、加密 secret、关联用户）
- `WebhookEvent` — 持久化的 Webhook 事件（由 Queue Consumer 写入）

## 本地开发

### 启动开发服务器

```bash
pnpm dev          # wrangler dev（Worker + Next.js + D1 + Queues 完整环境）
pnpm dev:next     # 仅 Next.js（无 Worker/D1，不推荐）
```

`wrangler dev` 启动完整本地环境，包括：
- 本地 D1 数据库（自动应用迁移）
- 本地 Durable Object 实例
- 本地 Queue Consumer

### 数据库迁移

```bash
pnpm run db:generate       # 生成迁移 SQL（修改 schema 后）
pnpm run db:migrate:local  # 应用到本地 D1
pnpm run db:migrate:remote # 应用到远程 D1（生产环境）
```

### 环境变量

本地开发需要在 `.dev.vars` 中配置（参考 `.dev.vars.example`）：

| 变量 | 说明 | 示例 |
|------|------|------|
| `AUTH_SECRET` | NextAuth Session 密钥 | `openssl rand -base64 32` 生成 |
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID | 从 GitHub 获取 |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret | 从 GitHub 获取 |
| `ENCRYPTION_KEY` | AES-256-GCM 加密密钥（64 hex chars） | `openssl rand -hex 32` 生成 |

## 运行测试

```bash
pnpm run test          # 运行所有测试
pnpm run test:watch    # 监听模式（开发时使用）
pnpm run test:coverage # 生成覆盖率报告
```

测试覆盖核心纯逻辑模块：加密、签名验证、Webhook 处理、路由解析、WS 消息构造等。

## 代码规范

- **TypeScript** 严格模式，两个 tsconfig（App: ES2017 / Worker: ES2022）
- **类型检查**：`pnpm run typecheck`（检查 App 和 Worker 两个编译目标）
- **Lint**：`pnpm run lint`（ESLint 9 + next/core-web-vitals）

## 提交规范

采用语义化 commit message：

```
<type>: <description>

feat:     新功能
fix:      Bug 修复
refactor: 重构（不改变行为）
docs:     文档变更
test:     测试相关
chore:    构建/工具链变更
```

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动完整本地开发环境 |
| `pnpm run test` | 运行测试 |
| `pnpm run test:watch` | 测试监听模式 |
| `pnpm run test:coverage` | 测试覆盖率报告 |
| `pnpm run typecheck` | TypeScript 类型检查 |
| `pnpm run lint` | ESLint 代码检查 |
| `pnpm run build:cf` | Cloudflare 构建 |
| `pnpm run deploy` | 构建 + 迁移 + 部署 |
| `pnpm run db:generate` | 生成数据库迁移 |
| `pnpm run db:migrate:local` | 应用迁移到本地 D1 |
| `pnpm run db:migrate:remote` | 应用迁移到远程 D1 |
