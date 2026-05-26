# 本机测试网页启动指南

本文档用于在 Windows PowerShell 中启动本机测试环境、打开网页，并在需要时让同一局域网的手机或其他电脑访问。

## 1. 前置条件

- 已安装 Node.js 和 npm
- 已安装并启动 Docker Desktop
- 当前终端位于项目根目录

项目根目录示例：

```powershell
cd "~\Desktop\Student-Services-and-Party-Youth-League-Management-Platform"
```

## 2. 初始化环境

首次运行、依赖变化、数据库结构变化，或需要重置演示数据时执行这一整块。依赖已安装且数据库已初始化时，也可以只执行 `docker compose -f infra\docker-compose.yml up -d`。

```powershell
npm.cmd install
docker compose -f infra\docker-compose.yml up -d
docker compose -f infra\docker-compose.yml ps
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

## 3. 启动后端服务

新开一个 PowerShell 终端，进入项目根目录后执行这一块。该命令会持续运行，不要关闭此终端。

```powershell
cd "~\Desktop\Student-Services-and-Party-Youth-League-Management-Platform"
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

## 4. 启动前端测试网页

再新开一个 PowerShell 终端，进入项目根目录后执行这一块。该命令会持续运行，不要关闭此终端。

```powershell
cd "~\Desktop\Student-Services-and-Party-Youth-League-Management-Platform"
npm.cmd run dev:frontend
```

本机测试网页地址：

```text
http://127.0.0.1:5173/
http://localhost:5173/
```

## 5. 让同一局域网的手机或其他电脑访问

如果需要让另一台设备访问本机前端，不使用上一节的普通前端启动命令，改用下面这一整块。防火墙放行命令需要管理员 PowerShell；如果已经放行过，可以跳过 `netsh` 那一行。

```powershell
cd "~\Desktop\Student-Services-and-Party-Youth-League-Management-Platform"
netsh advfirewall firewall add rule name="Vite 5173" dir=in action=allow protocol=TCP localport=5173
ipconfig
npm.cmd --workspace frontend run dev -- --host 0.0.0.0 --port 5173
```

在 `ipconfig` 输出中找到本机局域网 IPv4 地址。假设本机 IPv4 地址是 `192.168.1.23`，另一台设备访问：

```text
http://192.168.1.23:5173/
```

注意：

- 手机和电脑必须连接同一个局域网
- 另一台设备要访问电脑的局域网 IPv4 地址，不是 `localhost`
- 后端仍然由前端开发代理通过 `/api` 调用
- 如果提示防火墙命令权限不足，请用管理员 PowerShell 单独执行 `netsh` 命令

## 6. 演示账号

```text
管理员：demo.admin / demo1234
教师：demo.teacher / demo1234
学生：demo.student / demo1234
```

## 7. 停止本机服务

测试结束后，在前端和后端终端分别按 `Ctrl + C` 停止开发服务，再执行下面这一块停止 Docker 依赖服务。

```powershell
cd "~\Desktop\Student-Services-and-Party-Youth-League-Management-Platform"
docker compose -f infra\docker-compose.yml down
```

## 8. 常见问题

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
