# 人大金仓数据库连接说明

当前后端使用 Prisma，`backend/prisma/schema.prisma` 中的数据库类型是：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

因此连接人大金仓时，推荐使用 KingbaseES 的 PostgreSQL 兼容模式，并通过 PostgreSQL 风格连接串访问。

## 1. 前提

- KingbaseES 已创建数据库，例如 `student_services`
- KingbaseES 已创建用户，并授予该库的建表、读写权限
- KingbaseES 服务端允许服务器访问对应端口
- KingbaseES 运行在 PostgreSQL 兼容模式

常见端口可能是 `54321`，但以实际安装配置为准。

## 2. 连接串格式

在 `infra/.env` 中配置：

```env
DATABASE_URL=postgresql://用户名:密码@金仓服务器IP:端口/数据库名?schema=public
JWT_SECRET=换成一串更长的随机字符串
WEB_PORT=80
```

示例：

```env
DATABASE_URL=postgresql://system:your_password@192.168.1.100:54321/student_services?schema=public
JWT_SECRET=change_this_to_a_long_random_string
WEB_PORT=80
```

如果密码中有 `@`、`#`、`:`、`/`、空格等特殊字符，需要做 URL 编码。

## 3. 使用外部金仓数据库启动

使用专门的金仓部署 Compose 文件：

```bash
docker compose --env-file infra/.env -f infra/docker-compose.kingbase.yml up -d --build
```

这个方式只启动：

- backend
- frontend

不会再启动本地 PostgreSQL 容器。

## 4. 验证连接

查看后端日志：

```bash
docker compose --env-file infra/.env -f infra/docker-compose.kingbase.yml logs -f backend
```

访问健康检查：

```text
http://服务器IP/api/health
```

如果后端日志中出现 Prisma migration 成功、Nest application successfully started，说明连接和启动正常。

## 5. 初始化数据

后端容器启动时会执行：

```bash
npx prisma migrate deploy
node prisma/seed.js
```

也就是会自动建表并写入演示账号。

演示账号：

- 管理员：`demo.admin / demo1234`
- 学生：`demo.student / demo1234`
- 教师：`demo.teacher / demo1234`

## 6. 如果迁移失败

Prisma 官方没有单独的 KingbaseES connector，当前方案依赖 KingbaseES 的 PostgreSQL 兼容能力。

如果 `prisma migrate deploy` 报 SQL 兼容错误，可以改用以下保守流程：

1. 在 KingbaseES 客户端中手动执行 `backend/prisma/migrations/202605110001_init/migration.sql`
2. 修改 `backend/Dockerfile` 的启动命令，临时移除 `npx prisma migrate deploy &&`
3. 重新构建并启动后端
4. 保留 `node prisma/seed.js` 写入演示数据

如果只是课程演示，优先建议使用 PostgreSQL 兼容模式测试通过后再提交部署截图。
