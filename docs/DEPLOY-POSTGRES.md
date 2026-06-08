# PostgreSQL

项目只使用 **PostgreSQL**，通过 Prisma + `DATABASE_URL` 连接。不使用 Supabase 等托管 BaaS。

## 本地开发

```bash
docker compose up -d postgres
cp .env.example .env
pnpm install
pnpm db:push
pnpm dev
```

默认连接串（与 `docker-compose.yml` 一致）：

```env
DATABASE_URL=postgresql://qqbot:qqbot@localhost:5432/qqbot
```

## 生产（VPS / 1Panel）

### 方式 A：1Panel 创建数据库

1. **数据库** → **创建** → 选 **PostgreSQL**
2. 记下库名、用户、密码、端口（一般为 `5432`）
3. 写入服务器 `.env`：

```env
DATABASE_URL=postgresql://<用户>:<密码>@127.0.0.1:5432/<库名>
```

4. 在能连到该库的环境执行一次表结构同步：

```bash
pnpm db:push
```

### 方式 B：自行安装 Postgres

Ubuntu 示例：

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser -P qqbot
sudo -u postgres createdb -O qqbot qqbot
```

`DATABASE_URL` 指向 `127.0.0.1:5432`。

## 迁移与表结构

- 本项目使用 **`pnpm db:push`** 同步 `prisma/schema.prisma`（无 `prisma/migrations` 目录）
- 改 schema 后：在目标库可连的环境执行 `pnpm db:push`
- 生产数据请自行备份后再 push

## 注意

- 应用与库在同一台 VPS 时，主机用 **`127.0.0.1`**，不要用公网 IP 连库
- 防火墙勿对公网开放 `5432`
- `.env` 勿提交 git；`deploy/1panel.env.example` 仅作模板
