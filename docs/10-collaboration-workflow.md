# 协作开发与服务器更新说明

本文档面向参与项目开发的同学，说明如何查看网页、如何在本地修改代码、如何提交到 GitHub，以及如何把修改同步到服务器。

## 1. 协作主目录

后续协作开发以当前项目目录为准：

```bash
/Users/a15094342992/homework_projects/Student-Services-and-Party-Youth-League-Management-Platform
```

如果本机还有其他临时克隆目录，只作为网络排查或备份参考，不作为主要开发目录。

进入项目：

```bash
cd /Users/a15094342992/homework_projects/Student-Services-and-Party-Youth-League-Management-Platform
```

查看当前 Git 状态：

```bash
git status --short --branch
git remote -v
```

## 2. 如何查看网页

### 2.1 查看线上网页

线上演示地址：

```text
http://10.10.0.14/
```

健康检查地址：

```text
http://10.10.0.14/api/health
```

浏览器打开首页后，可以使用演示账号登录：

```text
管理员：demo.admin / demo1234
教师：demo.teacher / demo1234
学生：demo.student / demo1234
```

命令行快速检查：

```bash
curl -I http://10.10.0.14/
curl http://10.10.0.14/api/health
```

### 2.2 查看本地网页

首次运行前安装依赖：

```bash
npm install
```

启动本地依赖服务：

```bash
docker compose -f infra/docker-compose.yml up -d
```

初始化数据库：

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

分别启动后端和前端：

```bash
npm run dev:backend
npm run dev:frontend
```

默认访问：

```text
前端：http://127.0.0.1:5173/
后端：http://127.0.0.1:3001/api/health
```

如果希望同一局域网的其他设备访问本机前端：

```bash
npm --workspace frontend run dev -- --host 0.0.0.0 --port 5173
```

然后让其他设备访问：

```text
http://<本机局域网IP>:5173/
```

## 3. 本地开发流程

推荐每次开发前先同步远端：

```bash
git pull --rebase origin main
```

如果多人同时开发，建议按功能建分支：

```bash
git switch -c feature/your-task-name
```

修改代码后，至少执行一次构建检查：

```bash
npm run build:frontend
npm run build:backend
```

如果修改了 Prisma schema 或迁移：

```bash
npm run prisma:generate
npm run prisma:migrate
```

提交代码：

```bash
git status --short
git add <修改的文件>
git commit -m "简短说明本次修改"
git push origin HEAD
```

如果直接在 `main` 分支协作，提交前要更谨慎：

```bash
git pull --rebase origin main
npm run build:frontend
npm run build:backend
git push origin main
```

## 4. 修改代码后如何更新服务器

服务器更新建议分两步：先把代码推到 GitHub，再到服务器拉取或上传部署包。

### 4.1 推荐方式：服务器直接拉 GitHub

适用于服务器访问 GitHub 正常的情况。

在本地确认代码已经推送：

```bash
git status --short --branch
git push origin main
```

登录应用服务器：

```bash
ssh user@10.10.0.14
```

在服务器执行：

```bash
cd /opt/student-services
git pull --rebase origin main
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build:frontend
npm run build:backend
sudo systemctl restart student-services-backend
sudo systemctl reload nginx
```

说明：

- 前端改动需要执行 `npm run build:frontend`。
- 后端改动需要执行 `npm run build:backend` 并重启后端服务。
- 数据库 schema 或 migrations 改动需要执行 `prisma:generate` 和 `prisma:migrate`。
- 不要每次更新都执行 `npm run prisma:seed`，否则可能覆盖演示数据。

### 4.2 GitHub 慢时：本地打包上传

适用于服务器或 GitHub 网络很慢时。

本地打包：

```bash
cd /Users/a15094342992/homework_projects/Student-Services-and-Party-Youth-League-Management-Platform

tar --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.tools' \
  --exclude='backend/.env' \
  -czf /tmp/student-services-deploy.tar.gz \
  -C /Users/a15094342992/homework_projects \
  Student-Services-and-Party-Youth-League-Management-Platform
```

