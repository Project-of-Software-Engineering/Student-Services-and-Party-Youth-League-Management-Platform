# 本机测试网页启动指南

本文档用于在本机启动项目，打开测试网页，并完成基础访问验证。以下命令以 Windows PowerShell 为准。

## 1. 前置条件

- 已安装 Node.js 和 npm
- 已安装并启动 Docker Desktop
- 当前终端位于项目根目录

项目根目录示例：

```powershell
cd "~\Desktop\Student-Services-and-Party-Youth-League-Management-Platform"
```

## 2. 安装依赖

首次运行或 `package-lock.json` 变化后执行：

```powershell
npm.cmd install
```

如果依赖已经安装，可以跳过本步骤。

## 3. 启动本机依赖服务

启动 PostgreSQL、Redis、MinIO 等本地依赖：

```powershell
docker compose -f infra\docker-compose.yml up -d
```

查看容器状态：

```powershell
docker compose -f infra\docker-compose.yml ps
```

## 4. 初始化数据库

生成 Prisma Client：

```powershell
npm.cmd run prisma:generate
```

执行数据库迁移：

```powershell
npm.cmd run prisma:migrate
```

写入演示数据：

```powershell
npm.cmd run prisma:seed
```

## 5. 启动后端服务

新开一个 PowerShell 终端，在项目根目录执行：

```powershell
npm.cmd run dev:backend
```

后端默认地址：

```text
http://127.0.0.1:3001
```

健康检查地址：

```text
http://127.0.0.1:3001/api/health
```

浏览器打开健康检查地址，能看到返回结果即表示后端启动正常。

## 6. 启动前端测试网页

再新开一个 PowerShell 终端，在项目根目录执行：

```powershell
npm.cmd run dev:frontend
```

本机测试网页地址：

```text
http://127.0.0.1:5173/
```

也可以使用：

```text
http://localhost:5173/
```

## 7. 让同一局域网的手机或其他电脑访问

如果需要让另一台设备访问本机前端，不使用普通的 `dev:frontend`，改用下面命令启动前端：

```powershell
npm.cmd --workspace frontend run dev -- --host 0.0.0.0 --port 5173
```

查询本机局域网 IPv4 地址：

```powershell
ipconfig
```

假设本机 IPv4 地址是 `192.168.1.23`，另一台设备访问：

```text
http://192.168.1.23:5173/
```

注意：

- 手机和电脑必须连接同一个局域网
- Windows 防火墙需要允许 `5173` 端口入站访问
- 后端仍然由前端开发代理通过 `/api` 调用

如需手动放行端口，可以使用管理员 PowerShell 执行：

```powershell
netsh advfirewall firewall add rule name="Vite 5173" dir=in action=allow protocol=TCP localport=5173
```

## 8. 演示账号

```text
管理员：demo.admin / demo1234
教师：demo.teacher / demo1234
学生：demo.student / demo1234
```

## 9. 停止本机依赖服务

测试结束后，可以停止 Docker 依赖服务：

```powershell
docker compose -f infra\docker-compose.yml down
```

如果只想停止前端或后端开发服务，在对应终端按 `Ctrl + C`。

## 10. 常见问题

如果前端打不开：

- 确认前端终端没有报错
- 确认访问的是 `http://127.0.0.1:5173/`
- 如果端口被占用，关闭占用进程后重新启动

如果后端健康检查失败：

- 确认 Docker Desktop 已启动
- 确认 `docker compose -f infra\docker-compose.yml ps` 中数据库容器正常运行
- 确认已经执行 `npm.cmd run prisma:migrate` 和 `npm.cmd run prisma:seed`

如果手机无法访问：

- 确认前端使用了 `--host 0.0.0.0`
- 确认手机和电脑在同一局域网
- 确认访问的是电脑局域网 IPv4 地址，不是 `localhost`
- 确认 Windows 防火墙已放行 `5173` 端口
