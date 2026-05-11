# 后端实施计划

## 1. 技术栈

- NestJS
- Prisma
- PostgreSQL
- Redis
- MinIO
- Swagger / OpenAPI

## 2. 模块划分

- `auth`：登录、鉴权、令牌
- `users`：用户与角色
- `students`：学生基础信息与画像
- `policies`：政策知识库
- `processes`：党团流程
- `approvals`：审批流
- `notices`：通知发布
- `files`：附件与导入导出
- `logs`：操作日志

## 3. API 原则

- REST 风格
- 统一响应结构
- 统一错误码
- 接口可审计
- 接口文档自动生成

## 4. 关键后端能力

- RBAC 权限控制
- 审批状态流转
- 文件上传与解析
- 操作日志记录
- 统计查询接口

## 5. 核心接口分组

- `POST /auth/login`
- `GET /auth/me`
- `GET /users`
- `GET /students`
- `POST /students/import`
- `GET /policies`
- `POST /policies/upload`
- `POST /qa/ask`
- `GET /processes`
- `GET /approvals`
- `POST /approvals`
- `POST /approvals/:id/approve`
- `POST /approvals/:id/reject`
- `GET /notices`
- `POST /notices`
- `POST /files/upload`
- `GET /logs`

## 6. 鉴权与权限设计

- 登录后签发访问令牌
- 路由按角色和数据范围控制
- 学生仅访问本人数据
- 教师按班级、年级或业务范围授权
- 管理员拥有配置与审计权限

## 7. 开发约束

- 业务逻辑不写在控制器里
- 数据访问统一走 Prisma
- 所有写操作必须记录日志
- 敏感数据必须脱敏返回

## 8. 交付顺序

1. 鉴权与 RBAC
2. 核心数据表
3. P0 接口
4. P1 接口
5. 导入导出与统计
