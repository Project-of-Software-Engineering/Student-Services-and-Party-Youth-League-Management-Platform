# 服务器部署与更新操作指南

## 1. 服务器角色

当前部署采用应用服务器和数据库服务器分离的方式。

| 服务器 | 地址 | 角色 | 主要服务 |
| --- | --- | --- | --- |
| 应用服务器 | `10.10.0.14` | 对外提供 Web 访问和后端接口 | Nginx、Node.js、NestJS 后端 |
| 数据库服务器 | `10.10.0.15` | 存储业务数据 | PostgreSQL 16 |

登录用户为学校分配的 `user`。服务器登录口令由管理员维护，不建议写入仓库。

## 2. 当前部署目录

应用服务器上的项目目录：

```bash
/opt/student-services
```

关键文件和目录：

```text
/opt/student-services/frontend/dist       # 前端生产构建产物
/opt/student-services/backend/dist        # 后端生产构建产物
/opt/student-services/backend/.env        # 后端生产环境变量，不提交到 Git
/etc/systemd/system/student-services-backend.service
/etc/nginx/sites-available/student-services
/etc/nginx/sites-enabled/student-services
```

数据库服务器使用 PostgreSQL 16：

```text
数据库名：student_services
数据库用户：student_services
数据库地址：10.10.0.15:5432
```

数据库密码只保存在应用服务器的 `backend/.env` 中，不写入仓库。

## 3. 访问地址

浏览器访问：

```text
http://10.10.0.14/
```

后端健康检查：

```text
http://10.10.0.14/api/health
```

演示账号：

```text
管理员：demo.admin / demo1234
教师：demo.teacher / demo1234
学生：demo.student / demo1234
```

## 4. 常用服务命令

在应用服务器查看后端服务：

```bash
sudo systemctl status student-services-backend --no-pager -l
```

重启后端服务：

```bash
sudo systemctl restart student-services-backend
```

查看后端日志：

```bash
sudo journalctl -u student-services-backend -f
```

检查 Nginx 配置：

```bash
sudo nginx -t
```

重启或重载 Nginx：

```bash
sudo systemctl reload nginx
sudo systemctl restart nginx
```

在数据库服务器查看 PostgreSQL：

```bash
sudo pg_lsclusters
sudo systemctl status postgresql@16-main --no-pager -l
```

## 5. 正常更新流程

如果应用服务器可以正常访问 GitHub，可以在应用服务器执行：

```bash
cd /opt/student-services
git pull
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build:frontend
npm run build:backend
sudo systemctl restart student-services-backend
sudo systemctl reload nginx
```

说明：

- `npm install`：安装或更新前后端依赖。
- `prisma:generate`：重新生成 Prisma Client。
- `prisma:migrate`：把新增数据库迁移应用到 PostgreSQL。
- `build:frontend`：生成前端静态文件。
- `build:backend`：生成后端 `dist`。
- 重启后端后，新代码才会生效。
- 前端由 Nginx 直接读取 `frontend/dist`，通常重载 Nginx 即可。

## 6. GitHub 慢时的更新流程

如果应用服务器 `git pull` 很慢或失败，可以在本地电脑完成拉取、构建前准备和打包上传。

本地电脑执行：

```bash
cd Student-Services-and-Party-Youth-League-Management-Platform
git pull
tar --exclude='.git' --exclude='node_modules' --exclude='.tools' --exclude='backend/.env' -czf /tmp/student-services-deploy.tar.gz -C .. Student-Services-and-Party-Youth-League-Management-Platform
scp /tmp/student-services-deploy.tar.gz user@10.10.0.14:/tmp/student-services-deploy.tar.gz
```

应用服务器执行：

```bash
rm -rf /tmp/student-services-new
mkdir -p /tmp/student-services-new
tar -xzf /tmp/student-services-deploy.tar.gz -C /tmp/student-services-new --strip-components=1
cp /opt/student-services/backend/.env /tmp/student-services-new/backend/.env
rm -rf /opt/student-services
mv /tmp/student-services-new /opt/student-services
cd /opt/student-services
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build:frontend
npm run build:backend
sudo systemctl restart student-services-backend
sudo systemctl reload nginx
```

如果是首次部署，还需要执行：

```bash
npm run prisma:seed
```

已有演示数据时，不建议每次更新都执行 `prisma:seed`。

## 7. 数据库变更注意事项

如果同学修改了 `backend/prisma/schema.prisma` 或新增了 `backend/prisma/migrations`，服务器更新时必须执行：

```bash
npm run prisma:generate
npm run prisma:migrate
```

如果只是前端页面或 CSS 修改，一般不需要迁移数据库。

如果只是后端业务代码修改，需要重新构建后端并重启：

```bash
npm run build:backend
sudo systemctl restart student-services-backend
```

## 8. 验证清单

每次部署或更新后至少检查：

```bash
curl http://10.10.0.14/api/health
curl -I http://10.10.0.14/
```

然后在浏览器访问：

```text
http://10.10.0.14/
```

使用 `demo.student / demo1234` 登录，确认登录后页面能正常加载学生端数据。

## 9. 回滚建议

更新前可以保留一份当前版本：

```bash
sudo cp -a /opt/student-services /opt/student-services.backup.$(date +%Y%m%d%H%M)
```

如果更新失败，可以恢复备份：

```bash
sudo systemctl stop student-services-backend
sudo rm -rf /opt/student-services
sudo cp -a /opt/student-services.backup.YYYYMMDDHHMM /opt/student-services
sudo systemctl start student-services-backend
sudo systemctl reload nginx
```

恢复后重新访问健康检查和首页。
