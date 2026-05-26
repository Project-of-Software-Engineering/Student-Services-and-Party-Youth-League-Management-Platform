# 学院学生综合服务与党团管理平台

## 结构

- `docs/`: plan documents
- `frontend/`: Vue 3 frontend scaffold
- `backend/`: NestJS backend scaffold
- `infra/`: Docker Compose and env examples
- root reference files: requirements and source documents

## 本机测试启动

完整步骤见 [本机测试网页启动指南](./docs/13-local-test-guide.md)。交付验收时同步参考 [权限矩阵](./docs/16-permission-matrix.md)、[用户操作手册](./docs/17-user-operation-manual.md) 和 [交付验收检查清单](./docs/18-acceptance-checklist.md)。

首次运行或依赖变化后安装依赖：

```powershell
npm.cmd install
```

启动本机依赖服务：

```powershell
docker compose -f infra\docker-compose.yml up -d
```

初始化数据库：

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

分别启动后端和前端：

```powershell
npm.cmd run dev:backend
npm.cmd run dev:frontend
```

本机测试网页：

```text
http://127.0.0.1:5173/
```

后端健康检查：

```text
http://127.0.0.1:3001/api/health
```

如果要让手机或另一台电脑访问本机网页，前端使用：

```powershell
npm.cmd --workspace frontend run dev -- --host 0.0.0.0 --port 5173
```

然后在另一台设备访问：

```text
http://<本机局域网IP>:5173/
```

## 开发命令速查

- Frontend: `npm run dev:frontend`
- Backend: `npm run dev:backend`
- Prisma generate: `npm run prisma:generate`
- Prisma migrate: `npm run prisma:migrate`
- Prisma seed: `npm run prisma:seed`

## Server Deployment

For a deployable server version, use the production Docker Compose file:

```bash
cp infra/.env.example infra/.env
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml up -d --build
```

Then visit:

- Frontend: `http://<server-ip>`
- Health check: `http://<server-ip>/api/health`

Detailed steps are in `docs/08-server-deployment.md`.

If the server must use KingbaseES, configure `DATABASE_URL` and start with:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.kingbase.yml up -d --build
```

KingbaseES notes are in `docs/09-kingbase-connection.md`.

## Note

The repository now uses the new frontend and backend scaffold as the main implementation path.
