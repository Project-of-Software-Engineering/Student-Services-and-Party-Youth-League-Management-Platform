# 服务器部署指南

本文档用于把项目部署到一台云服务器或实验室服务器上，让其他人通过服务器公网 IP 或域名访问。

## 1. 部署目标

- 浏览器访问 `http://服务器IP` 即可打开前端
- 前端通过同源 `/api` 访问后端，不需要浏览器直接访问后端端口
- PostgreSQL、后端、前端 Nginx 由 Docker Compose 统一启动
- 后端启动时自动执行 Prisma 迁移，并写入演示数据

## 2. 服务器前提

服务器需要安装：

- Git
- Docker
- Docker Compose 插件

如果是 Ubuntu，可以使用：

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

确认 Docker 可用：

```bash
docker --version
docker compose version
```

## 3. 拉取项目

```bash
git clone <你的仓库地址>
cd Student-Services-and-Party-Youth-League-Management-Platform
```

如果服务器上已经有项目：

```bash
git pull
```

## 4. 创建生产环境变量

```bash
cp infra/.env.example infra/.env
```

编辑 `infra/.env`，至少修改：

```env
POSTGRES_PASSWORD=换成更安全的数据库密码
JWT_SECRET=换成一串更长的随机字符串
WEB_PORT=80
```

## 5. 构建并启动

在项目根目录执行：

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml up -d --build
```

查看运行状态：

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml ps
```

查看日志：

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml logs -f backend
```

## 6. 开放服务器端口

云服务器安全组或防火墙需要放行：

- TCP `80`

如果服务器系统启用了 UFW：

```bash
sudo ufw allow 80/tcp
```

## 7. 访问验证

在浏览器访问：

```text
http://服务器IP
```

健康检查：

```text
http://服务器IP/api/health
```

演示账号：

- 管理员：`demo.admin / demo1234`
- 学生：`demo.student / demo1234`
- 教师：`demo.teacher / demo1234`

## 8. 更新部署

代码更新后，在服务器项目目录执行：

```bash
git pull
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml up -d --build
```

## 9. 停止服务

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml down
```

如果需要连数据库数据一起清空：

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml down -v
```

## 10. 常见问题

### 页面打不开

- 确认云服务器安全组放行了 `80`
- 确认容器正在运行：`docker compose --env-file infra/.env -f infra/docker-compose.prod.yml ps`
- 确认访问的是服务器公网 IP，不是内网 IP

### 页面打开但接口失败

- 访问 `http://服务器IP/api/health`
- 查看后端日志：`docker compose --env-file infra/.env -f infra/docker-compose.prod.yml logs -f backend`
- 确认 `infra/.env` 中数据库密码没有空格或特殊格式错误

### 登录没有演示数据

后端容器启动时会执行迁移和种子脚本。如果需要重新写入演示数据：

```bash
docker compose --env-file infra/.env -f infra/docker-compose.prod.yml exec backend node prisma/seed.js
```
