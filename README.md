# 学院学生综合服务与党团管理平台

## 结构

- `docs/`: plan documents
- `frontend/`: Vue 3 frontend scaffold
- `backend/`: NestJS backend scaffold
- `infra/`: Docker Compose and env examples
- root reference files: requirements and source documents

## Dev Entry

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
