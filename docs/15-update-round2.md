# 本轮更新记录（2026-05-25 第二批）

## 一、首页 UI 调整

| 变更项 | 说明 |
|--------|------|
| 左上角 Logo | 替换"人大"文字为 `frontend/public/ruc-images/logo.png` 校徽，并使用人大金色遮罩显示，避免红底上发灰 |
| 首页侧栏排版 | Logo、四个入口和 1937 标识统一左对齐，Logo 与导航字号放大 |
| 微人大 | 添加跳转链接 https://v.ruc.edu.cn（新标签页） |
| 图书馆 | 添加跳转链接 https://lib.ruc.edu.cn（新标签页） |
| 信息公开 | 添加跳转链接 https://xxgk.ruc.edu.cn（新标签页） |
| 校历 | 已删除 |
| EN | 已删除 |
| 探索平台 EXPLORE | 已删除（含右侧竖排标签及背景） |

## 二、系统内侧边栏折叠交互

| 特性 | 说明 |
|------|------|
| 首页 | 左侧栏完整展开，不折叠 |
| 系统内页面 | 侧边栏固定在浏览器视口左侧，页面滚动时不随内容错位 |
| 默认状态 | 首次进入默认折叠为 64px 窄栏；学生端、管理端、领导端切换时保留当前展开/折叠状态 |
| 状态保存 | 使用 `localStorage` 保存 `shell-nav-collapsed`，避免路由切换后直接恢复折叠态 |
| 折叠态 | 显示缩小后的 Logo + 竖排"导航"文字 |
| 展开触发 | 鼠标移入侧边栏区域 |
| 折叠触发 | 鼠标移出侧边栏区域 |
| 动效 | CSS transition 0.3s cubic-bezier(0.4, 0, 0.2, 1) |
| Logo | 展开态放大显示；折叠态缩小为 38px，并向左微调以适配 64px 窄栏 |
| 导航项 | 展开态下四个功能入口左对齐并放大，当前路由保留高亮 |
| 底部信息 | 展开态恢复显示 `1937 / 实事求是 · 服务学生成长`，账号与退出登录按钮在底部紧凑排列 |
| 退出登录 | 按钮高度压缩为 34px，避免占用过大底部空间 |

## 三、电子证明生成与下载

### 数据模型

- `CertificateTemplate`：证明模板（名称、类型、内容模板、变量字段列表）
- `Certificate`：已生成证明（唯一编号、模板关联、学生信息、渲染内容、状态）

### 编号规则

格式：`{TYPE前4位}-{年份}-{4位序号}`，如 `ENRO-2026-0001`

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/certificates/templates | 创建证明模板 |
| GET | /api/certificates/templates | 获取所有模板 |
| POST | /api/certificates/generate | 生成电子证明 |
| GET | /api/certificates | 获取所有已生成证明 |
| GET | /api/certificates/student/:id | 获取某学生的证明 |
| GET | /api/certificates/:id | 获取证明详情 |
| POST | /api/certificates/:id/revoke | 撤销证明 |

### 模板变量

支持占位符：`{{studentName}}`、`{{studentNo}}`、`{{grade}}`、`{{major}}`、`{{className}}`、`{{certNo}}`、`{{date}}`，以及自定义字段。

### 前端功能

- 管理端：创建模板、选择模板+学生生成证明、查看已生成列表、撤销证明
- 学生端：查看个人证明列表、下载证明（HTML 格式，含编号和样式）

## 四、管理端日志筛选、导出与对象追踪

### 新增 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/logs | 分页筛选日志（支持 action、targetType、operatorId、startDate、endDate、page、pageSize） |
| GET | /api/logs/export | 按筛选条件导出日志为 Excel |
| GET | /api/logs/track?targetType=X&targetId=Y | 按对象追踪所有操作记录 |

### 前端功能

- 筛选面板：操作类型、对象类型、时间范围
- 分页导航：上一页/下一页，显示总页数和总条数
- 导出按钮：按当前筛选条件导出 Excel（.xlsx）
- 替换原有的简单列表展示

## 五、本机启动方式

```bash
# 1. 启动 Docker 基础设施
docker compose -f infra/docker-compose.yml up -d postgres

# 2. 后端
cd backend
cp .env.example .env  # 或确保 .env 存在
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev      # 监听 :3001

# 3. 前端
cd frontend
npm install
npx vite --port 5173   # 监听 :5173，代理 /api -> :3001
```

访问 http://localhost:5173 即可使用。

## 六、全篇简要介绍

- 首页视觉：本轮将首页左侧入口改为真实人大校徽与外链入口，并删除 EN、校历和探索平台等冗余元素。
- 侧边栏交互：系统内侧栏支持悬停展开、离开折叠、视口固定、路由切换保留状态和折叠态 Logo 适配。
- 电子证明：新增证明模板、证明编号、生成、查看、撤销和学生端下载能力。
- 操作日志：管理端日志从最近列表升级为可筛选、分页、导出和按对象追踪的审计能力。
- 启动部署：文档补充本机 Docker、后端迁移种子和前端 Vite 的完整启动路径。
- 文件范围：本轮覆盖后端证书模块、日志模块、Prisma 模型、管理端、学生端、首页和系统侧栏组件。

## 七、涉及文件清单

### 新增文件
- `backend/src/modules/certificates/` — 电子证明模块（controller、service、dto、module）
- `backend/prisma/migrations/202605250002_add_certificates/migration.sql`
- `backend/src/modules/logs/dto/query-logs.dto.ts`
- `frontend/public/ruc-images/logo.png`

### 修改文件
- `backend/prisma/schema.prisma` — 新增 CertificateTemplate、Certificate 模型
- `backend/src/app.module.ts` — 注册 CertificatesModule
- `backend/src/modules/logs/logs.service.ts` — 增加筛选、导出、对象追踪
- `backend/src/modules/logs/logs.controller.ts` — 新增 GET /、GET /export、GET /track
- `frontend/src/pages/HomePage.vue` — Logo 替换、链接修正、删除 EN/校历/探索平台、首页侧栏左对齐与放大
- `frontend/src/components/AppShell.vue` — 侧边栏折叠/展开交互、视口固定、状态保留、折叠态 Logo 适配、底部信息紧凑排版
- `frontend/src/pages/AdminDashboardPage.vue` — 日志筛选/导出 UI + 证明管理 UI
- `frontend/src/pages/StudentHomePage.vue` — 学生端证明查看/下载