上传到应用服务器：

```bash
scp /tmp/student-services-deploy.tar.gz user@10.10.0.14:/tmp/student-services-deploy.tar.gz
```

在应用服务器执行：

```bash
rm -rf /tmp/student-services-new
mkdir -p /tmp/student-services-new
tar -xzf /tmp/student-services-deploy.tar.gz -C /tmp/student-services-new --strip-components=1
cp /opt/student-services/backend/.env /tmp/student-services-new/backend/.env

sudo systemctl stop student-services-backend
sudo rm -rf /opt/student-services
sudo mv /tmp/student-services-new /opt/student-services
sudo chown -R user:user /opt/student-services

cd /opt/student-services
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build:frontend
npm run build:backend

sudo systemctl start student-services-backend
sudo systemctl reload nginx
```

## 5. 更新后如何验证

每次更新后先看服务状态：

```bash
ssh user@10.10.0.14
sudo systemctl status student-services-backend --no-pager -l
sudo systemctl status nginx --no-pager -l
```

查看后端日志：

```bash
sudo journalctl -u student-services-backend -n 80 --no-pager
```

本地或服务器上执行：

```bash
curl -I http://10.10.0.14/
curl http://10.10.0.14/api/health
curl -X POST http://10.10.0.14/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"demo.student","password":"demo1234"}'
```

浏览器验证：

1. 打开 `http://10.10.0.14/`
2. 使用学生账号登录
3. 检查学生端能否看到流程、通知、画像、政策检索
4. 使用管理员账号登录
5. 检查管理端是否能看到学生导入、政策维护、通知发布、操作日志

## 6. 常用服务器命令

应用服务器：

```bash
ssh user@10.10.0.14
sudo systemctl status student-services-backend --no-pager -l
sudo systemctl restart student-services-backend
sudo journalctl -u student-services-backend -f
sudo nginx -t
sudo systemctl reload nginx
```

数据库服务器：

```bash
ssh user@10.10.0.15
sudo pg_lsclusters
sudo systemctl status postgresql@16-main --no-pager -l
```

## 7. GitHub 慢的处理

如果已经开启代理，但 `git pull` 或拉图片仍然很慢，原因通常是终端没有自动使用系统代理。

先确认本机代理端口是否可用：

```bash
nc -vz 127.0.0.1 7890
```

给当前仓库配置代理：

```bash
git config --local http.proxy socks5h://127.0.0.1:7890
```

如果代理端口不是 `7890`，把命令里的端口改成实际端口。

检查配置：

```bash
git config --local --get http.proxy
```

取消当前仓库代理：

```bash
git config --local --unset http.proxy
```

只建议配置 `--local`，不要随便改全局 Git 配置，避免影响其他项目。

## 8. 静态图片资源注意事项

项目页面使用了：

```text
frontend/public/ruc-images/
```

如果线上页面背景图不显示，检查服务器是否有：

```bash
ssh user@10.10.0.14
ls -lh /opt/student-services/frontend/dist/ruc-images
```

如果缺失，重新构建前端并部署，或者单独上传该目录到：

```text
/opt/student-services/frontend/dist/ruc-images
```

验证图片资源：

```bash
curl -I http://10.10.0.14/ruc-images/zhongguancun-hero.jpg
curl -I http://10.10.0.14/ruc-images/old-campus.jpg
curl -I http://10.10.0.14/ruc-images/tongzhou.jpg
```

返回的 `Content-Type` 应为 `image/jpeg` 或图片类型，而不是 `text/html`。

## 9. 协作注意事项

- 不要把服务器密码、数据库密码、JWT 密钥写进 Git。
- 不要提交 `backend/.env`。
- 不要提交 `node_modules`、构建缓存、临时压缩包。
- 改公共文件前先同步群里说明，例如 `schema.prisma`、路由、公共组件、接口封装。
- 每次部署前先确认本地 build 通过。
- 每次部署后至少验证首页、健康检查和登录接口。

